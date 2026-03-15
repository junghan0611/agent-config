---
name: diskspace
description: "디스크 공간 분석 — 마운트 요약, 디렉토리별 크기, 큰 파일 찾기, NixOS 스토어 분석, 정리 제안. ncdu/du 대신 에이전트 친화적 CLI. Use when disk is full, finding large files, cleanup suggestions, or 'diskspace', '디스크', '용량', '공간', 'storage'."
---

# diskspace v0.1.0 — Agent-Friendly Disk Analyzer

에이전트가 디스크 공간을 빠르게 파악하기 위한 스킬.
`gdu`(Go 병렬 스캔) + `duf` + `fd` + nix 명령 조합.

Script: `{baseDir}/scripts/diskspace.sh`

## Commands

### overview — 마운트 포인트 요약 (즉시)

```bash
{baseDir}/scripts/diskspace.sh overview
```

`duf --json` 기반. 어떤 파티션이 꽉 찼는지 즉시 확인.

### top — 큰 디렉토리 정렬 (10-15초)

```bash
{baseDir}/scripts/diskspace.sh top ~
{baseDir}/scripts/diskspace.sh top ~/repos
{baseDir}/scripts/diskspace.sh top /           # /nix/store 자동 제외
```

`gdu -n -p -c` 사용. du보다 4배 빠름 (Go 병렬 처리).
루트(/) 스캔 시 /nix/store는 자동 제외 — `nix` 서브커맨드로 별도 분석.

### bigfiles — 큰 파일 찾기 (0.5초)

```bash
{baseDir}/scripts/diskspace.sh bigfiles ~               # 기본 100MB 이상
{baseDir}/scripts/diskspace.sh bigfiles ~/repos --min 500M
{baseDir}/scripts/diskspace.sh bigfiles ~ --min 1G
```

`fd --size` 사용. 가장 빠른 서브커맨드.

### nix — NixOS 스토어 분석 (1-15초)

```bash
{baseDir}/scripts/diskspace.sh nix
```

시스템 클로저 크기, store path 수, GC roots, 세대 수, result 심볼릭 링크 등.

### clean — 정리 제안 (즉시)

```bash
{baseDir}/scripts/diskspace.sh clean
```

디스크 사용률, nix 세대, 캐시, 큰 파일 등 종합 분석 후 정리 명령 제안.

## Workflow

1. **"디스크 부족"** → `overview` 먼저 (즉시)
2. **어디가 큰지** → `top PATH` (10-15초)
3. **빠른 승리** → `bigfiles` (0.5초)
4. **NixOS 정리** → `nix` (1-15초)
5. **종합 제안** → `clean` (즉시)

## Dependencies

- `gdu` — Go 병렬 디스크 스캐너 (nixpkgs#gdu)
- `duf` — 마운트 요약 (이미 설치)
- `fd` — 파일 검색 (이미 설치)
- `jq` — JSON 파싱 (이미 설치)
