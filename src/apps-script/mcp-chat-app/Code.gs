/**
 * Google Chat App - MCP Integration
 * Version: 1.0.0
 * Purpose: Minimal Chat App for MCP API access
 *
 * Setup:
 * 1. Copy this code to Google Apps Script Editor
 * 2. Deploy as Web App
 * 3. Configure Chat App in Google Cloud Console
 */

/**
 * onMessage - 메시지 수신 시 실행
 * MCP는 User API로 직접 호출하므로 이 함수는 거의 사용 안 됨
 */
function onMessage(event) {
  return {
    text: "MCP Chat App - Message received"
  };
}

/**
 * onAddedToSpace - 스페이스에 앱 추가 시
 */
function onAddedToSpace(event) {
  var spaceName = event.space.displayName || "Unknown Space";
  return {
    text: "MCP Chat App이 " + spaceName + "에 추가되었습니다."
  };
}

/**
 * onRemovedFromSpace - 스페이스에서 앱 제거 시
 */
function onRemovedFromSpace(event) {
  console.log("Removed from space: " + event.space.name);
}

/**
 * onAppCommand - 슬래시 명령어 처리
 */
function onAppCommand(event) {
  return {
    text: "Command received"
  };
}

/**
 * doGet - HTTP GET 요청 처리
 * MCP에서 Apps Script를 트리거할 수 있음
 */
function doGet(e) {
  var action = e.parameter.action || 'status';

  switch (action) {
    case 'status':
      return jsonResponse({
        status: 'ok',
        service: 'MCP Chat App',
        timestamp: new Date().toISOString()
      });

    case 'test':
      return jsonResponse({
        message: 'Test successful'
      });

    default:
      return jsonResponse({ error: 'Unknown action' });
  }
}

/**
 * doPost - HTTP POST 요청 처리
 * MCP에서 복잡한 데이터 전송 시 사용
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    switch (action) {
      case 'ping':
        return jsonResponse({ pong: true });

      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

/**
 * Helper: JSON 응답 생성
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
