# Tasks

## 1. Tool Framework Scaffolding

- [x] 1.1 Create `src/tools/types.ts` defining `ToolController`, `CanvasPointerEvent`, and `ToolContext` interfaces; verify TypeScript compiles cleanly.

- [x] 1.2 Implement `src/tools/dispatcher.ts` and `src/tools/registry.ts` to manage controller registration and resolve active tool based on `S.tool` and modifier keys (Space, Middle-Click, Alt); verify unit imports resolve.


## 2. Navigation and Transient Interaction Tools

- [x] 2.1 Implement `src/tools/PanToolController.ts` extracting viewport drag, middle-mouse pan, and hand-tool panning; verify panning moves `S.pan` smoothly.

- [x] 2.2 Implement `src/tools/LaserToolController.ts` extracting laser canvas overlay management, 60fps trail fade RAF loop, and dot cursor; verify laser drawing and timeout behavior.

- [x] 2.3 Implement `src/tools/EraserToolController.ts` extracting sweep collision detection and deletion of hit elements; verify drag-to-erase removes shapes and strokes.


## 3. Drawing and Content Creation Tools

- [x] 3.1 Implement `src/tools/PenToolController.ts` extracting ink stroke points collection, pressure tracking, streamlining, and Shift-key angle snapping; verify freehand path creation.

- [x] 3.2 Implement `src/tools/ShapeToolController.ts` extracting rectangle, ellipse, diamond, cylinder, and frame drag-creation with minimum dimension clamping; verify shape generation.

- [x] 3.3 Implement `src/tools/StickyToolController.ts` and `src/tools/TextToolController.ts` extracting sticky placement and text click-vs-drag auto-sizing followed by immediate label focus; verify text editor handoff.


## 4. Connector and Selection Controllers

- [x] 4.1 Implement `src/tools/ArrowToolController.ts` extracting connector drafting, waypoint creation, element anchor snapping, and handle re-binding; verify arrow attachment and routing.

- [x] 4.2 Implement `src/tools/SelectToolController.ts` extracting marquee box selection, multi-element dragging, frame reparenting, and resize handles; verify selection transformations.


## 5. Canvas Rewiring and Parity Verification

- [x] 5.1 Rewire `src/components/Canvas.tsx` to delegate pointer events, double click, and cursor lookups to `ToolDispatcher`, reducing `Canvas.tsx` complexity; verify clean build with `bun run build`.

- [x] 5.2 Execute test harnesses (`docs/harness/suiteA.js`, `suiteB.js`) to confirm zero regressions in canvas tool interactions and visual parity.


## Workflow follow-up

- Archive the change after review and implementation are verified.
