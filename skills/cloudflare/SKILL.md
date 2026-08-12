---
name: cloudflare
description: "GLG 개인 Cloudflare 계정을 브라우저 없이 조작 — DNS·Single Redirect·Email Routing·터널 조회, 공개면 검증. aionsclubs.org 를 오라클에서 Tunnel 로 서빙하는 스택의 조작면. 'cloudflare', '클라우드플레어', 'cf', '터널', 'tunnel', 'DNS', 'CNAME', 'redirect', '301', 'email routing', '이메일 포워딩', 'aionsclubs', '도메인'."
user_invocable: true
---

# cloudflare — GLG 개인 계정 조작면

```bash
CF={baseDir}/bin/cf

$CF doctor                    # 토큰·권한 진단. 막히면 여기부터
$CF whoami                    # 계정 / zone
$CF check <host>              # 공개면 검증. 200 만 exit 0
$CF dns ls|add|rm             # add: <name> <type> <content> [--proxied]
$CF tunnel ls                 # 생성은 cloudflared 가 한다
$CF redirect ls|www <apex>    # www.<apex> → <apex> 301 (멱등)
$CF email status|dns|enable|dest <addr>|add <from> <to>|ls
$CF access apps [도메인]       # 공개 사이트엔 앱이 없어야 정상
$CF api <METHOD> <PATH> [BODY]
```

`--yes` 는 사람이 볼 때만. env: `CF_TOKEN_FILE`(기본 `~/.cf-token-glg`) · `CF_ACCOUNT_ID` · `CF_ZONE_NAME`.
동사가 이 문서와 어긋나면 **`bin/cf` 가 정답**. 스택 설계는 denote `20260812T142016`.

## ⚠️ 네 가지

**1. 회사 CLI 가 아니다.** 회사 리포에 있는 동명 CLI 는 사내 zone 전용이고
계정 ID·zone·토큰 경로가 **하드코딩 기본값**이다. 이 CLI 는 토큰에서 발견한다.
🔴 **두 토큰을 섞지 말 것** — 이 스택에서 가장 되돌리기 어려운 사고다.

**2. 터널은 locally-managed 다 — 그래서 `route add` 가 없다.** ingress SSOT 는 로컬 `config.yml`
이고, 라우팅 변경은 git commit 으로 남는다. 사내 쪽 remotely-managed 는 "리포엔 아무것도 안 남아
표를 손으로 갱신" 하는 대가를 치른다. 우리는 안 치른다.

```bash
cloudflared tunnel create <name>
cloudflared tunnel route dns <name> <hostname>
```

**3. 계정 관리 자격증명은 ThinkPad 에만.** `cloudflared login` 이 만드는 `~/.cloudflared/cert.pem`
은 터널을 새로 만들고 DNS 를 붙일 수 있다 — **오라클에 올리지 않는다.** 오라클로 가는 것은
터널 credentials JSON(그 터널 하나만 실행 가능)과 API 토큰뿐이다. API 토큰을 양쪽에 두는 것은
GLG 결정(2026-08-12): 오라클에서 조회가 막히면 작업이 안 되고, 권한이 `Tunnel:Read` + `DNS:Edit`
뿐이라 메일 라우팅·리다이렉트는 애초에 못 건드린다. 권한을 넓힐 때 이 균형을 다시 본다.

**4. 공개 사이트에 Access 를 붙이지 않는다.** 검증 신호가 회사 스택과 반대다 —
`302`(Access 로그인)는 사내 스택에선 정상이지만 여기선 **버그**, `200` 이 정상이다.

## 토큰

`cf doctor` 가 없으면 발급 절차를, 있으면 권한별 probe 를 찍는다.

| 스코프 | 권한 | 용도 | 현재 |
|---|---|---|---|
| Account | Cloudflare Tunnel · Read | `tunnel ls` | ✅ |
| Zone | DNS · Edit | 레코드 | ✅ |
| Zone | Dynamic Redirect · Edit | www 301 | ❌ |
| Zone | Email Routing Rules · Edit | `b@` | ❌ |
| Account | Account Settings · Read | `/accounts` 열거 | ❌ |

저장: `umask 077; echo '<TOKEN>' > ~/.cf-token-glg`
⚠️ **Client IP Filtering 을 비워둘 것**(`9109` 로 전부 막힌다). **R2 화면 토큰은 안 된다**(S3 자격증명).

## 실측 (2026-08-12)

- **`DNS:Edit` 에 `Zone:Read` 가 딸려온다.** zone 발견에 별도 권한 불필요.
- **`/accounts` 열거는 `Account Settings:Read` 가 따로 필요하다.** 없으면 `success:true` 인데
  **빈 배열** 이 온다 — 실패로 안 보인다. 그래서 `doctor` 는 빈 결과를 ⚠️ 로 구분하고,
  계정은 **zone 의 `.account.id` 로 유도**한다(권한 불필요).
- **`redirect` 는 조회 실패를 "규칙 없음" 으로 보지 않는다.** entrypoint PUT 은 통째로 덮어쓰므로,
  진짜 404 만 빈 상태로 인정하고 그 외(403·rate limit·네트워크)는 **중단**한다.
- **Email Routing 은 대시보드가 낫다.** "Add missing records" 버튼이 MX·SPF·DKIM 을 넣고 Locked
  상태로 만든다. 대시보드 커스텀 드롭다운은 자동화에 잘 안 걸린다(권한 행 3개째부터 안 열림).
- **`check` 는 200 만 exit 0** — 배포 스크립트에서 검증에 쓸 수 있다.

## 에이전트에게

- **`doctor` 부터.** 401/403 처럼 보이는 것 대부분은 IP 제한(`9109`)이나 rate limit(`10429`) 이다.
- **`10429` 를 보면 멈춰라.** 재시도로 뚫지 말 것 — 몇 분간 진짜 원인이 가려진다.
- **읽기는 마음껏, 쓰기는 사람에게.** `--yes` 를 스스로 붙이지 말 것.
- 회사 계정 작업이면 이 CLI 를 쓰지 말 것.
