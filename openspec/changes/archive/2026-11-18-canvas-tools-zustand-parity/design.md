# Design

## Context

See `proposal.md` (Why) for motivation. Current state:

- `src/state/store.ts` exports mutable singleton `S: any` plus `subscribe`/`getVersion`/`notify`/`scheduleNotify`; `App.tsx` uses `useSyncExternalStore(subscribe, getVersion)`.
- `src/state/actions.ts` mutates `S` directly (`randomColors` repaints all, no persistent mode; `bumpText` only handles `type === 'text'`).
- `src/components/Canvas.tsx` gates pointer handling on `S.editingId`, creates text/freehand via `MAKE`, excludes `arrow`/`freehand` from resize; `TextEditor.tsx` reads `S.editingId`.
- `src/components/Edges.tsx` renders freehand/arrow strokes; screenshots show dotted/faint vs live solid.
- Sticky renders flat (no fold/shadow); bottom-bar zoom shows presets 0.75x–2x in live vs different local row.
- No `zustand` dependency; bundler Vite, `bun@1.4.0`.

Constraints: `localStorage` board JSON shape unchanged; `board-bootstrap` first-run/demo flow preserved; boot never throws; `data-act`/`data-tool` hooks stable (per `app-chrome`).

## Goals / Non-Goals

**Goals:**

- Zustand store with the same observable behavior the specs require; transient pointer/drag state never persisted.
- Text/line/arrow/size/random-mode all respond per specs with undo + persist.
- Live visual parity for sticky, pen stroke, zoom menu, palette row.

**Non-Goals:**

- No schema migration or collaboration/multiplayer; no new export formats.
- No AI/network changes; no DSL/layout changes.
- No recovery UI for corrupt data (owned by `add-zod` change).

## Decisions

- **Zustand single store with slices + `persist` middleware (partialize) over keeping `S` or Redux.**
  Rationale: smallest migration from singleton shape; selectors avoid full-tree rerenders that `useSyncExternalStore(version)` causes; `persist` handles doc/settings/randomMode/zoom prefs. Alternative (multiple stores) rejected — cross-slice actions (select+edit+persist) would need cross-store sync. Alternative (keep `S`) rejected per user requirement.
- **Split persistent vs transient: `doc/camera/settings/ui-prefs` persisted; `drag/marquee/selection-set/pointer` transient.**
  Rationale: prevents pointer state polluting storage and avoids persisting `Set`/`AbortController` objects. Selection stored as array in state, exposed as `Set` via selector for compatibility.
- **Compat shim during migration: keep `S`-shaped selectors (`useDoc`, `useCamera`) plus codemod of direct `S.x =` to `set` actions.**
  Rationale: ~13 components import `S`; shim lets migration land file-by-file. Direct mutation banned after cutover (lint note in tasks).
- **Text editing stays in `TextEditor` + `editingId` + `commitEdit`, extended to shape/sticky/container labels.**
  Rationale: preserves existing commit path (`arrow.label`, `text.text`, `sticky.text`, else `label`); adds dblclick/Enter-to-edit entry from `Canvas` hit-test. Alternative (contentEditable per node) rejected — breaks viewport zoom scaling.
- **Connectors fixed at pointer + render layers: `Canvas` creates `freehand`/`arrow` with `points`, `Edges` renders solid `strokeLinecap/Linejoin=round` with element `strokeWidth`/`color`.**
  Rationale: dotted/faint artifacts come from hit-stroke overlay leaking into paint stroke and missing color binding; fix keeps wide transparent hit path separate from visible path.
- **Sizing via overlay handles + existing `zoomAt`/`setZoom`/`fitAll`; `Size` control steps dimensions, zoom presets call `setZoom`.**
  Rationale: reuses tested viewport math; resize writes through `pushHistory`+`persist` like other edits.
- **Random mode as `settings.randomMode: boolean` + `addElement` hook assigning `COLOR_KEYS` entry with `colorLocked=true`.**
  Rationale: one flag covers persistence, active styling, and auto-apply; repaint-all preserved on activation for parity with existing spec.

## Risks / Trade-offs

- [Risk] Every `S.` import breaks during migration → Mitigation: shim + migrate components in dependency order (store → actions/commands → Canvas/Chrome → rest), `typecheck` after each group.
- [Risk] Zustand selector over-subscription causes canvas jank → Mitigation: select narrow slices (`useCamera`, `useSelectionIds`); keep high-frequency drag in refs + transient store, `notify` only on commit.
- [Risk] Persisted shape change drops user boards → Mitigation: JSON shape unchanged, only wrapper changes; `normalizeDoc`/`blankDoc` reused; corrupt fallback preserved.
- [Risk] Arrow anchoring regressions → Mitigation: reuse `arrowGeom`/`pointInElement`; detach (not delete) on element removal, covered by spec scenario.

## Migration Plan

1. `bun add zustand`.
2. Add `src/state/boardStore.ts` (Zustand slices, persist partialize, selectors, compat exports).
3. Migrate `actions.ts`/`commands.ts` to `set`/`get`; port `randomColors` to persistent mode + auto-apply.
4. Migrate `Canvas`, `TextEditor`, `NodeView`, `Edges`, `Chrome`, `Overlays` to hooks; fix text/line/arrow/resize handlers.
5. Restore sticky/pen/zoom/palette CSS + Chrome menu order.
6. Verify: `bun run typecheck`, `bun run build`, manual parity checks against screenshots (text, shape typing, line, arrow, size presets, random-mode reload).
7. Rollback: revert store + component commits; storage JSON unchanged so no data rollback needed.
