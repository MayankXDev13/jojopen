# Tasks

## 1. Chrome parity

- [x] 1.1 Remove the static `Size 1×` chip from ContextBar and verify A−/A+ still scale the selection and no size label remains
- [x] 1.2 Add curved `undo`/`redo` icons to `src/lib/icons.ts`, switch BottomBar to them, and verify `bun run build` completes and the glyphs match the live screenshot

## 2. Laser pointer

- [x] 2.1 Redraw the laser as a red line trail through alive points with fade and verify a screenshot shows a continuous red trail and no board elements are added
- [x] 2.2 Gate the laser on press-and-hold, hide the OS cursor with a red dot while active, and clear on release; verify by CDP screenshot with no board elements added

## 3. Excalidraw-style text

- [x] 3.1 Add editor auto-grow, pre-wrap, Tab-to-spaces, newline normalization, and preventScroll focus and verify typing grows the editor without internal scrollbars
- [x] 3.2 Add commit-time autofit in `commitEdit` using renderer-matched `wrapText` metrics and verify committed text, shape, and sticky elements show every line unclipped

## 4. Integration checks

- [x] 4.1 Run `bun run typecheck` and verify it passes with no errors
- [x] 4.2 Run `bun run build` and verify it completes and emits `dist/` output
- [x] 4.3 Re-run the headless CDP verification (text multiline + Tab, autofit dims, laser trail, undo/redo glyphs, palette/zoom intact) and verify all checks pass with screenshots
