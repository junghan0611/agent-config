# Microsoft 365 integration direction

**Status: design only.** There is no installable Microsoft 365 skill in this repository. This page does not authorize installation, sign-in, consent, or live queries.

Prefer one existing open-source CLI over separate tools or a new wrapper. [PnP CLI for Microsoft 365](https://github.com/pnp/cli-microsoft365) is the candidate for Teams conversations, Outlook mail and calendars, and OneDrive and SharePoint document workflows. Document uploads are in scope; messages to people remain human-sent. An agent may prepare a draft for the operator, but the integration should not request message-send permissions.

Publish a skill only after the chosen commands, permission boundaries, credential storage, and upload behavior are verified in an approved environment. Keep organization-specific connectors, tenant configuration, and pilot records outside this public repository. Do not put work data into shared transcripts, session embeddings, or public exports.
