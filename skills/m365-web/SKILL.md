---
name: m365-web
description: Teams 채팅, Outlook 메일, SharePoint 파일을 웹 세션 기반 CLI로 조회. Microsoft 365 협업, 일정, 로그인과 새 기기 설정에 사용. 회사 정보·토큰 보호와 명시적 쓰기 승인을 지킨다.
---

# Microsoft 365 web — Teams + Outlook

Three separate third-party CLIs, one workflow; this is **not Microsoft Graph OAuth**. They capture browser bearer tokens and use web endpoints, some private and subject to change. Follow applicable company policy; do not repeatedly ask for separate approval when GLG requests a read. Do not read, print, share, commit, or copy tokens/cookies; sessions and browser profiles contain credentials. Do not put workplace content in public repos, garden, external AI tools or logs without approval. Never send, delete, move, mark read or change meetings without the user's explicit instruction. Default to narrow read-only queries; ask before reading personal conversations or broad mailboxes.

## Current local installation

- Teams: `~/repos/3rd/teams-access`, commit `76d7bd57e42480dd55e779a83907152f927b9975`.
- Outlook: `~/repos/3rd/outlook-access`, commit `543029689329a144c990d91dc11110a8be70d772`.
- SharePoint: `~/repos/3rd/sharepoint-access`, commit `ed4a4b4633392503af3f18b949e86f2d641de842`.
- All built with `npm ci` and `npm run build`. Node >=22.12 and Google Chrome required.
- On NixOS the local checkouts carry an **uncommitted** modification to `src/auth/browser-capture.ts` (SharePoint: `src/auth/capture.ts`): choose `executablePath` from `TEAMS_CLI_BROWSER_PATH` / `OUTLOOK_CLI_BROWSER_PATH` / `SHAREPOINT_CLI_BROWSER_PATH` when set, otherwise retain `channel: opts.chromeChannel`. Build again after changing. This patch is not yet packaged; do not assume a fresh clone has it.
- 2026-11-23 on laptop: Teams `list-chats` and Outlook `list-mail --top 1 --select Id` succeeded; no message bodies inspected in those checks. SharePoint team-site login and `libraries` also succeeded, without printing results; its session file mode was 0600. This does not prove behavior on another tenant or future version.

## Commands

```bash
T="$HOME/repos/3rd/teams-access/dist/cli.js"
O="$HOME/repos/3rd/outlook-access/dist/cli.js"
S="$HOME/repos/3rd/sharepoint-access/dist/cli.js"
node "$T" list-chats --limit 10
node "$T" list-messages --help
node "$O" --no-auto-reauth list-mail --top 10
node "$O" --no-auto-reauth get-mail --help
node "$S" --help  # inspect host, ls, search and get before use
```

Output can include sensitive content and identifiers. Minimize scope; do not redirect to shared `/tmp`, repository files, or durable agent logs. Never publish raw output. CLI help documents current flags. Teams `auth-check` only probes Graph; it does not establish chat token health. `health-check` performs multiple real reads.

## Login / new machine

Follow applicable company policy when using this third-party session capture. Do not copy session files between machines; sign in interactively on the target device. After installing the pinned checkouts and applying the local executable-path patch above:

```bash
TEAMS_CLI_BROWSER_PATH="$(command -v google-chrome)" node "$T" login
OUTLOOK_CLI_BROWSER_PATH="$(command -v google-chrome)" node "$O" login
SHAREPOINT_CLI_BROWSER_PATH="$(command -v google-chrome)" node "$S" --host <company-sharepoint-host> login
```

These commands open a separate Chrome profile, not the existing Teams-for-Linux session. The human enters credentials; never ask them to paste passwords, tokens, cookies or raw login logs. Teams may need extra audience capture; consult upstream README. Avoid diagnostic tracing: Teams diagnostic logs can contain workplace URLs and identifiers. `~/.teams-cli/`, `~/.outlook-cli/` and `~/.sharepoint-cli/` hold sensitive tokens, cookies and browser state; protect them. SharePoint company-site and personal OneDrive hosts differ; verify the destination and do not treat an empty listing as proof of no files. Authentication may expire and require re-login. Never assume browser login implies company approval for this use.

## Emacs

`teams4e` uses Graph by default and cannot use these private web endpoints directly. An adapter is not yet implemented; do not claim real Teams is connected in Emacs.
