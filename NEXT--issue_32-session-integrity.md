# NEXT — #32 세션 정본의 무결성과 출처

Issue: [agent-config#32](https://github.com/junghan0611/agent-config/issues/32).
Branch: `issue/32-session-integrity`, base `ba8df8ff1f88d30ab6bc82b10749684ab351de85`.
Updated: 2026-11-02. 이 브랜치의 진입점이다. main `NEXT.md`의 과거 CURRENT/STOP을 새 지시로 읽지 않는다.

# RAIL — 현재 좌표

- [x] **1. v1 범위 확인** — GLG가 sessions 폴더 버전관리와 기존 SHA 장부·Git commit 대조라는 단순한 룰로 범위를 좁혔다.
- [x] **2. 담기·가져오기·개별 검증 룰** — 원문 버전과 같은 commit의 MANIFEST·actual SHA를 대조하는 단순 v1을 정리했다. 별도 서명/작성자 인증은 선행조건이 아니다.
- [x] **3. 작은 annex 관측·검수** — 합성1파일/2로컬repo의 2버전회수·SHA장부대조21/21,이집artifact/원문객체검수완료. 실제운영채택/성능보증은아니다.
- [ ] **4. 운영 룰·최소 호환 준비** ← CURRENT: annex선택·전체임베딩수집완료시batch commit은GLG결정. 스킬/실제수집·복제/장부접점에연결준비하며실코퍼스/생산스크립트변경은아직없다.
- [ ] **5. 승인된 sessions 버전관리 이행** ← PAUSED: 원본 보존·목적지·비공개·복구·실행 범위를 정한 뒤 진행한다. 임베딩 완전 일치는 필수조건이 아니다.

현재 좌표: 단순 룰·로컬 annex 관측/검수 완료 → 작은 운영/호환 준비 → 승인된 이행.

# NOW — git-annex와 전체 임베딩 시점의 batch commit 연결 준비

- **GLG 채택 결정:** git-annex로 간다. 커밋은 명시 요청한 전체 임베딩의 sessions 복사·MANIFEST 갱신 완료 시 한 번 수행하도록 스킬/절차에 넣는다. 파일별/자동 local warm별 커밋이 아니며 같은 gather를 재사용한다. 전체 임베딩은통상global증분도포함하고fullrebuild강제아니다. 변경없으면빈commit불필요. 이집 `memory-sync`스킬/운영문서에선택과미구현상태를기록했으며,본체hook·privateandenken-embed스킬실반영은그소유레인의호환작업과맞춘다. GLG가Andenken에직접소통중이므로현재추가연락하지않는다. 원격Gitpush·실코퍼스init·유료실행·사본drop은이말로시작하지않는다.

- **최신 GLG 범위:** 담는 시점의 세션 파일을 SHA로 기록하고 sessions 폴더 자체를 버전관리한다. 가져갈 때 개별 파일 SHA를 해당 버전의 장부와 대조하고 Git commit 정보를 확인한다. 임베딩 데이터와 정본의 완전 일치는 이번 필수조건이 아니다.
- **v1 룰:** (1) 원문 버전과 기존 MANIFEST 장부를 commit에 연결 (2) 필요한 버전을 가져옴 (3) actual SHA·그 commit의 장부·commit 정보를 확인. 원문은 채택된 git-annex로 연결하되 장부만 남기고 과거 원문 버전을 잃는 안이 아니다. 미취득을 해시 불일치로 오인하지 않는다.
- **지금 제외:** 별도 서명·키·작성자 인증·garden/native 증거 체계·반재생 프로토콜·전량 임베딩 대조를 v1의 선행조건으로 요구하지 않는다. 아래 초기 확장 설계는 참고이며 현재 TODO를 대체하지 않는다.
- **v1 실무 분담(12:42–12:43 인수):** #32가backend/별도버전회수·manifest commit룰을정하고,#18이자기repo의replicate/manifest/reader최소호환변경과검증을소유하며이집은원본보관계약을교차검수한다. Nix는공급/배치다. .git배제만으로내용복제가끝나는것이아니므로replica symlink target/명시내용전송·실체화와.git진입파일도확인한다. 과거버전읽기위치는normalgather/discovery에섞지않고reader허용경로·closed경계를유지한다. 역할분담이지현재코드/실험GO는아니다. 원문비공개유지;Andenken표본의민감단편은복사·키검사하지않는다.
- **현재 실행 범위:** GLG가 ‘우리 작업 진행, Andenken은 직접 소통’이라고 새로 지시했다. PATH의 git-annex10.20260421/git-lfs를 직접 확인하고 기존754cad에게 ignored private루트의 합성 JSONL1개+가짜장부, local repo 두 곳만 사용하는 기본locked-annex fixture 작성·실행을 요청했다. init/add/local commit/clone/fetch/get은 그 fixture안에서 허용하며 정상 hooks·local remote만 사용한다. 2버전별SHA/장부·옛내용회수·UUID구별·제작repo현재v2유지·반출가짜사본1byte변조를 확인한다. 실제sessions/DB/키/외부네트워크/remote설정·drop/fsck/prune·생산코드/스크립트실행·추가push는 범위밖이다. 다른 집 연락은 멈췄고13:44 run의21/21완료를수신했다. `fixture-annex/RESULT.md`·3scripts/FIXES·expect/checks를직접읽고SHA12개와C1/C2장부에연결된205/271B원문객체를독립검수했다(재실행아님). 최초결과와unused관리파일갱신수선본을검수했고,운영결정이덧붙은최종 RESULT SHA505bfa2289e1ba02cadd3deb36bdb42ca0d7415439bf7b6acd7f0d2081405329·목록SHA8b9397214e826b73b8642a4d1bf93d7b74635a683cf3d1fe0ae7215096c1f823를확인했다. 스크립트·로그·receipts10개는불변이며추가시험/내용drop은없다. 첫2실패도보존하며초기과도한‘producer ref전체불변’기대는반증됐다고기록했다.
- **준비된 문서/근거:** `docs/memory-and-sessions.md`에 단순v1·실험단계·최소호환접점을 추가해 이번 문서 출하에 포함한다. SIMPLE-RULE r2 SHA `4591159f…ea7b64`와replicate62–86/manifest63–75,137–164를 직접 읽었다. .git raw복제/장부유입·미취득 처리와별도읽기위치는 운영전필수접점이다. 기본구성에서.jsonl annex객체장부유입가설은재현안됨·.git순회배제는필요,local get은producer내부ref를변경하되main/원문v2는보존,옛C1객체도unused로분류됨을관측했다. 초기운영안은drop/dropunused·자동내용정리를넣지않는다. replica/실코퍼스성능·hook실제호출·get자동hash검증은미측정. annex는 선택됐지만 실코퍼스 활성화·운영 이행은 아직 없다.

# LEDGER — 초기 확장 설계 (위 v1 범위로 대체, 필수조건 아님)

- **GLG 11:59 집중 지시:** 각 집은 자기 이슈 브랜치에서 기존 실무 Opus와 진행하고, 어느 정도 정리된 뒤 공유한다. 이 집은 #32의 보관·신뢰 정책에 집중한다. 기존 Opus `20261024T115350-754cad`의 현재 exact cwd/receiver=active를 확인해 설계 결정표·공식 근거 읽기를 요청했다. 모델 연구 때의 Andenken 직접 보고와 달리 이 역할의 보고/질문은 이 집으로 모으고, 집 간 공유는 다음 checkpoint에 한다. 12:09 결정표 초안을 직접 읽고SHA `aed1c006c297c2aa14c01f48ccac0947b8c0c922287de151959a21e3248c63c0`를 대조했다(private `opus-754cad/DESIGN-TABLE.md`). prefix 재구성 가능성과 backend의 실물 보존량, 커밋/봉인 시각과 내용 포함 증명, signer 통제와 인간 검토, 반재생의 독립 최신 앵커를 구별하도록 수선을 요청했다. 봉인본 복구 가능성은 기본 요구로 두고 최신본만 보관하는 최적화는 미검증 제안으로 내린다. 12:14 v2를 직접 완독하고SHA `852f44ed172df0d1b778cf70e000867ceb52ff9e232a126f8e2c527c2851baf3`도 대조해 수선 반영을 확인했다(v1 별도 보존). 봉인 단위/보증 주체·범위/backend의 독립 선택지가 다음 GLG 논의의 출발안이다. 대화가 계속 살아 있음과 확보된 artifact가 닫힌 고정본임은 구별하며 새 live durable 접근을 허용하지 않는다. GLG 판단 전 채택·코드·원본/키/DB·실험은 없다. 공개/다른 집 공유는 아직 하지 않는다.

- **목적:** 커밋의 garden ID에서 돌아간 형제가 정확히 어떤 시점의 세션 정본을 읽는지와 검증 근거를 알 수 있게 한다. 주소/귀속 주장·내용 무결성·신뢰 앵커·최신성/완전성·가용성을 분리한다.
- **다음 한 걸음:** 아래 소유/결정표를 Andenken 코디와 맞춘 뒤, GLG에게 봉인 단위와 신뢰 앵커의 선택지를 제시한다. 지금은 기존 원천/문서로 설계하며 추가 corpus scan이나 실제 키/저장 설정을 시작하지 않는다.
- **검증 기준:** 정상 append, 미취득 객체, 실제 누락, 내용 불일치, 신뢰 미확인, 옛 유효 snapshot을 구별할 수 있어야 한다. 검증한 bytes와 reader가 읽는 bytes가 같아야 한다. 원문 좌표는 특정 보존본과 범위에 고정한다.
- **별도 레인:** Andenken의 내용 선별·묶음/청크·검색 품질·전량 재임베딩 준비를 이 집이 대신하지 않는다. GLG는 전량 재임베딩 의도를 밝혔지만 이 문서의 push가 유료 실행이나 데이터 삭제 승인은 아니다.
- **이번 출하 범위:** 이 브랜치 NEXT 한 파일. main의 미커밋 진행 메모는 로컬 비공개 `.agent-reports/20261102-session-integrity/main-NEXT-before-branch.md`와 diff/hash로 보존했고 root NEXT는 base와 같게 유지했다. 다른 레인 메모를 이 출하에 섞거나 기존 이력을 지우지 않는다.

## 역할 — 정책과 구현 위치를 구별한다

| 범위 | 담당 | 이번에 정할 것 / 경계 |
|---|---|---|
| 정본 custody·봉인/세대·신뢰/읽기 정책 | agent-config #32 | 보증 범위, legacy/append/replay, 승인·키 경계, 보관/복구·비공개 기준. 새 하네스나 identity registry를 만들지 않는다 |
| 수집/manifest·원문 locator·excerpt·검색 표현 | Andenken #18 | 특정 revision/content key·indexed range와 확인 receipt를 연결한다. 내용 선별/귀속·chunking·질적 회수·DB/재생성·전환 예산은 그 레인 |
| garden ↔ native identity 연결 | Entwurf | 기존 owner 사실/관측 근거를 사용한다. archive의 당시 증거 보존과 현재 identity SSOT를 혼동하지 않는다. 새 API/구현 필요성은 미판정 |
| 도구·host/remote 저장 공급 | nixos-config | 선언과 실제 활성화를 구분한다. 설치/키/remote 변경은 해당 owner와 별도 승인 |
| source-ready·검증 상태·복구→reader 경계 | #32 + #18 공동 | 저장 형태와 reader 실체를 분리하고 같은 의미로 표시한다. 수집/봉인/materialization 코드의 실제 배치 위치는 계약 후 지정 |
| 최종 채택·키/공개/운영·재생성 승인 | GLG | 구현·push·모델 실행·데이터 이행 승인을 서로 대체하지 않는다 |

agent-config 담당 `20261007T104525-12d0ca`와 Andenken 코디 `20261015T113054-877f91`가 조율한다. 그 코디는 11:52 KST 회신에서 위 분담과 5단계에 동의했고, [역할 조율 댓글](https://github.com/junghan0611/agent-config/issues/32#issuecomment-6567918206)에 근거·확약 범위를 보존했다. 새 schema/backend/프로토콜 채택은 아니다. 다른 형제에게 실무를 새로 배분하지 않는다. 양쪽의 표시/반환 상태는 하나의 의미 계약으로 맞추며 별도 필드 사전을 발명하지 않는다.

## 2단계 TODO — 먼저 내려야 할 결정

- [ ] **방어 범위:** 우발 손상/잘못된 identity 연결/불완전 수집/옛 유효본 재생/같은 권한에 의한 의도적 변조 중 이번에 보증할 것과 미보증할 것을 적는다.
- [ ] **봉인/인용 단위(첫 공동 결정):** 수집된 불변 artifact revision/content key와 내부 JSONL line 또는 승인된 durable conversation/entry를 출발 후보로 검토한다. 동적 JSONL의 snapshot/세대/구간과 append 관계를 정하고 live durable DB는 임의 수집하지 않는다.
- [ ] **신뢰 앵커:** 누가 수집/연결을 확인하고 무엇에 서명/승인하는가. 검증자가 신뢰할 공개키/기준점, 키 접근·회전/폐기·복구와 기존 미봉인 자료의 상태를 정한다. 같은 권한으로 키도 쓸 수 있다면 그 권한의 위조까지 막는다고 주장하지 않는다.
- [ ] **최소 원문 참조:** garden/native 연결의 당시 근거, 보존 artifact revision/key/hash·크기·원문 범위, 수집/봉인 receipt, 검증 주체/시점이 어디서 오고 누가 쓰는지 정한다. 필드명/새 포맷은 아직 미채택이다.
- [ ] **reader 상태표:** hash 일치/불일치, identity 미검증, legacy 미봉인, 미취득, 실제 누락, 인용된 옛 revision/최신성 미확인을 분리한다. 단일 trusted bool로 축약하지 않는다.
- [ ] **내용 준비/실패 정책(둘째 공동 결정):** 누가 어떤 승인 아래 객체를 가져와 어떤 검증된 실체를 reader에 건네는지 읽기/색인 각각에 정한다. 미취득을 삭제/orphan/재생성 대상 누락으로 오인하지 않고 API-0/DB-0/network-0 readback을 무단 get으로 바꾸지 않는다. 미봉인 legacy도 자동 전량 제외하지 않으며 mismatch를 최신본으로 조용히 대체하지 않는다.
- [ ] **재생성 입력 고정:** 입력 멤버십·revision과 materialization 책임을 정한다. index writer lock이 원본 동결을 증명하지 않으며 누락 분모는 명시적 불완전 상태로 반환한다.

## 3단계 TODO — 같은 요구로 backend 비교

- [ ] 일반 Git / Git LFS / git-annex를 내용 hash·세대 보관·증분 저장비·독립 사본·원격 비용/비공개·복구·운영 부담으로 비교한다. Git에 pointer를 push한 것과 내용 객체 보관은 별개다.
- [ ] 정상/피크 예산과 불변 정본·가변 수집 사본·요약/정제 파생본의 수명주기를 분리한다. 어떤 사본도 새로 안전성이 입증되기 전에 drop하지 않는다.
- [ ] symlink/없는 객체·unlock/materialization이 기존 discovery/stat·manifest·excerpt와 어떻게 공존하는지 계약을 정한다. durable reader 거절 경계를 우회하지 않는다.
- [ ] backend 채택과 실제 코드/도구 위치·backend 통합 fixture를 맞춘다. backend 선택은 Andenken의 독립적인 입장 정책 설계/합성 fixture 준비 전체를 막는 조건이 아니다. 원본 참조·내용 준비 최소 계약은 production 전량 재생성 전에 합의한다. annex의 trust/numcopies 설정은 작성자 인증이 아니다.

## 4–5단계 TODO — 승인 전 실행하지 않는다

- [ ] 비민감 fixture: 정상 원문/1byte 변경/가짜 identity 연결/신뢰하지 않는 서명자/옛 유효본/정상 append/미취득·실누락을 구별한다. 네트워크·키·출력·실행 범위를 먼저 검수한다.
- [ ] 검증 결과와 실제 읽은 bytes의 일치, 고정 revision의 원문 좌표, 실패/미확인 상태가 숨겨지지 않는지 확인한다. 성능·메모리/대상 크기는 별도 계측한다.
- [ ] 승인된 작은 실제 입장·복구를 검증한 뒤 독립 사본과 롤백 기준을 확인한다. 초기 과거 파일의 봉인은 그 전 역사까지 소급 인증하지 않는다.
- [ ] Andenken #18의 full rebuild 전 source-ready 분모·원문 readback·verification receipt를 맞춘다. 그쪽 semantic 정책과 이쪽 custody 보증을 동일 검사로 대체하지 않는다.
- [ ] 운영 이행은 승인된 한 실행자/정확 범위·비용/시간·피크/복구·publish 계획으로 진행한다. 원문 공개·대량 push·이전 표현/사본 폐기는 각각 별도 판단이다.

# 읽을 원천과 확인 상태

- [#32 본문](https://github.com/junghan0611/agent-config/issues/32)과 [연계 댓글](https://github.com/junghan0611/agent-config/issues/32#issuecomment-6567773350): 이 집이 작성하고 게시 결과를 확인했다. 댓글이 정정/결정을 담으면 본문과의 차이를 함께 설명한다.
- [공개 원석](https://wikidocs.net/blog/@junghanacs/35242/): GLG가 제공한 커밋 garden ID의 의미. 전체 개인 저널을 공개하거나 가져오지 않는다.
- [Andenken #18 branch NEXT @552efa0](https://github.com/junghan0611/andenken/blob/552efa0bf5221ef57cd8e2226c49dd7a674e7cb5/NEXT--issue_18-session-footprint.md): GitHub에서 직접 읽었고 이 커밋은 문서113줄 추가뿐이다. #15는 닫힌 durable 통합 이슈이며 이번 레인과 다르다.
- Nix 로컬 `users/junghan/home-manager.nix:93–94`, `NEXT.md:75–81`을 직접 읽어 annex/LFS 선언과 배치/manifest/reader 후속 설계를 확인했다. 실제 host activation·annex 운영 전환은 미측정이다.
- [annex 구조](https://git-annex.branchable.com/how_it_works/) / [fsck](https://git-annex.branchable.com/git-annex-fsck/): 내용은 Git 외부, 참조/메타는 Git에 저장된다. key backend를 명시해야 한다. fsck는 수정/원격 다운로드가 가능하므로 단순 읽기 검증으로 실행하지 않는다.
- [LFS pointer](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage): sha256 OID/크기를 보관한다. [Git 서명](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work): 신뢰하는 signer의 signature 검증과 내용/귀속의 진실을 구별한다. 문서 읽기이며 운영 검증 결과가 아니다.
- private 로컬 증거는 `.agent-reports/20261102-session-integrity/`에 있다. 원문·private receipt를 이 브랜치에 올리지 않는다. 결정적 공개 근거는 위 링크와 이 문서에 함께 실었다.

# RECENT — 닫힌 관측, 이행 증거 아님

- 기존 열린/닫힌27이슈 조회에서 전용 항목이 없어 #32를 만들고 원격 OPEN/본문 일치를 확인했다. 일반 Git/LFS/annex 어느 것도 채택하지 않았다.
- Andenken 코디의 11:52 회신으로 역할 분담과 5단계 문서 계획을 조율했다. 첫 공동 결정은 불변 원문 인용/봉인 단위와 읽기·색인의 내용 준비/실패 정책이다. 실제 필드/상태 계약과 GLG의 채택은 2단계에 남는다.
- #18의 승인된 한 번 JSONL 관측은3108파일/121739청크. tool-use 서술 제외 후보는99313청크(행-18.42%/문자-5.10%). 1024d 결합 약0.407GB는 순수 float32 벡터 산술이지 현 물리8.7G 예상량·회수 품질 보장이 아니다. peer gross53693청크는 중복/봉투/readback 미검증으로 별도다.
- 모델 조사/수선·관측집계 검수는 완료했다. 현행8B 틀에서 더 선별하는 논의가 우선이며 모델 후보는 보존한다. Sonnet은 GLG가 퇴근시켰고 새 형제/재개를 하지 않는다.

# 권한·마감

GLG는 이슈 브랜치·branch NEXT 준비와 커밋/푸시·Andenken 조율을 명시 요청했다. 이번 단계는 문서뿐이다. 새 corpus scan/hash 전수검사, Git/annex init/add/drop/fsck·원본 이동/공개, 키 생성/서명 설정, live durable 접근, 유료 API/재임베딩·GC·runtime 수정은 시작하지 않는다. 새 단계는 위 TODO와 승인 범위로 다시 판단한다.

이 브랜치 문서 출하 완료 알림은 이 집이 맡고 Andenken에 중복 DM을 보내지 말아 달라고 전달했다. #18 자체 완료 알림은 그 코디 발신으로 유지한다. 변경 없는 진행 상황마다 알리지 않는다.

병합 전 이슈/지속 문서로 남길 판단을 승격하고 이 임시 branch NEXT를 삭제한다. main의 옛 NEXT나 다른 레인의 오래된 GO를 자동 재개하지 않는다.
