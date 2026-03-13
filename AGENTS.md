# Agent Notes

## Extensions

Pi extensions live in `./pi-extensions`. When working in this repo, add or update extensions there.

### semantic-memory

Session RAG extension using LanceDB + Gemini Embedding 2 (native API) + Jina Rerank.

- Architecture doc: `~/org/botlog/20260312T174622` ("로컬 에이전트 시맨틱 메모리" heading)
- OpenClaw `embeddings-gemini.ts` pattern for native Gemini API (not openai-compatible)
- `memory-lancedb-pro` as design reference only (not runtime dependency)

Key files:
- `pi-extensions/semantic-memory/index.ts` — ExtensionAPI entry, tools, commands
- `pi-extensions/semantic-memory/gemini-embeddings.ts` — Gemini Embed 2 native
- `pi-extensions/semantic-memory/session-indexer.ts` — JSONL → chunks → embeddings
- `pi-extensions/semantic-memory/store.ts` — LanceDB wrapper
- `pi-extensions/semantic-memory/retriever.ts` — hybrid BM25+vector, rerank, decay

## Skills

Skills will migrate from `~/repos/gh/pi-skills` into `./skills/` over time.

## Releases

1. Run `npm version <patch|minor|major>` and verify `package.json` updates.
2. Update `CHANGELOG.md` for the release.
3. Commit the release changes and tag with the same version.
4. Push commits and tags, then publish with `npm publish` if needed.
