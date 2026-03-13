# External Packages 관리 정책

## 현황

pi 확장(extension)이 외부 npm 패키지에 의존할 때, 설치 방식과 디스크 비용을 정리한다.

## 문제점

### 1. 서브디렉토리별 node_modules 중복

현재 구조:
```
pi-extensions/
  semantic-memory/
    package.json        ← 여기서 npm install
    node_modules/       ← 192MB (lancedb 178MB)
  future-extension-b/
    package.json
    node_modules/       ← 또 별도 설치?
```

확장이 늘어날수록 각각 `node_modules/`가 생겨서 디스크 낭비가 심해진다.
특히 `@lancedb/lancedb`처럼 **네이티브 바이너리 포함 패키지는 178MB+** 로 크다.

### 2. pi 패키지 자동 설치와의 정합성

pi 문서에 따르면:
- git 소스 패키지는 clone 후 **루트 `package.json`**에 대해 `npm install` 실행
- 서브디렉토리의 `package.json`은 자동 install 대상이 아닐 수 있음
- 현재 루트 `package.json`에는 `peerDependencies`만 있고 `dependencies` 없음

### 3. 디스크 공간 제약

ThinkPad(회사), NUC(개인) 모두 스토리지 여유가 넉넉하지 않음.
같은 패키지가 pi global + 확장별 node_modules에 중복 설치되면 수백MB 낭비.

## 현재 설치된 무거운 패키지

| 패키지 | 위치 | 크기 | 비고 |
|--------|------|------|------|
| `@lancedb/lancedb` | `semantic-memory/node_modules/` | 178MB | 네이티브 바이너리 (linux-x64-gnu) |
| `apache-arrow` | `semantic-memory/node_modules/` | ~14MB | lancedb 의존 |

## 검토 중인 대안

### A. 루트 package.json에 dependencies 통합
```json
// 루트 package.json
"dependencies": {
  "@lancedb/lancedb": "^0.15.0",
  "apache-arrow": "^18.1.0"
}
```
- 장점: pi 자동 install 호환, node_modules 1벌
- 단점: 확장별 의존성 분리 안 됨, 확장이 많아지면 루트가 비대

### B. pnpm workspace로 hoisting
```yaml
# pnpm-workspace.yaml
packages:
  - pi-extensions/*
```
- 장점: 의존성 격리 + hoisting으로 중복 최소화
- 단점: pi가 `npm install`을 호출하므로 pnpm과 충돌 가능성

### C. 서브디렉토리에서 직접 npm install (현재 방식)
- 장점: 당장 동작, 단순
- 단점: 확장마다 중복 설치, 수동 관리

### D. nix로 네이티브 바이너리 관리
- lancedb 같은 무거운 네이티브 패키지를 nix로 빌드/캐시
- 장점: nix store에서 공유, 재현성
- 단점: 패키징 노력 큼

## 결정

- **당분간 C (수동 설치)** 로 운영한다. (2026-03-13)
- 확장이 2개 이상 생기면 A 또는 B로 전환 검토
- 디스크가 심각하게 부족해지면 D 검토

## TODO

- [ ] semantic-memory 외 확장 추가 시 이 문서 업데이트
- [ ] pi의 로컬 패키지 자동 install 동작 정확히 테스트
- [ ] 루트 통합(A) vs pnpm workspace(B) 실험
