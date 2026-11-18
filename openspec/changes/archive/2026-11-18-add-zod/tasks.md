# Tasks

## 1. Dependency setup

- [ ] 1.1 Add `zod@^4` via `bun add zod` and verify `package.json` lists zod and `bun install` succeeds
- [ ] 1.2 Verify `bun run typecheck` still passes with the new dependency before code changes

## 2. Schema module

- [ ] 2.1 Create `src/lib/schemas.ts` with Zod v4 schemas for BoardSettings, BoardElement (permissive core + passthrough), BoardDoc, Recording, boards-list entry, and AIConfig, and verify `bun run typecheck` passes
- [ ] 2.2 Export `safeParse` helpers (`parseBoardDoc`, `parseBoardsList`, `parseAIConfig`) that return typed fallbacks on failure and verify with a bun one-liner parsing valid plus corrupt fixtures without throwing
- [ ] 2.3 Cover `seedDemo()` round-trip (stringify then `parseBoardDoc`) and verify it validates successfully via a bun one-liner

## 3. Hydration rewiring

- [ ] 3.1 Rewire `normalizeDoc` in `src/lib/model.ts` to use the Zod schemas for defaults and verify existing valid docs normalize identically plus corrupt settings fall back per-field
- [ ] 3.2 Rewire `loadDoc`, hash-copy branch, and `boardsList` in `src/state/store.ts` to `safeParse` with `console.warn` + fallback and verify corrupt/missing payloads boot to fallback without throwing
- [ ] 3.3 Rewire `loadAIConfig` in `src/lib/ai.ts` to `safeParse` with unknown-field stripping and defaults and verify partial and corrupt configs resolve to expected values
- [ ] 3.4 Confirm `bootStore`/`persist`/`saveBoardCopy` flow preserves `board-bootstrap` behavior (first-run demo seed, live import read-only, edits persist) and verify by booting with empty, valid, and corrupt `localStorage` fixtures

## 4. Integration checks

- [ ] 4.1 Run `bun run typecheck` and verify it passes with no errors
- [ ] 4.2 Run `bun run build` and verify it completes and emits `dist/` output
- [ ] 4.3 Manually verify boot in dev (`bun run dev`) with valid, corrupt, and empty storage across current doc, `#/b/<id>` link, boards list, and AI config, and verify no uncaught exceptions and correct fallbacks
