# git-hooks — global commit/push safety rail

> **Why**: agents (and humans on a bad day) accidentally commit/push real
> names, company terms, or API keys to **public** repos under
> `~/repos/gh/`. Cleaning up via `git push --force` is costly and
> sometimes too late.
>
> **What**: a global `core.hooksPath` that scans staged/pushed diffs for
> identity terms (in public repos) and secrets (everywhere), and BLOCKS
> the operation. Same SSOT across all devices via nixos-config.

## Layout

| File | Role |
|------|------|
| `pre-commit` | Hook entry — staged diff scan |
| `pre-push` | Hook entry — push-range scan (final safety net) |
| `_scan.sh` | Shared scanner (added-lines parser + terms + secrets) |
| `_delegate.sh` | Chain to repo-local `.git/hooks/<name>` or `.husky/<name>` |
| `gitleaks.toml` | Secret detection rules (extends gitleaks defaults) |
| `sensitive-terms.txt` | Identity term regex list (one ERE per line) |
| `allowlist-paths.txt` | Paths to skip (build outputs, lockfiles, binaries) |

## Mode

The hook auto-detects mode per-repo:

| Mode | Trigger | Scans |
|------|---------|-------|
| `strict` | `origin` matches `github.com/junghan0611/*` or `github.com/junghanacs/*` | secrets **and** identity terms |
| `loose` | any other origin (work repos, third-party clones, local-only), plus known private repos listed below | secrets only |
| `off` | per-repo override file says so | nothing (with WARN) |

**Known private loose repos**: `_scan.sh` forces `loose` for PRIVATE repos
whose `origin` matches the strict namespace but whose content legitimately
carries identity terms. Identity-term scanning is skipped there; gitleaks/secret
scanning still runs. Add each name explicitly — do not wildcard. Bot-workspace
graduation checklist: nixos-config `ORACLE.md` "Bot workspace git".

| Repo | Why |
|------|-----|
| `junghan0611/openclaw-config` | private memory/config data |
| `junghan0611/apply` | private job-application workspace — résumés must name real employers and clients |
| `junghan0611/workspace-bbot` | graduated OpenClaw bot narrative git (folder name = repo name, always private) |
| `junghan0611/workspace-glg` | graduated OpenClaw bot narrative git (folder name = repo name, always private) |

The match is on the full `origin` URL (`.git` suffix optional), not the
directory name, so a lookalike such as `junghan0611/apply-extra` or a public
clone in another namespace stays `strict`.

**Per-repo override**: write `strict` / `loose` / `off` (single word) to
`<repo>/.git-hooks-mode`. Only the first line is read (`head -1`), so anything
below it is free-form justification. Useful for:
- Forcing strict on a work repo that will later be open-sourced
- Forcing loose on a personal repo that legitimately discusses identity
  terms (rare — usually the right answer is to put that detail in a
  gitignored `PRIVATE.md`)

**Known `off` repos** — none right now, and the one case that asked for it is
worth keeping as precedent because of how it ended.

`~/repos/gh/session` (the GLG session corpus, 2.9 GB / 2,145 immutable `.jsonl`)
was put on `off` on 2026-09-02: its initial-commit diff took gitleaks **47m47s**
(measured), and the corpus is speech-of-record — `session/AGENTS.md` forbids
editing a `.jsonl`, so a finding had no "fix and re-stage" path. The gate could
only block, never resolve.

Hours later GLG deleted the corpus's `.git` entirely (verified: no
`~/repos/gh/session/.git`). The corpus is now a plain data folder, kept by
snapshot rather than by commit, and no hook runs there at all. The reason is the
one worth carrying: **the guard had started costing the work it exists to
protect** — embedding stalled while the session went round on git and secrets.
`.git-hooks-mode` is left in that folder as a standing default should anyone ever
`git init` it again.

Read that as the shape of a real `off` case: not "the scan is annoying" but
"this content cannot be edited to satisfy the scan, there is no remote to
protect, and the gate is now blocking the actual job." Two of those three no
longer needed a hook answer — they needed git to leave.

**Per-repo allowlist**: extra path regexes can go in
`<repo>/.git-hooks-allow` (same format as `allowlist-paths.txt`).

> ⚠ **The path allowlist does not reach gitleaks.** `allowlist-paths.txt` and
> `.git-hooks-allow` are consumed by `parse_added_lines`, which feeds the
> identity-term scan and the no-gitleaks fallback. `scan_secrets_gitleaks` is
> handed the *unfiltered* `$DIFF_FILE`. So allowlisting a path suppresses term
> hits but neither silences gitleaks on it nor makes the scan faster — reach for
> `gitleaks.toml`'s own `[allowlist].paths` for that, and do not expect
> `.git-hooks-allow` to solve a slow scan.

## What gets scanned

Only **added lines** in the diff (lines starting with `+` excluding
`+++` headers). Pre-existing content is grandfathered — touch a line
that contains an identity term and the hook will block; leave it alone
and it remains.

This matches `gitleaks protect --staged` semantics.

## Bypass — GLG only

```bash
AGENT_ALLOW_UNSAFE_COMMIT=1 git commit -m "..."
AGENT_ALLOW_UNSAFE_COMMIT=1 git push
```

Use only for genuine false positives (meta references, documentation
about the patterns themselves, audit trails). **Agents must never set
this env var themselves.** See `~/AGENTS.md § Bypass policy`.

`git commit --no-verify` and `git push --no-verify` also bypass — but
since both pre-commit and pre-push run, `--no-verify` on commit alone
is still caught at push. Treat `--no-verify` as a "GLG-typed manually"
gesture, not an agent move.

## Adding patterns

Edit `sensitive-terms.txt`:

```
# One ERE pattern per line. Matched case-insensitively.
# Korean characters and ASCII both supported.
\bnewterm\b
\bnewhandle[0-9]*\b
```

Test before committing:

```bash
# Try a fake commit to confirm the pattern catches what you expect
echo "this contains newterm somewhere" >> /tmp/test.txt
git add /tmp/test.txt
git diff --cached -U0 | ~/repos/gh/agent-config/git-hooks/_scan.sh staged
```

## Installation

Set globally (via nixos-config home-manager):

```nix
programs.git.settings.core.hooksPath = "${vars.homeDirectory}/repos/gh/agent-config/git-hooks";
```

This applies on every `home-manager switch`. The hook files are
already executable and on the SSOT path — no per-repo install needed.

`gitleaks` itself is added to `users/junghan/modules/development/default.nix`.
Without it, the hook falls back to a small built-in pattern set (still
catches the most dangerous keys: anthropic/openai/google/groq/github/PEM).

## Failure mode

If the hook script itself crashes (bug), the commit is **blocked** with
a clear error (exit 2). That's the "let it crash" posture — better than
silently letting an unsafe commit through.

If you need to commit while debugging the hook, set
`AGENT_ALLOW_UNSAFE_COMMIT=1` and fix the hook in a follow-up.
