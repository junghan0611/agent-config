---
description: Markdown/Org → 구글독스 변환 (HTML 또는 DOCX)
---

{{input}} 파일을 구글독스에 붙여넣을 수 있게 변환해줘.

## 방법 1: HTML (빠름, 브라우저 복붙)

```bash
cd ~/repos/gh/memex-kb
python scripts/md_to_gdocs_html.py <파일> --open
# → /tmp/<파일>-gdocs.html 브라우저 열림 → Ctrl+A → Ctrl+C → Google Docs Ctrl+V
```

## 방법 2: DOCX (Org 경유, 스타일 적용)

```bash
cd ~/repos/gh/memex-kb
python scripts/md_to_gdocs.py <파일> --open
# → /tmp/<파일>.docx LibreOffice 열림 → Ctrl+A → Ctrl+C → Google Docs Ctrl+V

# 단계별
python scripts/md_to_gdocs.py <파일> --step org --keep   # Org까지만
python scripts/md_to_gdocs.py <파일> --step odt --keep   # ODT까지만
```

## 방법 3: pandoc 직접 (memex-kb 없이)

```bash
pandoc <파일> -f markdown -t html5 -s --wrap=preserve -o <파일>.html
sed -i 's/<li>/\n<li>/g' <파일>.html
```

기본은 방법 1(HTML). 스타일이 필요하면 방법 2(DOCX). memex-kb가 없으면 방법 3.
