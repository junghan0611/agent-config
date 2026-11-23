# Teams CLI evaluation

## First deployment

The first pilot reads one designated Teams chat. The intended workflow is a work brief across Teams, Outlook and the relevant work tracker. Outlook and tracker access require their own approved connections and are pending. GLG normally sends replies directly, using a copy-ready draft when requested.

Confirm company approval for the Entra client, tenant, device, login flow, token store and agent runtime before processing work data. Graph v1.0 documents delegated `Chat.ReadBasic` for the chat list and `Chat.Read` for message bodies on work or school accounts. Validate command-specific extra scopes against a pinned build. If OSO's profile needs `offline_access`, review persistent delegation explicitly. Diagnose a 401 or 403 using redacted auth status and the tenant's policy, including user consent, app assignment and Conditional Access. [Chat list](https://learn.microsoft.com/en-us/graph/api/chat-list) · [Message list](https://learn.microsoft.com/en-us/graph/api/chat-list-messages)

Review the source and release assets at a pinned revision, check available integrity metadata and inspect local caching and network behavior. On NixOS, use a separately approved package change with pinned source and dependency hashes (`buildRustPackage` for OSO or `buildGoModule` for the Go candidate). First check the command and JSON contract offline, then use a designated test chat after approval. Include keyring access in the workstation check. Both candidates ship a `teams` binary.

## Candidate review

| Candidate | Evidence and decision |
|---|---|
| OSO `ms-teams-cli` | Preferred pilot. MIT Rust CLI with release builds, JSON output, bounded chat/message commands, keyring storage and an optional local file store. Its built-in third-party app requests broad delegated scopes. The documented BYO profile lets the operator override them, and the CLI appends `offline_access`. Verify enrolled tenant, actual requested scopes and cache behavior on the pinned build. [Project](https://github.com/osodevops/ms-teams-cli) · [Auth](https://github.com/osodevops/ms-teams-cli/blob/main/docs/auth.md) |
| Floris Cornel `teams-cli` | MIT static Go CLI with JSON, chat listing and bounded chat reads. Defaults to Microsoft's Graph CLI Tools app and supports an owned app and an admin-request diagnostic. Documented `chats` preset includes write and file permissions. The `read-only` preset adds channel and file permissions. Consider it if a pinned build supports the approved narrow permission set. README describes encrypted token caching with a keychain-held key. [Project](https://github.com/floriscornel/teams-cli) |
| `movish01/mst-cli` | Public project contents were unavailable during review. License, command surface, auth and maintenance are unverified. [Project](https://github.com/movish01/mst-cli) |
| `weirdapps/teams-access` | MIT TypeScript project documents browser bearer capture and private Teams endpoints. Exclude this route from company onboarding. [Project](https://github.com/weirdapps/teams-access) |

The evaluation is based on public documentation. Builds and live tenant behavior remain to be verified.

## teams4e

OSO documents access-token export. A machine-to-machine helper is viable only if the pinned CLI can supply the approved profile's Graph delegated access token in exactly the format teams4e expects. Verify stdout and error handling with a mock first, then confirm scope and expiry behavior without displaying the token. Keep the helper inside the approved Emacs process boundary. Existing teams-for-linux sign-in supplies no verified Graph token contract for this integration.
