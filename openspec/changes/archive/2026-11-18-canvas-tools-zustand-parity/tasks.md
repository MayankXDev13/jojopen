# Tasks

## 1. Zustand store migration

- [x] 1.1 Add `zustand` via `bun add zustand` and verify `package.json` lists it and `bun run typecheck` passes
- [x] 1.2 Create `src/state/boardStore.ts` with persistent slices (doc/camera/settings/randomMode) + transient pointer slices + narrow selectors and verify `bun run typecheck` passes
- [x] 1.3 Migrate `src/state/actions.ts` and `src/state/commands.ts` from direct `S` mutation to store `set`/`get` and verify `bun run typecheck` passes with no direct `S.` writes remaining in those files
- [x] 1.4 Migrate `App.tsx`, `Canvas.tsx`, `Chrome.tsx`, `TextEditor.tsx`, `NodeView.tsx`, `Edges.tsx`, `Overlays.tsx` to Zustand hooks and verify `bun run build` completes

## 2. Text editing

- [x] 2.1 Fix text-tool click-to-create with immediate inline edit and verify clicking empty board opens the editor and commits text on Enter/blur
- [x] 2.2 Fix click/double-click inside shape/sticky/container to enter label edit and verify committed text persists and Esc discards the draft
- [x] 2.3 Fix empty-commit cleanup and selection restore and verify empty commits remove the element and non-empty commits keep selection

## 3. Line and arrow tools

- [x] 3.1 Fix line/freehand drag with live preview and solid persistent stroke and verify dragged strokes render solid at all zooms without dotted gaps
- [x] 3.2 Fix arrow creation with routing, endpoint anchoring, label edit, and clean detach on delete and verify arrows attach on drop and labels persist across reload

## 4. Sizing and zoom

- [x] 4.1 Fix single-selection resize handles plus context-bar Size steps and verify drags and Size buttons update dimensions as one undoable step
- [x] 4.2 Fix bottom-bar zoom presets (0.75x–2x), Fit, and 100% label reset and verify each updates the viewport and the zoom label shows the rounded percentage

## 5. Random-color mode and visual parity

- [x] 5.1 Implement persistent random-color mode (active styling, persisted flag, toast) with auto-assign on new shapes/arrows and verify mode survives reload and new draws get varied palette colors until toggled off
- [x] 5.2 Restore sticky folded-corner + shadow and solid opaque pen rendering and verify stickies show folds and pen strokes are continuous at 100% zoom
- [x] 5.3 Restore zoom-menu order with current-level mark and palette-row live colors/order and verify against the live screenshots

## 6. Integration checks

- [x] 6.1 Run `bun run typecheck` and verify it passes with no errors
- [x] 6.2 Run `bun run build` and verify it completes and emits `dist/` output
- [x] 6.3 Manually verify in dev (`bun run dev`) text, shape typing, line, arrow, size/zoom, random-mode reload, and sticky/pen parity and verify no uncaught exceptions and `data-act`/`data-tool` hooks still resolve
