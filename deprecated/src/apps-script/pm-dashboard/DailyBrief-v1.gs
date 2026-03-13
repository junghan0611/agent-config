/**
 * PM Dashboard - Daily Brief v1
 *
 * 매일 아침 09:00 자동 실행
 * 오늘 일정을 Chat에 보고
 */

/**
 * 일일 아침 브리핑
 * Time-driven trigger: 매일 09:00
 */
function dailyMorningBrief() {
  try {
    // 1. 오늘 일정 조회
    var cal = CalendarApp.getDefaultCalendar();
    var today = new Date();
    var events = cal.getEventsForDay(today);

    // 2. 메시지 생성
    var dateStr = Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd (E)');
    var message = '📅 *오늘 일정* (' + dateStr + ')\n\n';

    if (events.length === 0) {
      message += '일정 없음 ✨';
    } else {
      message += '총 ' + events.length + '개 일정\n\n';

      events.forEach(function(e) {
        var startTime = Utilities.formatDate(e.getStartTime(), 'Asia/Seoul', 'HH:mm');
        var endTime = Utilities.formatDate(e.getEndTime(), 'Asia/Seoul', 'HH:mm');
        var title = e.getTitle();

        message += '• ' + startTime + '-' + endTime + ' ' + title + '\n';
      });
    }

    // 3. Chat 전송
    var spaceId = 'spaces/AAQAjwBNvCk';  // jhkim2-openchat
    sendToChat(spaceId, message);

    Logger.log('일일 브리핑 전송 완료: ' + events.length + '개 일정');

  } catch (error) {
    Logger.log('에러: ' + error.toString());
  }
}

/**
 * Google Chat에 메시지 전송
 */
function sendToChat(spaceId, text) {
  var url = 'https://chat.googleapis.com/v1/' + spaceId + '/messages';

  var payload = {
    text: text
  };

  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    Logger.log('Chat 전송 실패: ' + response.getContentText());
  }

  return responseCode === 200;
}

/**
 * 수동 테스트용
 * Apps Script Editor에서 실행 → 함수 → dailyMorningBriefTest
 */
function dailyMorningBriefTest() {
  Logger.log('테스트 시작');
  dailyMorningBrief();
  Logger.log('테스트 완료 - 실행 로그 확인');
}
