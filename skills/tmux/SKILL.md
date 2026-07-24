---
name: tmux
description: Use tmux instead of bash tool to run commands that take more than ~30 seconds, like bulk operations, db migrations, dev servers.
---

# tmux for Long-Running Processes

Use tmux when running long commands. Do not background with `nohup` or `&`
from the bash tool.

The point of this skill is to produce **a session the user can attach to and
actually see**. If nobody ever needs to look, there is no reason to involve
tmux at all. That is why most rules below protect one thing: what shows up on
screen when the user attaches.

## Socket discipline — default socket only

```bash
tmux new-session ...          # correct: default socket
tmux -L agent new-session ... # wrong: never appears in the user's `tmux ls`
tmux -f /dev/null ...         # wrong: throws away the user's tmux.conf
```

A session created on a private socket (`-L` / `-S`) is alive and healthy and
**completely invisible** to the user's `tmux ls`. This is the most common cause
of "the agent said it started a session but there is nothing there." Short of
digging through `ps`, the user has no way to find it.

Do not use `-f /dev/null` either. The user's tmux.conf carries scrollback size,
copy-mode keys, and status-bar identity. Discarding it drops history-limit to
the 2000-line default, so **the very output you meant to show gets truncated.**

Private sockets are for *diagnosis only* — `find-sessions.sh --all` and
`wait-for-text.sh -L|-S` can look at them. Never create on one.

## Start a Process

```bash
W=$(tmux display -p '#{client_width}' 2>/dev/null); H=$(tmux display -p '#{client_height}' 2>/dev/null)
tmux new-session -d -x "${W:-200}" -y "${H:-50}" -s <name> '<command>' \; set-option -t <name> remain-on-exit on
tmux pipe-pane -o -t <name> 'cat >> /tmp/agent-tmux-<name>.log'
```

Each piece prevents one specific failure:

| Piece | What happens without it |
|---|---|
| `-x` / `-y` | The session is born 80x24. Wide output and TUIs render truncated |
| `\; set-option ... remain-on-exit on` | The session **vanishes entirely** the moment the command finishes or fails |
| `pipe-pane` | (if you use a redirect instead) the pane renders blank — see the trap below |

Chaining with `\;` matters. Issuing `set-option` as a separate tmux call leaves
a window where the command can die first. One round trip has no race.

With `remain-on-exit on` the session survives its command and the pane shows
`Pane is dead (status 127, ...)`, so **the exit status is visible** and a
failure is diagnosable. The tradeoff: it will not clean itself up, so kill it
once you have read the result.

**Naming**: descriptive, e.g. `dev-server`, `nix-build`, `deploy`.

### Trap: output redirection leaves the pane blank

```bash
# wrong: session is alive, but attaching shows an empty screen
tmux new-session -d -s build 'make > /tmp/agent-tmux-build.log 2>&1'
```

`> log 2>&1` sends stdout/stderr **entirely to the file**. Nothing is ever drawn
in the pane. The user attaches and sees a blank screen — indistinguishable from
a dead session.

`pipe-pane -o` instead *copies* what the pane renders, so you get both the
screen and the log. Use it rather than a redirect.

**A double redirect is worse.** If the script already redirects internally with
`> "$LOG" 2>&1` and the tmux command redirects again, the outer log file ends up
**0 bytes**: blank screen, empty log at the path you told the user about, and
the session gone once the build finishes. A 25 MB build log went completely
unseen this way. So when you move work into a script, **do not redirect inside
the script** — let pipe-pane handle it. If the script already writes its own
log, tell the user that path.

### Trap: multi-line commands and escaping

The command argument to `tmux new-session` must be **a single line**. A literal
`\n` gets fused into errors like `bashncd: command not found`. Nesting tmux +
`bash -c` + `nix run` makes escaping grow exponentially.

```bash
# wrong: literal newline fuses "bash" and "cd" into "bashncd"
tmux new-session -d -s build "bash\ncd ~/repos\nmake"

# wrong: bash -c inside bash -c, triple escaping
tmux new-session -d -s build "bash -c \"nix run .#yocto -- -c \\\"make\\\"\""

# correct 1: chain with && on one line (safest)
tmux new-session -d -x "${W:-200}" -y "${H:-50}" -s build 'cd ~/repos && make' \; set-option -t build remain-on-exit on

# correct 2: move it into a script when nesting is deep (preferred)
cat > /tmp/agent-tmux-build.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
cd ~/repos/3rd/yocto
nix run .#yocto -- -c "bitbake core-image-weston"
SCRIPT
chmod +x /tmp/agent-tmux-build.sh
tmux new-session -d -x "${W:-200}" -y "${H:-50}" -s build '/tmp/agent-tmux-build.sh' \; set-option -t build remain-on-exit on
tmux pipe-pane -o -t build 'cat >> /tmp/agent-tmux-build.log'
```

**Rule: two levels of nesting or more, move it to a script file.** Getting a
script right is faster and safer than getting the escaping right, and failures
are easier to debug. Just remember the double-redirect trap above: **the script
must not redirect its own output.**

## Spawn an Interactive Agent or TUI

Starting an agent CLI, REPL, or TUI in a session follows different rules.

```bash
W=$(tmux display -p '#{client_width}' 2>/dev/null); H=$(tmux display -p '#{client_height}' 2>/dev/null)
tmux new-session -d -x "${W:-200}" -y "${H:-50}" -s <name> -c <repo> '<agent-cli> [flags] "<initial prompt>"'
```

- **No redirection.** For a TUI the screen *is* the result. Do not attach
  `pipe-pane` either — it records every repaint, so the log fills with control
  sequences and is unreadable (`top` produced 8 KB in 4 seconds, roughly
  7 MB/hour of escape codes).
- **No `remain-on-exit`.** An interactive process stays alive on its own.
- **Match `-x`/`-y` to the user's window.** A TUI born at 80x24 renders cramped.
- **Pass `-c <repo>`** so the working directory is exact.

Read it with `capture-pane`; send further input with `send-keys` (see below).

## User visibility (required)

Immediately after starting a session, give the user the commands to watch it:

```bash
# live
tmux attach -t <name>
# detach: Ctrl+b d

# one-shot read
tmux capture-pane -p -J -t <name> -S -200

# follow the log (when pipe-pane is attached)
tail -f /tmp/agent-tmux-<name>.log
```

## List / find sessions

```bash
# default socket
tmux ls

# detailed, with name filtering
{baseDir}/scripts/find-sessions.sh
{baseDir}/scripts/find-sessions.sh -q nix

# diagnosis: include sessions hidden on other sockets (never create on one)
{baseDir}/scripts/find-sessions.sh --all
```

## Read output

**Long-running processes** — read the log file; it outlives the process:
```bash
tail -100 /tmp/agent-tmux-<name>.log
```

**Interactive tools and TUIs** (REPL, prompts, agent CLIs):
```bash
tmux capture-pane -p -J -t <name> -S -200
```

Wait ~0.5s after starting before reading. Agent CLIs take several seconds to
produce a first response.

## Send input

```bash
# literal text, no shell expansion
tmux send-keys -t <name> -l -- "input text"
tmux send-keys -t <name> Enter

# control keys
tmux send-keys -t <name> C-c
tmux send-keys -t <name> C-d
```

**Rule**: `-l` for literal text, key names for control keys, `Enter` as its own
argument. When targeting a TUI, leave ~0.5s between the `-l` send and `Enter`
so the input is committed.

### Trap: do not hardcode `:0.0` as the target

`session:0.0` is only correct when window and pane numbering start at zero.
Under a config with `base-index 1` / `pane-base-index 1` — common, and the case
here — the first pane is `session:1.1`, so **`:0.0` refers to nothing** and every
read silently times out while the pane plainly shows the text you asked for.

Pass the **session name alone**. It resolves to the active pane regardless of
numbering:

```bash
tmux capture-pane -p -J -t <name> -S -200     # correct
tmux capture-pane -p -J -t <name>:0.0 -S -200 # wrong under base-index 1
```

If you truly need a specific pane, get its real coordinates first:

```bash
tmux list-panes -t <name> -F '#{session_name}:#{window_index}.#{pane_index}'
```

## Wait for a prompt (interactive sync)

Wait for a REPL prompt before sending the next input:

```bash
# Python prompt
{baseDir}/scripts/wait-for-text.sh -t <name> -p '^>>>' -T 15

# a specific message (fixed string)
{baseDir}/scripts/wait-for-text.sh -t <name> -p 'Server started' -F -T 30

# widen the search when the pane has a lot of scrollback
{baseDir}/scripts/wait-for-text.sh -t <name> -p 'Done' -T 60 -l 4000
```

On timeout it prints the last captured output to stderr. If the text is visibly
on screen and the wait still times out, the target is wrong — see the trap above.

## Stop a session

```bash
tmux kill-session -t <name>
```

With `remain-on-exit on` the session outlives its command, so clean up once you
have read the result. Left alone, the user's `tmux ls` fills with dead sessions.

## Rules

1. **Default socket only** — never create with `-L`, `-S`, or `-f /dev/null`
2. **No output redirection** — use `pipe-pane -o` to keep both screen and log
3. **Set the size** — `-x`/`-y` from the user's window (80x24 truncates)
4. **Pin the lifetime** — `\; set-option -t <name> remain-on-exit on`, same round trip
5. **Target by session name** — never hardcode `:0.0`; it is not pane 1 under
   `base-index 1`
6. **Descriptive session names**
7. **Check `tmux ls` first** to avoid name collisions
8. **Print the user's monitoring commands** right after starting
9. **Safe input**: `send-keys -l --`, `Enter` separately
10. **Interactive sync**: use `wait-for-text.sh`
11. **Clean up**: kill the session once read; keep logs at your discretion

Before reporting that a session started, **read the screen once with
`capture-pane`.** Report it only after seeing that the session is alive and
something is on it.
