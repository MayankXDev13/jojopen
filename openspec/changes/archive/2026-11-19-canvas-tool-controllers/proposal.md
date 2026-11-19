# Proposal

## Why

`src/components/Canvas.tsx` (1,161 lines) and `src/state/actions.ts` (1,440 lines) bundle pointer interactions, gestures, and state transitions for over a dozen canvas tools into monolithic event handlers and switch statements. This high coupling makes it difficult to maintain, isolate tool-specific bugs, add new tools, or independently test interaction behaviors.

## What Changes

- Extract canvas tool interactions from `Canvas.tsx` into modular tool controllers implementing a unified `CanvasToolController` interface.
- Implement dedicated tool controllers under `src/tools/`:
  - `SelectToolController`: selection marquee, dragging elements, frame nesting, handle resizing.
  - `PanToolController`: viewport dragging, space-held pan, middle-click pan.
  - `PenToolController`: freehand stroke drawing, smoothing, pressure tracking, Shift-straight line snap.
  - `LaserToolController`: transient laser trails, fade animations, live hover dot cursor.
  - `EraserToolController`: collision-based element deletion with temporary toggle support.
  - `ShapeToolController`: click/drag placement of rectangles, ellipses, diamonds, cylinders, and frames.
  - `ArrowToolController`: connector drafting, waypoint creation, auto/manual anchor snapping, endpoint re-binding.
  - `TextToolController`: auto-size click placement, fixed-width drag creation, label focus handoff.
  - `StickyToolController`: sticky note placement and immediate label editing.
- Introduce a central `ToolRegistry` or controller dispatcher to route canvas pointer events (`down`, `move`, `up`, `cancel`), keyboard events, and cursor queries to the currently active tool.
- Retain `Canvas.tsx` as the pure presentation and viewport orchestration layer (rendering nodes, edges, text editor, overlays, and canvas viewports).

## Capabilities

### New Capabilities

<!-- None: Pure architectural refactor with skip_specs: true -->

### Modified Capabilities

<!-- None: Pure architectural refactor with skip_specs: true -->

## Impact

- **Affected Code**: `src/components/Canvas.tsx`, `src/state/actions.ts`, and new directory `src/tools/`.
- **APIs & Stores**: No changes to `S` store, `sot.ts`, or element models.
- **Dependencies**: No external runtime dependencies introduced.
- **Backwards Compatibility**: 100% preservation of existing tool interactions, keyboard shortcuts, and canvas behavior.
