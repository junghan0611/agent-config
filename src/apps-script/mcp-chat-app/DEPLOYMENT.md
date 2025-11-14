# Deployment Information

## Apps Script Project

- **Project ID**: `[YOUR_APPS_SCRIPT_PROJECT_ID]`
- **Created**: 2025-11-14
- **URL**: https://script.google.com/home/projects/[PROJECT_ID]/edit

## Deployment

- **Deployment ID**: `[YOUR_DEPLOYMENT_ID]`
- **Type**: Web App
- **Version**: 1 (Head deployment for development)
- **Execute as**: Me
- **Who has access**: Anyone with the link / Organization

## Google Cloud Console

- **Project**: [YOUR_GCP_PROJECT]
- **Project Number**: [YOUR_PROJECT_NUMBER]
- **Chat API**: https://console.cloud.google.com/apis/api/chat.googleapis.com

## Chat App Configuration

- **App name**: MCP Chat App
- **Avatar URL**: https://www.gstatic.com/images/branding/product/1x/chat_2020q4_48dp.png
- **Description**: MCP Integration for Google Chat
- **Connection**: Apps Script
- **Deployment ID**: [See above]
- **Visibility**: Internal (Organization only)

## Triggers

- App command: `onAppCommand`
- Added to space: `onAddedToSpace`
- Message: `onMessage`
- Removed from space: `onRemovedFromSpace`

## Testing

### Test Web App Endpoint

```bash
curl "https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec?action=status"
```

Expected response:
```json
{
  "status": "ok",
  "service": "MCP Chat App",
  "timestamp": "2025-11-14T05:00:00.000Z"
}
```

### Test Chat Integration

1. Create or join a Google Chat space
2. Use MCP to send message:
   ```python
   mcp__google-workspace-work__send_message(
     space_id="spaces/XXXXXX",
     message_text="Test message"
   )
   ```
3. Verify message appears in Chat

## Notes

- Keep this file updated when redeploying
- Deployment ID changes with each deployment
- Use versioned deployments for production
- Head deployment is fine for development

## Version History

- v1.0.0 (2025-11-14): Initial deployment
