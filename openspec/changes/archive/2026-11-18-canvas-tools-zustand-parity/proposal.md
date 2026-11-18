# Proposal

## Why

The local board diverges from jojopen.com for core creation tools: text (on board and inside shapes), line/freehand, arrow, and Size/resize do not work, and Random colors is a one-shot repaint instead of a persistent active mode. Sticky, pen stroke, and zoom/palette visuals also miss live-site parity. State still lives in a mutable singleton `S` instead of Zustand.

## What Changes

- Migrate app state from mutable singleton `S` + `subscribe`/`notify` in `src/state/store.ts` to Zustand (persistent doc/camera/settings slices; transient pointer/drag state kept outside persistence).
- Fix text tool: click-empty-board creates editable text; click/double-click inside shape enters in-place edit; Enter commits, Esc cancels, empty commit removes.
- Fix line/freehand: drag draws a solid continuous stroke with live preview; stroke persists with correct width/color.
- Fix arrow: drag creates anchored arrow with routing (orthogonal/curved/straight), selectable/label-editable, deletable without orphans.
- Fix Size: selection resize handles + context-bar Size control + bottom-bar zoom presets (0.75x–2x), Fit, and 100% reset all update viewport/selection.
- Make Random colors a persistent mode: activating locks in an active state (persisted), toast + active styling, and every newly drawn shape/arrow auto-gets a palette color until toggled off; existing repaint-all behavior preserved as one undoable step.
- Restore live visual parity: sticky folded-corner + shadow, pen solid stroke (no dotted/faint), zoom menu and color-palette row matching live order/styling.
- **BREAKING**: `src/state/store.ts` exports change shape (`S`, `subscribe`, `getVersion`, `notify`/`scheduleNotify` replaced by Zustand hooks); components must migrate.

## Capabilities

### New Capabilities

- `board-text-editing`: text creation on board and in-place typing inside shapes.
- `board-connectors`: line/freehand drawing and arrow creation/editing.
- `board-sizing`: element resize handles, Size control, and zoom presets/Fit/reset.
- `board-random-color`: persistent random-color mode that auto-applies to new shapes.

### Modified Capabilities

- `canvas-appearance`: sticky folded-corner + shadow, solid freehand stroke rendering, zoom/palette visual parity; extends random-colors repaint with persistent mode visuals.

## Impact

- Affected code: `src/state/store.ts`, `src/state/actions.ts`, `src/state/commands.ts`, `src/components/Canvas.tsx`, `NodeView.tsx`, `Edges.tsx`, `TextEditor.tsx`, `Chrome.tsx`, `Overlays.tsx`, `src/styles/*`, `src/lib/geometry.ts`, `src/lib/palette.ts`.
- Dependencies: adds `zustand`; no API/network changes.
- Systems: `localStorage` board keys unchanged in shape; adds persisted UI prefs (random-mode active, zoom) alongside existing doc/settings.
