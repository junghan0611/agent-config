#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

PROMPT_BASENAMES = {
    "AGENTS.md",
    "NEXT.md",
    "README.md",
    "ROADMAP.md",
    "IDENTITY.md",
    "SOUL.md",
    "USER.md",
    "TOOLS.md",
    "HEARTBEAT.md",
    "FOLLOWUP.md",
    "MEMORY.md",
    "SKILL.md",
}

IGNORE_PARTS = {"node_modules", "npm", ".git", ".pnpm"}

PATTERNS = [
    ("lex-self", re.compile("\uc790\uae30")),
    ("lex-slot", re.compile("\uc790\ub9ac")),
    ("lex-hit", re.compile("\ubc15[\uac00-\ud7a3]*")),
]

SAFE_REPLACEMENTS = [
    ("\uc790\uae30 webhook \uba54\uc2dc\uc9c0", "자체 webhook 메시지"),
    ("\uc790\uae30 \uba54\uc2dc\uc9c0", "자체 메시지"),
    ("\uc790\uae30 jsonl", "해당 jsonl"),
    ("\uc790\uae30 \ud589\ub3d9", "자체 행동"),
    ("\uc790\uae30 \uc0ac\uc774\ud074", "해당 사이클"),
    ("\uc790\uae30 \ub3c4\uad6c \ubaa9\ub85d", "보유 도구 목록"),
    ("\uc790\uae30 \ucf54\uba58\ud2b8", "자체 코멘트"),
    ("\uc790\uae30 \ud638\uc2a4\ud2b8", "해당 호스트"),
    ("\ucf54\uba58\ud2b8 \ubc15\uc74c", "코멘트 남김"),
    ("\ucf54\uba58\ud2b8 \ubc15\uace0", "코멘트 남기고"),
    ("\ucf54\uba58\ud2b8 \ubc15\ub294\ub2e4", "코멘트 남긴다"),
    ("\ub77c\ubca8 \ubc15\uc74c", "라벨 추가"),
    ("\ub77c\ubca8 \ubc15\uace0", "라벨 추가하고"),
    ("\ub77c\ubca8 \ubc15\ub294\ub2e4", "라벨 추가한다"),
    ("\uba54\uc2dc\uc9c0 \ubc15\uc74c", "메시지 전송"),
    ("\uba54\uc2dc\uc9c0 \ubc15\uace0", "메시지 보내고"),
    ("\ubc15\ud600\uc788\uc74c", "들어있음"),
    ("\ubc15\ud614\ub294\uc9c0", "들어갔는지"),
    ("\ubc15\ud798", "적용됨"),
]


def fail(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def git_root(root: Path) -> Path:
    proc = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--show-toplevel"],
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        fail(f"not a git repo: {root}")
    return Path(proc.stdout.strip())


def tracked_files(root: Path) -> list[Path]:
    proc = subprocess.run(
        ["git", "-C", str(root), "ls-files", "*.md", "*.org", "*.txt"],
        text=True,
        capture_output=True,
        check=True,
    )
    return [root / rel for rel in proc.stdout.splitlines() if rel.strip()]


def is_candidate(path: Path, repo_root: Path, all_tracked: bool) -> bool:
    rel = path.relative_to(repo_root)
    if any(part in IGNORE_PARTS for part in rel.parts):
        return False
    if all_tracked:
        return True
    if path.name in PROMPT_BASENAMES:
        return True
    if path.name == "SKILL.md":
        return True
    if rel.parts and rel.parts[0] == "commands" and path.suffix == ".md":
        return True
    return False


def iter_candidates(root: Path, all_tracked: bool) -> list[Path]:
    repo_root = git_root(root)
    return [
        path
        for path in tracked_files(repo_root)
        if is_candidate(path, repo_root, all_tracked)
    ]


def scan_path(path: Path) -> list[tuple[int, list[str], str]]:
    hits: list[tuple[int, list[str], str]] = []
    text = path.read_text(encoding="utf-8")
    for lineno, line in enumerate(text.splitlines(), start=1):
        cats = [name for name, pat in PATTERNS if pat.search(line)]
        if cats:
            hits.append((lineno, cats, line.rstrip()))
    return hits


def cmd_scan(paths: list[Path], repo_root: Path, show_line: bool) -> int:
    total_hits = 0
    files_with_hits = 0
    cats = Counter()
    for path in paths:
        hits = scan_path(path)
        if not hits:
            continue
        files_with_hits += 1
        rel = path.relative_to(repo_root)
        for lineno, hit_cats, line in hits:
            total_hits += 1
            cats.update(hit_cats)
            tag = ",".join(hit_cats)
            if show_line:
                print(f"{rel}:{lineno}: [{tag}] {line}")
            else:
                print(f"{rel}:{lineno}: [{tag}]")
    print(
        f"scan-summary files={files_with_hits} hits={total_hits} "
        f"categories={dict(sorted(cats.items()))}",
        file=sys.stderr,
    )
    return 0 if total_hits == 0 else 1


def apply_safe(text: str) -> tuple[str, int]:
    changed = 0
    for old, new in SAFE_REPLACEMENTS:
        count = text.count(old)
        if count:
            text = text.replace(old, new)
            changed += count
    return text, changed


def cmd_apply(paths: list[Path], repo_root: Path) -> int:
    changed_files = 0
    changed_items = 0
    for path in paths:
        text = path.read_text(encoding="utf-8")
        new_text, applied = apply_safe(text)
        if not applied:
            continue
        path.write_text(new_text, encoding="utf-8")
        changed_files += 1
        changed_items += applied
        rel = path.relative_to(repo_root)
        print(f"applied {rel}: replacements={applied}")
    print(
        f"apply-summary files={changed_files} replacements={changed_items}",
        file=sys.stderr,
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Prompt-surface detox for unstable sessions")
    parser.add_argument("command", choices=["scan", "apply", "verify"])
    parser.add_argument("--root", default=".", help="repo path (default: cwd)")
    parser.add_argument("--all-tracked", action="store_true", help="scan all tracked text docs")
    parser.add_argument("--show-line", action="store_true", help="print line text during scan/verify")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    repo_root = git_root(root)
    paths = iter_candidates(repo_root, args.all_tracked)

    if args.command == "scan":
        return cmd_scan(paths, repo_root, args.show_line)
    if args.command == "verify":
        return cmd_scan(paths, repo_root, args.show_line)
    if args.command == "apply":
        return cmd_apply(paths, repo_root)
    fail(f"unknown command: {args.command}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
