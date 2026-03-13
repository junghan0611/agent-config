# MCP Chat App

Google Chat integration for MCP (Model Context Protocol).

## Purpose

Minimal Chat App configuration to enable Google Chat API access via MCP.
The app uses User credentials (OAuth) instead of Bot architecture.

## Files

- `Code.gs`: Main Chat App functions
- `appsscript.json`: Project manifest
- `DEPLOYMENT.md`: Deployment ID and setup instructions

## Setup

### 1. Create Apps Script Project

1. Go to https://script.google.com
2. New Project
3. Copy `Code.gs` content into the editor
4. Save project

### 2. Deploy as Web App

1. Click "Deploy" → "New deployment"
2. Type: Web App
3. Execute as: Me
4. Who has access: Anyone (or your organization)
5. Deploy
6. Copy Deployment ID

### 3. Configure Chat App

1. Go to Google Cloud Console
2. APIs & Services → Enabled APIs → Google Chat API
3. Configuration tab
4. Connection settings:
   - Select "Apps Script"
   - Paste Deployment ID
5. Save

## Functions

### Chat Functions (Required by Chat API)

- `onMessage(event)`: Handle incoming messages
- `onAddedToSpace(event)`: Handle app added to space
- `onRemovedFromSpace(event)`: Handle app removed
- `onAppCommand(event)`: Handle slash commands

### Web App Functions (For MCP triggers)

- `doGet(e)`: Handle HTTP GET requests
- `doPost(e)`: Handle HTTP POST requests

## MCP Usage

```python
# Send message to Chat space
mcp__google-workspace-work__send_message(
  user_google_email="work@example.com",
  space_id="spaces/XXXXXX",
  message_text="Hello from MCP!"
)

# Get messages from space
mcp__google-workspace-work__get_messages(
  user_google_email="work@example.com",
  space_id="spaces/XXXXXX",
  page_size=10
)
```

## Notes

- This is a **minimal configuration** for MCP access
- The app doesn't need HTTP endpoints for basic MCP usage
- Interactive features can be disabled in Chat App config
- Apps Script functions are here for future extensibility

## Version

- 1.0.0 (2025-11-14): Initial version
