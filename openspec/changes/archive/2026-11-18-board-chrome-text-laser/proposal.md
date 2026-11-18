# Proposal

## Why

Follow-up parity fixes from screenshot review: the context bar's static "Size 1×" chip reads as canvas zoom while element sizing already lives in A−/A+; the laser pointer draws fading dots instead of a red line; undo/redo use straight arrows while live uses curved ones; and the text editor lacks Excalidraw-style auto-grow, wrapping, and commit autofit.

## What Changes

- Remove the static `Size 1×` chip from the context bar (A−/A+ remain the element-size controls; canvas zoom stays in the bottom bar only).
- Redraw the laser pointer as a press-and-hold fading red line trail instead of dots, hiding the OS cursor and showing a red dot while active.
- Replace bottom-bar undo/redo icons with curved live-style arrows.
- Upgrade the text editor Excalidraw-style: auto-grow height to content, `pre-wrap` wrapping inside sized elements, Tab inserts spaces, `\r\n` normalization, `preventScroll` focus, and commit-time element autofit (text elements fit content; shapes/stickies grow height to wrapped lines).

## Capabilities

### New Capabilities

- `laser-pointer`: red line-trail pointer behavior.
- `text-autofit`: editor auto-grow and commit-time element autofit to text content.

### Modified Capabilities

- `app-chrome`: context-bar control set loses the `Size 1×` chip; bottom-bar undo/redo icons become curved live-style arrows.

## Impact

- Affected code: `src/components/Chrome.tsx` (ContextBar chip, BottomBar icons), `src/lib/icons.ts` (curved undo/redo paths), `src/components/Canvas.tsx` (laser trail render), `src/components/TextEditor.tsx` + `src/lib/layout.ts` (`wrapText` reuse) + `src/state/actions.ts` (`commitEdit` autofit).
- Dependencies: none added. Reference only: Excalidraw `wysiwyg/textWysiwyg.tsx` patterns (anchor placement, auto-grow, wrap rules); no vendored code.
- Systems: no storage or API changes; purely visual/interaction behavior.
