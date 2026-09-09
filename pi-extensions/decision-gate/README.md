# decision-gate — 시험소 (agent-config#24)

담당자 턴이 `blocked`로 끝났을 때 **무슨 근거로 계속 진행하는가**에 답하는 게이트. 계약은
[#24](https://github.com/junghan0611/agent-config/issues/24)에 있고, 여기 있는 것은 그 계약을
기계로 확인하는 조각 하나뿐이다. 목적과 세트 관계(시계·이 게이트·dm)는 README § heartbeat.

**통과하는 파일** = [`fixtures/pass.md`](fixtures/pass.md). **§1~§6 정의** = [#24 §산출물의 틀](https://github.com/junghan0611/agent-config/issues/24).
캐는 손: 이 턴 안이든 형제(`entwurf_fresh_call` / `entwurf_v2`) — **둘 다 허용** (2026-09-09).

```bash
python3 gate_lint.py <판단축.md> ...   # exit 0 = 게이트 열림 / 1 = 블로킹
python3 test_gate_lint.py             # 픽스처 + (있으면) 2026-09-08 실물 두 개
./run.sh test:gate                    # 같은 테스트, 이 집 run.sh 호출자
```

`test_gate_lint.py`는 이 호스트에 `openclaw-config` 실물이 없으면 `SKIP real artifacts`를
`all green` **앞에** 찍고, 픽스처만으로 통과한다. skip이 안 보이면 실물을 한 번도
안 본 기기가 통과로 읽힌다. `./run.sh test:unit` 은 andenken 위임이라 여기 없다.

## 무엇을 보나

| 게이트 | 계약 | 반례 (2026-09-08 실측) |
|---|---|---|
| 틀 | §1~§6이 다 있고, §1은 시간순이며 §1 자체에 인용이 있다 | 오늘 두 산출물은 §6이 없다 → 반려 |
| G1 | §6 항목마다 `[날짜, 출처, 증거상태]` 최소 1개. 없으면 **불명 — 블로킹** | 담당자 문서의 "pilot 승인됨"이 세션 원문에 없었다 |
| G3 | §6 항목이 §1의 날짜를 최소 하나 인용 | 봇공방 채택→거부→재의심이 "판정 하나"로 뭉치면 궤적이 사라진다 |

G2(그 경로에 push·금전·외부 발신 권한이 없다)는 **여기 없다.** 익스텐션이 없으면 검증할 경로
자체가 없어서, 계약 문장만 #24에 있고 테스트는 익스텐션과 같이 온다.

**형식만 본다.** 인용이 그 항목에 대한 것인지는 기계가 못 본다 — 그건 캐는 손(이 턴 또는 형제)과 그 파일을 읽는
담당자의 자리다. 교차검수(2026-09-08, `openai-codex/gpt-5.6-terra`)가 찾은 우회 둘(출처 없는
`[날짜, 증거상태]`, 불릿 뒤 산문 결정)은 막았고 `fixtures/block-bypass-*.md`로 회귀 고정했다.

## 권위가 없다 — 정확히 어디까지

지우면 게이트가 닫힐 뿐이다 — 담당자는 오늘처럼 멈추고 GLG를 기다린다(현행 동작). 상태 저장소도
시계도 원장도 없다. `pi-extensions/*.ts`만 하네스로 링크되므로 이 디렉터리는 어디에도 안 실린다.

단 교차검수의 정정 하나를 그대로 싣는다: **업무·상태의 권위는 없지만 계약 검증의 권위는 있다.**
나중에 익스텐션이 `exit 0`을 계속 조건으로 삼는 순간 이 파일은 운영 의존성이 된다 — 그때
"지워도 아무 일 없다"는 말은 더 이상 참이 아니다.

## 익스텐션은 섰다 — 그리고 그 자리는 `goal.ts:655` 가 아니다

`pi-extensions/decision-gate.ts` (`89f8809`·`b2e40ce`). 회귀는 `./run.sh test:decision-gate`
이고 #24 의 G2 done_when 이 거기 있다.

트리거는 여전히 `update_goal(status:"blocked")` 전이지만, **다는 자리는 `agent_settled`**
이다(2026-09-09 정정). `agent_end` 확장 핸들러는 에이전트 루프 안에서 await 되고
[읽음, 설치본 pi 0.85.1 `dist/core/agent-session.js:474`], 그 await 가 끝난 다음에야 pi 가
자동 재시도·압축·큐된 continuation 을 정한다 [같은 파일 `:776-810`]. 몇 분짜리 사이드
세션을 거기 달면 재시도 앞을 막고 같은 실행에서 두 번 켜질 수 있다. `agent_settled` 는
*"no automatic retry, compaction, or queued continuation will run"* 뒤에 한 번 온다
[읽음 `dist/core/extensions/types.d.ts:561,926`] — "담당자 턴이 blocked 로 끝났다"의 문자
그대로의 자리다. `goal.ts` 는 여전히 0줄 고친다.

캐는 예산도 코드에 있다: consult 당 dig 24회(넘으면 프로세스를 안 띄우고 거절), dig 하나
60초, consult 전체 8분. 셋 다 **잘 돈 실물 판(dig 18회) 위에** 잡았다 — 상한이 성공 사례를
깎으면 그건 안전이 아니다. 막는 것은 즉시 실패하는 dig 의 무한 되부름과, 첫 실물 시도가
보인 **말 없는 9분 정지**다. 잘린 사실은 엔트리 `budget` 에 남는다 — 조용히 잘리면 그건
다시 "밖에서 똑같이 보이는 침묵"이다.

## 어느 모델이 캐는가 — GLG 가 정한다

GLG 2026-09-09: *"오프스가 돌다가 게이트는 terra 또는 luna로 잡아 놓고 답변 받게 한다든가. …
개념상으로 모델을 다르게 가져가는거야."*

```
/decision-gate                                   # 지금 후보·인증·예산 패널
/decision-gate model openai-codex/gpt-5.6-luna   # 이 세션만
/decision-gate model luna, terra                 # provider 생략 = 아무 레일, MODELS.md 순서
/decision-gate model reset                       # 환경변수/기본값으로
```

우선순위는 **세션 지정 → `DECISION_GATE_MODELS`(`~/.env.local`, env-loader 가 싣는다) →
기본 후보**(codex-terra → copilot-terra → zai → xai). 어디서 왔는지는 엔트리 `modelSource` 에
남는다. 규칙 둘은 그대로다: **상주와 같은 provider+id 는 건너뛴다**(그 레일을 아끼려고 만든
물건이므로), 그리고 인증된 후보가 없으면 **fail-closed** — 상주 모델로 떨어지지 않는다.
정확한 이름이 맞으면 부분일치는 아예 안 본다 — 편의가 지정을 넓히면 그건 지정이 아니다.

실물 2026-09-09 (oracle): 상주 `xai/grok-4.6`, 게이트 `openai-codex/gpt-5.6-luna`(env),
dig 11회·4축, 인용 3/3 해소, consult 1회 **$0.0015**. 판 앞의 판은 dig 15회에 $0.0017.

## 교차검수가 남긴 한계 셋 (2026-09-09, `openai-codex/gpt-5.6-terra`)

고친 둘은 아래 § 아직 안 된 것 위로 올라갔다. **안 고친 셋은 여기 그대로 둔다** — 계약이
주장하지 않는 것을 주장한 것처럼 읽히지 않게.

| 한계 | 무엇이 참인가 |
|---|---|
| `agent_settled` 대기 비용 | 그 핸들러도 await 된다. consult 는 재시도 앞을 막지 않는 대신 **정착 뒤를 막는다** — `-p` 종료와 idle 복귀가 최대 8분 늦다. 실측 두 판은 1분 안에 끝났다 |
| CLI 내부의 읽기 전용성 | argv 로 `reindex`·push·curl·dm 에 못 닿는 것은 회귀로 섰다. 그 CLI **안이** 읽기만 한다는 것은 andenken 소스를 따라가야 하는 별개의 일이고, 여기서 증명 안 했다 |
| provider 별칭 쿼터 | 다른 provider 의 같은 모델 이름은 일부러 다른 레일로 본다(`MODELS.md` 가 별도 계약으로 둔다). 둘이 실은 같은 쿼터면 fail-closed 가 뚫리고, 그걸 확인하는 코드는 없다 |

`/decision-gate model luna` 처럼 provider 를 생략하면 고르는 것은 **레일**이다 — 상주와 모델
이름이 같아도 provider 가 다르면 선다. "모델을 다르게"가 아니라 "레일을 다르게"가 필요하면
provider 를 적어라.

## 아직 안 된 것

- **`openclaw` 축은 oracle 에 없다.** 실물에서 exit 4 + `state=absent, authority=thinkpad` 로
  돌아왔다. 이제 그 사유가 엔트리와 형제 양쪽에 그대로 실리므로 침묵을 증거로 쓰지 않지만,
  이 기기에서 그 축은 **여전히 못 캔다**(andenken#14).
- **`timeline` 축은 cwd 에 `events.jsonl`(LOCAL FULL)이 있을 때만 선다.** 없으면 프로세스를
  안 띄우고 그렇게 적는다 — `collect.py` 는 8초 걸리고 파일을 쓰므로 이 경로에 안 둔다.
- §6 형식은 오늘 산출물에 없다. 신설이고 한 번도 안 써봤다 — 바뀌면 lint도 바뀐다.
- **열린 사용성 질문:** `###` 헤딩도 §6의 한 항목이라(`gate_lint.py:46-49`, `3059803` 우회② 차단의 결과) **그룹 헤딩에 자기 인용이 없으면 막힌다.** 즉 §6을 소절로 묶을 수 없다. 결함이 아니라 설계의 대가이고, 실물에 §6을 처음 써볼 때 이게 걸리면 그때 규칙을 다시 본다.
