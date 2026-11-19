# Design

## Context

`src/components/Canvas.tsx` currently acts as both a React view component and a state machine for all interaction modes. When pointer events occur (`onPointerDown`, `onPointerMove`, `onPointerUp`), execution branches through nested switches checking `S.tool` and `S.drag.mode`. The file has accumulated 1,161 lines of intertwined concerns including:

- Laser point life-cycle & 60fps canvas loop
- Freehand ink capture, pressure smoothing, and shift snapping
- Connector waypoint generation, anchor snapping, and handle re-binding
- Shape drafting and minimum dimension clamping
- Text creation (auto-fit vs dragged fixed-width)
- Marquee selection, element dragging, nesting into frames, and resize handles
- Eraser collision sweeps

Extracting these concerns into a clean controller architecture decouples tool behavior from React rendering lifecycle and makes interaction behavior modular, testable, and maintainable.

## Goals / Non-Goals

**Goals:**

- Define a standard `ToolController` interface with unified hooks for pointer, keyboard, and cursor interactions.
- Extract self-contained tool controllers:
  - `SelectToolController` (marquee, move, handle resize, frame nesting)
  - `PanToolController` (space-drag, middle-click, hand tool)
  - `PenToolController` (ink points, pressure, streamlining, shift snapping)
  - `LaserToolController` (trail tracking, fade loop, dot cursor)
  - `EraserToolController` (sweep collision, element deletion, temp toggle)
  - `ShapeToolController` (geometry creation for rect, ellipse, diamond, cylinder, frame)
  - `ArrowToolController` (connector drafting, snap binding, waypoint handling)
  - `TextToolController` (click vs drag creation, edit trigger)
  - `StickyToolController` (sticky note creation and immediate edit)
- Provide a `ToolDispatcher` or `ToolRegistry` that maps `S.tool` and modifier keys to the appropriate controller.
- Keep `Canvas.tsx` focused on DOM events, viewport transformation, and rendering nodes/edges/overlays.
- Retain complete behavioral and performance parity (no regressions in ink smoothness, laser animation, or connector snapping).

**Non-Goals:**

- Changing element data structures, store schema, or undo/redo mechanisms.
- Changing toolbar UI or keyboard shortcuts.
- Rewriting rendering logic in `NodeView.tsx` or `Edges.tsx`.

## Decisions

### 1. Unified `ToolController` Interface & Context

- **Decision**: Create `src/tools/types.ts` defining:
  ```ts
  export interface ToolContext {
    container: HTMLElement | null;
    toWorld: (screenX: number, screenY: number) => { x: number; y: number };
    beginEdit: (id: string) => void;
    setTool: (tool: string) => void;
  }

  export interface CanvasPointerEvent {
    nativeEvent: PointerEvent | React.PointerEvent;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
    button: number;
    buttons: number;
    shiftKey: boolean;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    pressure?: number;
    pointerId: number;
  }

  export interface ToolController {
    readonly id: string;
    onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void;
    onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): void;
    onPointerUp(e: CanvasPointerEvent, ctx: ToolContext): void;
    onPointerCancel?(e: CanvasPointerEvent, ctx: ToolContext): void;
    onDoubleClick?(e: CanvasPointerEvent, ctx: ToolContext): void;
    getCursor?(e: CanvasPointerEvent, ctx: ToolContext): string | undefined;
  }
  ```
- **Rationale**: Isolates coordinate transformation and DOM quirks from tool calculation. Controllers receive normalized world and screen coordinates.
- **Alternatives Considered**: Passing raw React synthetic events directly. _Rejected_ because pointer capture and global document listeners often pass native `PointerEvent`s during continuous drag.

### 2. Tool Registry and Dispatcher

- **Decision**: Provide a `ToolDispatcher` that maintains tool singletons and resolves the active controller:
  - If Space is held or Middle Mouse is clicked, temporarily delegate to `PanToolController`.
  - If Alt is held while in Pen mode, temporarily delegate to `EraserToolController` (or existing toggle shortcut).
  - Otherwise delegate to the controller registered for `S.tool`.
- **Rationale**: Keeps temporary tool toggling (pan, eraser) centralized in one place without polluting individual controllers.
- **Alternatives Considered**: Each tool handling its own escape/toggle logic. _Rejected_ because modifier-based tool overrides are global canvas invariants.

### 3. Laser Overlay Lifecycle

- **Decision**: The laser overlay canvas and RAF loop can remain attached to a `LaserToolController` instance (or hook), exposing a `mount(canvas: HTMLCanvasElement)` method.
- **Rationale**: The laser requires direct 2D canvas drawing at 60fps for trailing decay. Encapsulating this in `LaserToolController` keeps 100+ lines of canvas 2D logic out of `Canvas.tsx`.

## Risks / Trade-offs

- **[Risk] State Synchronization during continuous drag**: Drag events may continue outside canvas bounds where global window listeners fire.
  - **Mitigation**: The dispatcher supports both React synthetic pointer events and native window `pointermove`/`pointerup` events using the same normalized `CanvasPointerEvent`.
- **[Risk] Regression in subtle interactions (e.g. connector auto-binding or text auto-fit)**:
  - **Mitigation**: Pure copy-and-refactor strategy where existing geometry math, anchor checks, and store mutation code are moved verbatim into their respective controllers before streamlining. Existing harness suites (`docs/harness/suiteA.js`, `suiteB.js`, `suiteC.js`) will verify zero behavioral regressions.

## Migration Plan

1. Create `src/tools/` directory and define `types.ts`, `registry.ts`, and `dispatcher.ts`.
2. Extract tools incrementally:
   - Phase 1: `PanToolController`, `LaserToolController`, `EraserToolController`
   - Phase 2: `PenToolController`, `StickyToolController`, `TextToolController`, `ShapeToolController`
   - Phase 3: `ArrowToolController`, `SelectToolController` (most complex)
3. Rewire `Canvas.tsx` to delegate pointer and cursor queries to `ToolDispatcher`.
4. Run harness suites and verify full canvas interaction parity.
