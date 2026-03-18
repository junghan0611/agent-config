---
description: Markdown/Org → 구글독스 변환 (HTML 추천 또는 DOCX)
---

{{input}} 파일을 구글독스에 붙여넣을 수 있게 변환해줘.

## ★ 추천: HTML (원커맨드, 최고 품질)

```bash
cd ~/repos/gh/memex-kb
./run.sh md-to-gdocs-html <파일> --open
# → 브라우저 열림 → Ctrl+A → Ctrl+C → Google Docs Ctrl+V
```

경로: MD → Org → HTML (inline style). 서식 완벽 보존.

## 대안: DOCX (LibreOffice 경유)

```bash
cd ~/repos/gh/memex-kb
./run.sh md-to-gdocs <파일> --open
# → LibreOffice 열림 → Ctrl+A → Ctrl+C → Google Docs Ctrl+V
```

경로: MD → Org → ODT → DOCX. 스타일 적용 가능, 단계별 `--step org|odt|docx --keep`.

기본은 HTML. DOCX는 세밀한 스타일이 필요할 때만.
