# NEXT — Atlassian → Plane 이관 (1차 핸드오프)

상태 기준: 2026-06-18 저녁. 작업면은 plane 스킬(`skills/plane/scripts/`).

## 지금 돌고 있는 것 (s3i, 자율 진행)

- **s3i에서 Jira work items 전량 이관 중** — localhost:3388 직격(CF 우회, 빠름).
  - 명령: `migrate_all.py --items-only --skip MAT`
  - 로그: `s3i:/tmp/migrate_items.log`  (확인: `ssh s3i 'tail -30 /tmp/migrate_items.log'`)
  - 순서: TUYA→DEVT→GPRC→GoqualPrj→ITSD→PRJ→LGThinQ→SSVM→GP1(1214,최후)
  - 멱등(external_id) — 중단/재실행 안전.
- s3i에 **pandoc 설치 중**: `ssh s3i 'tail /tmp/pandoc-install.log'`. 끝나면 문서도 s3i로.

## 완료

- 매핑 모델: **Plane 프로젝트 = Jira work items + Confluence pages**(한 프로젝트).
- MAT: work items 84(+부모 80, created_at 백데이트) + pages 29. ✅
- TUYA work items 268. ✅
- 스크립트: jira_to_plane(external_id/created_at/created_by/2-pass parent/429 retry),
  confluence_to_md, md_to_plane_pages, migrate_all 오케스트레이터. 커밋·푸시 완료.
- s3i `API_KEY_RATE_LIMIT=600/minute` 로 상향(plane-api recreate). 60/min→600.

## 다음 한 걸음 (2차)

1. **items-only 완료 확인** → 그다음 **문서**: pandoc 설치 끝나면 s3i에서
   `migrate_all.py --pages-only --skip MAT` (Confluence 스페이스→md→Plane Pages).
2. **⚠️ 원복 필수**: 이관 끝나면 s3i `plane/.env` `API_KEY_RATE_LIMIT=60/minute` 로 되돌리고
   `docker compose up -d api`. (백업: `plane/.env.bak-ratelimit`)
3. s3i agent-config 스크립트는 scp 한 것(미커밋). work 계정이라 push 불가 →
   노트북에서 이미 GitHub push 됨. s3i는 나중에 pull 정리.

## 기능 이슈 (실측)

| 이슈 | 상태 |
|---|---|
| KDMAT 페이지 42→25 누락(body-expand 25 cap 페이지네이션) | ✅ 수정 |
| 동명 페이지 title 매칭으로 병합(템플릿류 데이터 손실) | ⚠️ OPEN — path 포함 dedup 필요 |
| Plane Pages 이미지 깨짐(_assets 로컬경로) | ⚠️ OPEN — asset 업로드(5/min 한도) phase 2 |
| Jira comments/relations/attachments/epic-type | ⚠️ 미구현(부모로 우회) phase 2 |

## 임시물

- `.tmp-confluence-md/` (gitignore) — 추출 md. 커밋 안 함.
- 노트북은 CF 경유라 느림(82/min). 대량은 s3i/localhost 가 정답.
