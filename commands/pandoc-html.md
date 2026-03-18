---
description: Markdown/Org → 구글독스용 HTML 변환 (pandoc)
---

{{input}} 파일을 구글독스용 HTML로 변환해줘.

변환 절차:
1. 파일 확장자 확인 (`.md` → markdown, `.org` → org)
2. pandoc 실행:
   ```bash
   pandoc <파일> -f <포맷> -t html5 -s --wrap=preserve -o <파일>.html
   ```
3. 리스트 줄바꿈 후처리:
   ```bash
   sed -i 's/<li>/\n<li>/g' <파일>.html
   ```
4. 결과 파일 경로 알려줘

파일이 지정되지 않았으면 현재 버퍼 또는 최근 수정 파일을 물어봐.
