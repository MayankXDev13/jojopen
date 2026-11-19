# JojoPen — code audit

Date: 16 Nov 2026. Scope: the single-file app at [`legacy/index.html`](../legacy/index.html)
(≈4,950 lines: inlined CSS, fonts, icons, and one IIFE-free script block).

## 1. What the original does

One `index.html` holds the complete app:

| Layer               | Where                                                              | Notes                                                                                           |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Design tokens + CSS | lines 9–411                                                        | light/dark/chalkboard palettes driven by `data-theme`, `data-style` and per-theme CSS variables |
| Markup shell        | lines 1870–1935                                                    | static chrome; panels, overlays and canvas nodes are rendered into host divs                    |
| Icons               | `ICO` map                                                          | hand-written inline SVG paths, `ico(name, size)` helper                                         |
| Model               | `MAKE`, `baseElement`, `normalizeDoc`                              | mutable plain objects in `S.doc.elements` keyed by id                                           |
| State               | `const S = {…}`                                                    | one mutable global, no framework, no reactive graph                                             |
| Render              | `renderCanvas` / `renderChrome` / `renderPanel` / `renderOverlays` | imperative `innerHTML` replacement per surface                                                  |
| Diagram engine      | DSL parser, layout, Mermaid import, SVG builder                    | pure string/geometry code                                                                       |
| Recording           | `sot*` functions                                                   | document snapshots per edit, GIF encoder handwritten, MP4 via `MediaRecorder`                   |
| Export              | `exportSVG`, `rasterize`, `download`                               | SVG string → data URL → canvas → PNG                                                            |
| Input               | delegated `data-act` / `data-tool` clicks, pointer handlers        | inline editors are DOM textareas appended to `body`                                             |
| Hotkeys             | `COMMANDS` table + `onKeyDown`                                     | single keyboard entry point with text-target suppression                                        |

Data model: a board doc (`elements`, `files`, `recordings`, `settings`) persisted to
`localStorage` (`jojopen.doc.v1`), plus one copy per board (`jojopen.board.<id>`) and a
board index (`jojopen.boards.v1`). Slides are elements; their children carry `frameId`.
Arrows reference `start.elementId` / `end.elementId`. Builds are stored on the slide
with per-child reveal steps.

## 2. Strengths worth keeping

- The behaviour is already fully specified by [`FEATURES.md`](../FEATURES.md), including
  exact labels, counts, key bindings and the Sands of Time flow.
- The diagram engine is deliberately renderer-independent: it produces SVG strings from
  a parsed graph, which makes it reusable in React, thumbnails, replay, and export.
- All persisted shapes are plain JSON; no migrations are needed for the port.
- The design system is a compact set of CSS variables and classes, so it can be reused
  verbatim instead of redesigned.

## 3. Risks found

| Risk                                                                   | Impact                                                                | Resolution in the port                                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `renderCanvas` replaces `#nodes` with `innerHTML` on every frame       | loses focus, selection, IME state; expensive on large boards          | React renders keyed `NodeView`s; the store only notifies                                         |
| `renderChrome` rebuilds toolbars on almost every interaction           | delegated listeners must be re-installed, click targets flicker       | components are declarative and stable                                                            |
| Global mutable `S` with implicit render calls                          | easy to forget `renderAll()`, hard to test modules                    | one store module owns `S`, `notify()` and persistence; engine modules accept environment objects |
| Inline editor was appended to `document.body`                          | coordinates and theming are implicit; blur ordering is fragile        | editor is a React child of the canvas, positioned from the camera                                |
| `uid()` mapped bytes with `x & 63` over a 62-character alphabet        | ~3% of ids contain the literal string `undefined`                     | fixed alphabet includes `-` and `_` so 64 values are valid                                       |
| Sticky-note edits were written to `label` but rendered from `text`     | note edits silently disappeared                                       | commit writes `text` for stickies                                                                |
| `shapeMarkup` divides positions by user dimensions                     | negative `width`/`height` during creation logged SVG attribute errors | dimensions clamped to `>= 2` before building markup                                              |
| `dsl.ts` referenced an out-of-scope `diag` helper at end of parse      | unclosed-group warning threw instead of being reported                | warning is pushed directly to `diags`                                                            |
| Pointer-down on the canvas focused the canvas after the editor mounted | the new text editor blurred instantly and removed the element         | creation paths cancel the pointerdown default, so focus stays in the editor                      |

## 4. Feature inventory

Every anonymous surface is present and was exercised against the port:

- canvas pan/zoom/fit, dots, snap, marquee, selection box, resize handles;
- 15 tools (select, hand, rectangle, ellipse, diamond, cylinder, frame, arrow, line,
  pen, text, sticky, image, eraser, laser) with keyboard shortcuts;
- labels and inline editing for shapes, text, stickies, containers and arrows;
- diagram blocks: DSL parse/layout/apply, diagnostics, Mermaid import, code panel;
- slides: layouts, thumbnails, duplication, build steps, present mode (steps, laser,
  progress), slide PDF/PNG export;
- Sands of Time: record, stop, card, replay, keyboard control, speed, GIF, MP4, delete,
  persistence inside the board document;
- export dialog: board/selection/slides, PNG/SVG/PDF, scale, background, dark mode,
  preview, copy PNG;
- boards: rename, link copy, new board, switch, delete, import/backup JSON, search;
- assistant panel scaffold and provider/key/model settings (network calls gated);
- command palette, icon search, shortcuts sheet, main menu, zen mode, themes/styles,
  palette on/off, hand font toggle, toast;
- timeline replay (Sands of Time timeline snapshots) with scrubber and play control.

## 5. 2026 site refresh

The current production site uses a new bundle (`index-Dvu7dF-m.js`) and a redesigned
`cp-*` interface while keeping the same command set (the only command additions are
fine-grained Shift+Arrow nudge ids, which the port already implements through `S._shift`).
The port now matches that visual language via `src/styles/newui.css`, including the new
context bar, compact chrome, key hints, Excalifont, a `system` theme and the sign-in chip.
Cloud boards, share links, profile links and AI calls remain gated, as on the live site.

## 6. Verification summary

The migration was checked with the existing CDP harness plus new interaction runs at
1440×900:

- boot: 0 nodes, start card, 15 tools, 6 rail buttons, 8 bottom buttons, no console errors;
- drawing: rectangle, ellipse, text, sticky, arrow with `start`/`end` element ids;
- editing: text/sticky/shape labels, empty-text removal, click-away commit, Escape cancel;
- history: undo/redo, select-all, duplicate (4 → 8 elements), grouping;
- navigation: zoom by `Ctrl`+wheel, fit, zoom label;
- recording: 3 steps / 4 frames, replay keyboard sequence `0/3 … 3/3`, GIF89a + MP4 files;
- slides: add, builds, build replay (0 → 1 visible), present navigation;
- export: valid SVG source and PNG file at the chosen scale;
- boards: rename, new, switch, and reload persistence;
- panels: command palette, icon search/insert, export preview, boards, assistant.

Known pre-existing deviations, kept for parity: recordings live in the board document
(so they survive reloads), and replay is a dimmed overlay rather than an undimmed canvas.

## 7. Live parity (restore-live-parity change, 18 Nov 2026)

The React port was compared against the live site (`index-AUJ3ngSu.js`,
`index-CLwQeLoE.css`) and brought to parity for the anonymous surfaces. Full
evidence, per-surface status and the intentional differences (Escape closes the
menu, port storage keys, no OAuth flow, local assistant for Connect AI) live in
[`docs/PARITY.md`](PARITY.md); after-screenshots are under
[`docs/img/parity/after-2026-11-18/`](img/parity/after-2026-11-18/manifest.json).
Every surface in that report has a status — none is left unmarked.
