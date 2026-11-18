# Design

## Context

See `proposal.md` (Why). Current state:
- `Chrome.tsx` ContextBar renders A−/A+ plus a static `Size 1×` chip; bottom bar uses `backward`/`forward` icons (straight `M12 21V7…` / `M12 3v14…` in `lib/icons.ts`).
- `Canvas.tsx` laser draws fading circles (`arc`, `rgba(240,86,86,…)`) on the `#laser` overlay canvas.
- `TextEditor.tsx` is a fixed-size textarea (no auto-grow, no Tab handling, no normalization); `commitEdit` in `actions.ts` never resizes; renderers clip overflow (`.lbl` has `overflow:hidden`).
- Metrics available: `wrapText(text, maxW, fontSize)` in `lib/layout.ts`; renderer line heights in `exportSvg.ts` (shape 13px/lh15, sticky 16px/lh19, text `fs`/lh `fs*1.28`).

## Goals / Non-Goals

**Goals:**
- Unambiguous chrome: zoom lives only in the bottom bar; element size only in A−/A+.
- Live-look undo/redo; red line laser; Excalidraw-flavored text editing sized to content.

**Non-Goals:**
- No full Excalidraw port (no anchor-pinned transform editor, no RTL caret mirrors, no container auto-shrink bookkeeping); no new dependencies; no font-metric canvas rewrite — reuse `wrapText`.

## Decisions

- **Delete the `Size 1×` chip outright over relabeling.**
  Rationale: it is static text that can never be correct (shows `1×` at any element size); A−/A+ already own sizing. Alternative (live scale %) rejected — no live equivalent exists.
- **Curved undo/redo as new `undo`/`redo` entries in `lib/icons.ts`, BottomBar switches `backward`/`forward` → `undo`/`redo`.**
  Rationale: matches live ↩/↪ glyphs; keeps `Icon` API unchanged. Paths (24×24, stroke): undo `M9 14 4 9l5-5` + `M4 9h9a7 7 0 0 1 0 14h-3` style curve; redo mirrored. Alternative (reuse backward/forward) rejected per screenshot evidence.
- **Laser trail as one red polyline through alive points, press-and-hold gated, fading by age.**
  Rationale: reuses existing `laserPoints` life queue and rAF loop; per-point alpha via segmented strokes. Points are added only while the primary button is held (hover adds nothing); pointer capture on press guarantees the release is seen, and release stops the timestamp refresh so the trail fades gradually via point life. Canvas gets `cursor:none` under `tool-laser` so only the red head dot marks the point. Keeps `#f05656`-family red (`rgba(240,86,86,…)` already the laser color). Alternative (DOM/SVG trail) rejected — canvas overlay already composited above content.
- **Text upgrades inside existing `TextEditor`, no new component.**
  Auto-grow: on input set `height:auto` then `scrollHeight` (min 28). Wrap: keep `pre-wrap` for every type (our elements are fixed-width, unlike Excalidraw free text). Tab inserts two spaces at caret. Normalize `\r\n`→`\n` on input. Focus with `preventScroll`. Commit autofit in `commitEdit` using renderer-matched metrics: text → fit longest line (`fs*0.56` char width, lh `fs*1.28`); shape → `wrapText(label, width-24, 13)`, lh 15, grow height only; sticky → `wrapText(text, width-28, 16)`, lh 19, grow height only. Rationale: mirrors what `NodeView`/export render so committed text never clips; width of shaped elements stays user-controlled.

## Risks / Trade-offs

- [Risk] Autofit metrics drift from actual fonts (Kalam vs fallback) → Mitigation: reuse the same `wrapText` + line heights the SVG export uses; add small padding.
- [Risk] Growing shape height surprises (overlaps neighbors) → Mitigation: grow only, never shrink; undoable via existing history entry.
- [Risk] Laser polyline cost per frame → Mitigation: ≤90 points already capped; single path stroke.

## Migration Plan

1. Chrome/icons edits + laser redraw + TextEditor/commitEdit edits.
2. Verify: `bun run typecheck`, `bun run build`, headless CDP run (type multiline + Tab, commit autofit dims, laser trail screenshot, undo/redo glyph screenshot, context bar without Size chip).
3. Rollback: revert the five files; no storage changes.
