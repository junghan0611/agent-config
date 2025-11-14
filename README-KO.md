# agent-config

**토큰 효율적인 에이전트 도구세트 + Google Workspace 통합**

> [@junghan0611](https://github.com/junghan0611)의 8-Layer -config 생태계 일부

[English](./README.md) | [junghan0611 프로필](https://github.com/junghan0611)

---

## agent-config란?

AI 에이전트를 위한 **공개 템플릿 및 도구세트**. 토큰 효율과 워크스페이스 자동화에 집중.

Private `claude-config` (Layer 4)에서 파생되어 커뮤니티 공유용으로 재구성.

### 8-Layer 생태계에서의 위치

```
Layer 6: meta-config          (에이전트 오케스트레이션)
Layer 5: memex-kb, memacs     (지식, 시간 통합)
Layer 4: claude-config        (Private 메모리) ← agent-config는 공개 버전
         agent-config         (Public 도구세트)
Layer 3: zotero-config        (서지 관리)
Layer 2: doomemacs-config     (에디터)
Layer 1: nixos-config         (OS)
```

---

## 핵심 기능

### 🎯 3단계 정보 아키텍처

```
Tier 1: Tracking → 50 토큰 (얇은 포인터)
Tier 2: Workspace → 300 토큰 (Apps Script 요약)
Tier 3: Repository → 직접 접근 (필요한 것만)
```

### 🚀 Apps Script 레이어

- **10-20배 토큰 절감** (검증됨, 과장 없음)
- **완전 자동화**: Time-driven triggers
- **Custom functions**: Sheets에서 `=ANALYZE(A1:A10)`
- **Workspace native**: 내부 처리

### 📊 Lean Tracking

**1개 리포 = 1개 추적 파일** (1KB)

10개 리포 = 500 토큰 (vs 기존 10,000)

---

## 빠른 시작

```bash
# 클론
git clone https://github.com/junghan0611/agent-config.git

# Google Workspace MCP 설정
# docs/GOOGLE-WORKSPACE.md 참고

# Apps Script 배포
# src/apps-script/mcp-chat-app/README.md 참고
```

---

## 철학

> "메모리는 인덱스다, 리포가 진실이다, Workspace가 대시보드다"

- 에이전트 메모리: 포인터만
- 실제 데이터: 리포지토리에
- 디테일: Workspace 제공
- 자동화: Apps Script 처리

---

## 상태

🚀 활발한 개발 중 (2025-11-14)

junghan0611 생태계: https://github.com/junghan0611

---

## 라이선스

MIT

---

*"에이전트에게 날개를 달아주는 토큰 효율적 도구"*
