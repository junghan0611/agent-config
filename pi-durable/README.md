# pi-durable — native env/hide reference

**접점은 entwurf, 집의 정책은 agent-config.** Entwurf 0.32.0의 `--native-module`을 실제 운영 환경에서 소비하는 작은 레퍼런스 구현이다. durable을 한 번 만들고 같은 대화를 계속 다시 여는 사용을 위한 것으로, 두 번째 하네스나 Pi 확장 호환층이 아니다.

## Launch and lifetime

Prerequisite: Entwurf **0.32.0+** on PATH. Its package owns the emitted durable app carrier and the exact **Pi 1.0.4** SDK set; agent-config installs neither. Upgrading the ordinary Pi CLI alone does not supply this app. The old fixed-XDG source runtime is retired, without fallback.

From the repository that will own the conversation:

```bash
# Create once. Thinking effort is the :high model suffix, not a separate flag.
entwurf pi-durable --provider openai-codex --model gpt-6.1-sol:high \
	--width task-wide --native-module "$HOME/repos/gh/agent-config/pi-durable/env.mjs"

# Reopen the newest saved conversation for this cwd; reattach the module explicitly.
entwurf pi-durable --continue \
	--native-module "$HOME/repos/gh/agent-config/pi-durable/env.mjs"
```

`--continue` is **not** a garden-id selector. Return to the same project directory; it selects that cwd's newest session and reopens the saved model. Provider, model, width, and bootstrap inputs are fresh-only and are rejected with `--continue`; `--native-module` is allowed on both paths. This module is not remembered in the session or auto-discovered. The [root README shell helpers](../README.md#shell-aliases-bashrclocal) (`pdt` medium / `pds` high / `pdc` reopen) keep the one path in the shell; `run.sh setup` does not install them or alter shell configuration. Native-module propagation through `entwurf_fresh_call` is out of scope (Entwurf's fresh launch attaches no module).

## Interface and initialization

| File/export | Contract |
|---|---|
| `env.mjs` default | Native extension object `{ name: "agent-config-env" }`; no hooks or SDK imports |
| `env.mjs` top level | Delete hidden inherited keys, read the home file, inject eligible absent keys |
| `env.mjs` named `summary` | File path, read boolean, key-name arrays `hidden`, `injected`, `kept`, `skipped`; never values; nothing printed |
| `dotenv.mjs` `parseDotenv(text, home)` | Assignment extractor returning `Map<string, string>`; does not execute shell code |

Entwurf imports and awaits this ordinary ESM **before importing the TUI/runtime**. Pi 1.0.4's durable runtime creates its provider runtime before installing extension objects, so env preparation must happen during ESM evaluation, not in a hook. Entwurf installs the default object after its own contact and guards cwd and identity across initialization. Its module ingress is trusted operator code, **not a sandbox**.

## Environment policy

- Read **only** `~/.env.local`, never a project's file. No Bash `source`, `eval`, command substitution, branch evaluation, or new shell parser.
- Existing process keys win, including deliberate empty strings. File duplicates resolve in file order, last assignment wins.
- Never inject `HOME`, `PI_SESSION_ID`, `PI_CODING_AGENT_DIR`, or any `ENTWURF_*` identity carrier. Do not change cwd.
- Remove inherited `OPENROUTER_API_KEY`, `HF_TOKEN`, `GROQ_API_KEY`, `GEMINI_API_KEY`; never re-inject them from the file. This suppresses their automatic model-provider discovery, not skill capability. Skills needing them continue reading the home file directly.
- Missing file (`ENOENT`) is a normal read no-op **after hiding inherited keys**. Other read failures propagate; Entwurf reports `native-module-import-failed`. File content itself is not a parse-failure surface.
- Children inheriting this process's environment inherit the hiding. A child that explicitly reads/sources the home file can obtain the keys again. This module does not set or remove `BASH_ENV`; it is not a credential sandbox.

### Pi-compatible reading, not shell interpretation

Values follow the live `pi-extensions/env-loader.ts` parser: trim lines; skip blanks/comments/nonassignments; strip literal leading `export `; split at the first `=`; trim key/value; remove matching outer quotes; replace literal `$HOME` globally and expand leading `~/`; keep everything else literal, including `$OTHER`, inline `#` text, and unmatched quotes. The one deliberate parser difference is skipping nonidentifier keys (`[A-Za-z_][A-Za-z0-9_]*`).

A `case` or `if` is **not evaluated**. Assignments inside all branches are extracted in file order; later duplicates win. This reproduces Pi's reading policy, not correct host-specific routing. Every individual operational injection and branch-selection result remains unverified.

## Verification and the real-file incident

```bash
# Full API-0 suite: unit/child-process + bootstrap seams + offline real ModelRuntime.
./run.sh test:pi-durable-env

# Unit-only, without an Entwurf checkout.
node --test pi-durable/tests/env.test.mjs

# Full suite against another already-built Entwurf checkout (no install/build here).
AGENT_CONFIG_ENTWURF_DIR=/absolute/path/to/entwurf ./run.sh test:pi-durable-env
```

The full suite requires a built Entwurf checkout (default `~/repos/gh/entwurf`); absence fails by name, `entwurf-checkout-missing`, with exit 1 — never a successful skip. It uses synthetic HOME/env values, an offline real `ModelRuntime`, and stubbed bootstrap storage/contact seams. It opens no real conversation or bridge and spends no model turn.

**Measured 2026-10-08:** 15/15 tests passed; intentionally missing checkout exited 1. A comparator extracts the current Pi parser from source and checks the same synthetic corpus rather than comparing two copied implementations. The first strict parser passed synthetic tests but refused the real home file's shell `case` line on restart. Returning to Pi-compatible reading repaired that launch; no shell interpreter was added.

A separate, value-free read-only import of the actual home file succeeded without changing identity, cwd, or file metadata. GLG then reopened garden `20261007T104525-12d0ca` with `--continue --native-module`: native argv, previous dialogue continuity, and all four hidden keys absent from the bash child were observed. **That is not proof of the bridge child's full environment, operational branch routing, crash survival, or exactly-once delivery.** Historical failures, repairs, mutation receipts, and exact evidence scopes: [PI-DURABLE.md](../PI-DURABLE.md).

Source contract: [Entwurf #130](https://github.com/junghan0611/entwurf/issues/130), [`docs/durable-native-support.md`](https://github.com/junghan0611/entwurf/blob/v0.32.0/docs/durable-native-support.md), and `pi/pi-durable/{bootstrap.mjs,overlay/upstream-pin.json,carrier/runtime.js}` at `v0.32.0` (`80d66f4`). Classic `pi-extensions/` remains unchanged and still belongs to ordinary Pi.
