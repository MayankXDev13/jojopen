# Proposal

## Why

Loading persisted boards, board lists, and AI config from `localStorage` currently uses bare `JSON.parse` with try/catch fallbacks (`loadDoc`, `boardsList`, `loadAIConfig`) plus a loose `normalizeDoc` merge. Corrupt, truncated, or schema-drifted payloads can silently produce half-valid docs that break rendering or overwrite good state on the next `persist()`.

## What Changes

- Add `zod` v4 as a runtime dependency and a shared schema module for persisted state.
- Define strict Zod v4 schemas for `BoardDoc`, `BoardSettings`, `BoardElement`, `Recording`, boards-list entries, and `AIConfig` with safe defaults and stripping of unknown keys.
- Validate on every hydration path (`loadDoc`, hash board copy, `boardsList`, `loadAIConfig`, per-board copy in `saveBoardCopy`/`bootStore`) using `safeParse`; fall back to `blankDoc()` / `{}` / `[]` on failure and never throw to the boot path.
- Route `normalizeDoc` through the schemas so defaults come from one source of truth instead of ad-hoc spreads.
- Log validation failures with a `console.warn` including flattened issues to aid debugging without breaking boot.

## Capabilities

### New Capabilities

- `board-persistence`: durable guarantees for loading, validating, and falling back persisted board state (current doc, per-board copies, boards list, AI config) using Zod v4 schemas.

### Modified Capabilities

- None. `board-bootstrap` describes first-run/demo seeding behavior which this change preserves; validation only hardens the load path underneath it.

## Impact

- Affected code: `src/state/store.ts` (`loadDoc`, `boardsList`, `bootStore`, `normalizeDoc` usage), `src/lib/model.ts` (`normalizeDoc`, `blankDoc`, `DEFAULT_SETTINGS`), `src/lib/ai.ts` (`loadAIConfig`), `src/lib/firstRun.ts` (live import path).
- Dependencies: adds `zod@^4` runtime dependency via bun (`bun add zod`). No API or network changes.
- Systems: `localStorage` keys `jojopen.doc.v1`, `jojopen.boards.v1`, `jojopen.current.v1`, `jojopen.board.<id>`, `jojopen.ai.v1`. Behavior change is limited to corrupt/incompatible payloads now deterministically falling back instead of partially hydrating.
