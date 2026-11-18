# Tasks

## 1. Model + measure foundation

- [x] 1.1 Add `autoSize`, `originalText`, `boundId`, `pressures`, `normalizedAnchor/isExact/isPrecise/snap` defaults in `model.ts` + `normalizeDoc` and verify old board loads with defaults
- [x] 1.2 Add shared `measureText/wrapText` canvas util and verify editor sizing matches committed render at 100% and 50% zoom
- [x] 1.3 Document new fields in `FEATURES.md` delta and verify docs build/typecheck passes

## 2. Text tool (tldraw best)

- [x] 2.1 Implement click=autoSize vs drag>36px=fixed-width creation in `Canvas.tsx` and verify both modes create and enter edit
- [x] 2.2 Switch `TextEditor` to Enter=newline, Cmd/Ctrl+Enter/Esc/outside=commit and verify multiline typing + commit
- [x] 2.3 Wire live measured grow + zoom-aware max wrap + edge-drag to fixed-width and verify no commit jump

## 3. Write-inside / bound text (Excalidraw best)

- [x] 3.1 Implement double-click/Enter direct label editing for shapes/containers/stickies/arrows plus empty-canvas double-click to text and verify editing opens selected
- [x] 3.2 Implement grow-only shape autofit (width to longest word, height to wrapped lines, grid-quantized) and verify long labels grow the box

## 4. Pen ink (tldraw best)

- [x] 4.1 Capture pressure (real + velocity-simulated) with streamline/smoothing/thinning outline rendering and verify smooth thick-thin strokes
- [x] 4.2 Add Shift 15deg straight segments + simplify on release + point cap and verify long strokes stay small with no visual jump
- [x] 4.3 Keep strokes open with no auto-close or fill like the original and verify near-loops stay open outlines

## 5. Arrows/lines (tie)

- [x] 5.1 Add suggestedBinding highlight + anchor/snap bindings on release and verify hover highlights and persists
- [x] 5.2 Add endpoint/midpoint drag re-bind + elbow re-route + draggable labels and verify re-bind and label follow path
- [x] 5.3 Keep delete-detach clean and verify no orphans after delete/undo

## 6. Sticky + eraser

- [x] 6.1 Implement sticky create/edit/auto-grow/align and verify note grows taller
- [x] 6.2 Implement collision eraser for shapes/ink/arrows/text + Ctrl-temp mode and verify ink and arrows erase by crossing

## 7. Integration

- [x] 7.1 Run `bun run typecheck` + harness record/replay/export smoke and verify 0 errors
- [x] 7.2 Update board demo on JojoPen MCP board and verify preview shows winners diagram clean
