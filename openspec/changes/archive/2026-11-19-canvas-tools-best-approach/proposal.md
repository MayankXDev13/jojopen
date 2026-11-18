# Proposal

## Why

Text, pen, arrows/lines, sticky notes, bound text, and eraser feel broken vs Excalidraw (autoResize + bound containers + elbow A*) and tldraw (autoSize + TipTap + normalizedAnchor + draw segments). Users hit commit-jump, un-erasable ink, and un-rebindable arrows. This change brings the best of both into JojoPen.

## What Changes

- Text tool: click = auto-size, drag = fixed-width wrapped; `Enter` = newline, `Cmd/Ctrl+Enter` or `Esc`/click-out = commit; live canvas-measured sizing, no `0.56` estimate.
- Write-inside: double-click shape/sticky/container/arrow-label binds text; container grows to fit, text stays centered (Excalidraw-style).
- Pen/ink: pressure-aware outlined strokes (velocity-simulated for mouse, real `pressure` for pen), streamline + smoothing + thinning, simplify on release, capped points.
- Arrow/line: live `suggestedBinding` highlight, `normalizedAnchor + isExact/isPrecise` + `snap` (tldraw) plus elbow re-route (Excalidraw); drag endpoints/midpoints to re-bind after creation; draggable labels.
- Sticky note: rich plain-text note with auto-grow, align, color; same editor as text.
- Eraser: collision-based erase for shapes, ink, arrows/lines (not bbox-only); temporary `Ctrl`/`E` switch; partial-stroke cut where feasible.

## Capabilities

### New Capabilities

- `bound-text`: text bound inside shapes/containers/arrows that re-centers and grows its container.
- `pen-ink`: pressure-aware freehand ink with streamline/smoothing/thinning and simplification.
- `eraser`: collision-based eraser covering shapes, ink, arrows, text, stickies.
- `sticky-note`: sticky creation, editing, auto-grow and alignment.

### Modified Capabilities

- `board-text-editing`: click-vs-drag creation, Enter/newline/commit contract, arrow-label inline edit.
- `text-autofit`: replace estimated metrics with canvas-measured autoSize/fixed-width.
- `board-connectors`: endpoint bindings with anchors/snap, re-bind editing, label positioning.

## Impact

- `src/components/Canvas.tsx` pointer flows (text/arrow/pen/eraser), `TextEditor.tsx`, `Edges.tsx`, `NodeView.tsx`.
- `src/lib/geometry.ts` (anchors, collision, arrow routing), `src/lib/model.ts` (new fields: `autoSize`, `pressures`, bindings).
- `src/state/actions.ts` (`commitEdit`, `startArrow`, `startPen`, erase).
- No API/cloud changes. Existing boards migrate by defaulting new fields.
