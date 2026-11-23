# Microsoft 365 integration

The [`m365-web` skill](../skills/m365-web/SKILL.md) uses separate third-party web-session CLIs for Teams, Outlook, and SharePoint. It is not Microsoft Graph OAuth. Follow the skill for installation, local NixOS patch requirements, login, and read-only defaults. Use only where company policy permits; explicit user instruction is required for writes.

Keep credentials, tenant configuration, and workplace content out of this public repository, shared transcripts, session embeddings, and public exports.

The earlier design considered [PnP CLI for Microsoft 365](https://github.com/pnp/cli-microsoft365) as a single-CLI candidate. The current approach uses the web-session tools instead.
