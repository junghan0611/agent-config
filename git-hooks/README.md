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
| `loose` | any other origin (work repos, third-party clones, local-only) | secrets only |
| `off` | per-repo override file says so | nothing (with WARN) |

**Per-repo override**: write `strict` / `loose` / `off` (single word) to
`<repo>/.git-hooks-mode`. Useful for:
- Forcing strict on a work repo that will later be open-sourced
- Forcing loose on a personal repo that legitimately discusses identity
  terms (rare — usually the right answer is to put that detail in a
  gitignored `PRIVATE.md`)

**Per-repo allowlist**: extra path regexes can go in
`<repo>/.git-hooks-allow` (same format as `allowlist-paths.txt`).

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
