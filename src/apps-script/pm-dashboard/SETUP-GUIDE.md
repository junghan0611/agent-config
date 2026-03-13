# PM Dashboard 설정 가이드

## Phase 1: Daily Brief (매일 아침 일정 Chat 보고)

### Step 1: 코드 추가 (3분)

#### MCP Chat App Apps Script Editor 열기

```
https://script.google.com/home
→ "MCP Chat App" 클릭
```

#### 기존 Code.gs 하단에 추가

**Code.gs 파일 맨 아래에 추가** (기존 코드 유지):

```javascript
// ============================================================
// PM Dashboard - Daily Brief
// ============================================================

function dailyMorningBrief() {
  try {
    var cal = CalendarApp.getDefaultCalendar();
    var today = new Date();
    var events = cal.getEventsForDay(today);

    var dateStr = Utilities.formatDate(today, 'Asia/Seoul', 'yyyy-MM-dd (E)');
    var message = '📅 *오늘 일정* (' + dateStr + ')\n\n';

    if (events.length === 0) {
      message += '일정 없음 ✨';
    } else {
      message += '총 ' + events.length + '개 일정\n\n';
      events.forEach(function(e) {
        var startTime = Utilities.formatDate(e.getStartTime(), 'Asia/Seoul', 'HH:mm');
        var endTime = Utilities.formatDate(e.getEndTime(), 'Asia/Seoul', 'HH:mm');
        message += '• ' + startTime + '-' + endTime + ' ' + e.getTitle() + '\n';
      });
    }

    var spaceId = 'spaces/AAQAjwBNvCk';
    sendToChat(spaceId, message);

    Logger.log('일일 브리핑 완료');
  } catch (error) {
    Logger.log('에러: ' + error.toString());
  }
}

function sendToChat(spaceId, text) {
  var url = 'https://chat.googleapis.com/v1/' + spaceId + '/messages';

  var options = {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  Logger.log('Chat 응답: ' + response.getResponseCode());
  return response.getResponseCode() === 200;
}
```

**저장**: Ctrl+S

### Step 2: 수동 테스트 (1분)

#### Apps Script Editor에서

1. 함수 선택: `dailyMorningBrief`
2. **실행** 버튼 클릭 (▶)
3. 권한 승인 팝업 → **검토** → **고급** → **안전하지 않은 페이지로 이동** → **허용**
4. 실행 로그 확인

#### Google Chat 확인

`jhkim2-openchat` 스페이스에 메시지 도착했는지 확인!

### Step 3: Time-driven 트리거 설정 (2분)

#### 트리거 메뉴

1. Apps Script Editor 왼쪽 **⏰ 트리거** 클릭
2. **+ 트리거 추가** 클릭

#### 설정

```
실행할 함수: dailyMorningBrief
배포: Head
이벤트 소스: 시간 기반
시간 기반 트리거 유형: 일 타이머
시간 선택: 오전 9시~10시
```

3. **저장** 클릭

### 완료!

**내일 아침 09:00**에 자동으로 Chat에 일정 보고됩니다!

---

## 테스트 결과 알려주실 사항

1. ✅ 수동 실행 성공? (Chat에 메시지 도착?)
2. ✅ 트리거 설정 완료?
3. ✅ 내일 아침 자동 실행 확인?

**다음**: 저녁 요약 (18:00), Tasks 자동 생성 등 추가
