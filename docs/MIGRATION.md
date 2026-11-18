# JojoPen — React migration

The app now runs as a Vite + React + TypeScript project. The original single-file
build is preserved unchanged as [`legacy/index.html`](../legacy/index.html) for
reference; it is not served by Vite.

## Run it

```bash
bun install
bun run dev      # http://127.0.0.1:5173/
bun run build    # type-check + production bundle in dist/
bun run preview  # serve the production bundle
bun run typecheck
```

Bun is the package manager: `bun.lock` is the committed lockfile, and there is no
`package-lock.json`. Run all scripts with `bun run <script>`.

The production bundle is a single HTML entry (`index.html`) that loads `/src/main.tsx`.
CSS and the inlined Inter/Kalam webfonts live in `src/styles/` and are identical to the
legacy design system.

## Layout

```
index.html                 Vite entry, mounts /src/main.tsx into #root
src/main.tsx               createRoot + style imports
src/App.tsx                boot, fit, keyboard, theme vars, window.J, surface composition
src/components/            React surfaces
  Canvas.tsx               pointer interactions, nodes/edges, marquee, selection, laser
  NodeView.tsx             one element (shape, text, sticky, image, frame, slide, diagram)
  Edges.tsx                arrow/freehand SVG layer
  SceneView.tsx            reusable read-only scene for thumbnails, present and replay
  TextEditor.tsx           inline textarea editor
  Chrome.tsx               top bar, toolbar, rail, bottom bar, context bar, start card, toast
  Panels.tsx               slides, code, boards, assistant side panels
  Overlays.tsx             menu, shortcuts, palette, icon search, export, rename, Mermaid
  Presenter.tsx            fullscreen slide deck + laser canvas
  SotReplay.tsx            Sands of Time recording replay + GIF/MP4 export menu
  TimelineReplay.tsx       timeline snapshot replay
  Icon.tsx                 named inline SVG icons
  useViewport.ts           resize-aware window size hook
src/state/
  store.ts                 mutable S, subscribe/notify, persistence, camera, element helpers
  actions.ts               user-level actions (draw, edit, slides, export, boards, AI)
  sot.ts                   record/replay/GIF/MP4 engine
  replay.ts                timeline replay
  commands.ts              command table + global keyboard handling
src/lib/                   framework-free engine and helpers
  model.ts                 element/doc factories, normalization, persistence types
  geometry.ts              bounds, arrow geometry, hit testing
  dsl.ts                   diagram DSL parser + diagnostics
  layout.ts                graph layout
  diagram.ts               diagram rendering to SVG
  mermaid.ts               Mermaid flowchart → DSL
  exportSvg.ts             element/scene/board/slide → SVG, rasterize
  gif.ts                   handwritten GIF89a encoder
  ai.ts                    provider metadata, config storage, request adapter
  icons.ts, palette.ts, roles.ts, templates.ts, dom.ts
src/styles/                app.css (legacy), newui.css (2026 site design), fonts.css
public/favicon.svg, public/fonts/Excalifont-Regular.woff2
docs/                      FEATURES.md, AUDIT.md, MIGRATION.md, harness/, img/
legacy/index.html          untouched original implementation
```

## State design

There is one mutable store, `S`, exported from `src/state/store.ts`. Components read it
directly and subscribe with `useSyncExternalStore(subscribe, getVersion)`. Mutating
actions call `notify()`; pointer-move paths call `scheduleNotify()` to coalesce frames.
`App` re-renders on every version bump and React reconciles keyed nodes, so focus and
selection survive redraws.

History and timeline are snapshot based, exactly like the original:

- `pushHistory(label)` stores the pre-edit JSON in `S.history` and `S.timeline`;
- `undo`/`redo` restore snapshots;
- `recWatch` captures a Sands of Time frame once edits settle.

Persistence keys are unchanged: `jojopen.doc.v1`, `jojopen.boards.v1`,
`jojopen.current.v1`, `jojopen.ai.v1`, per-board `jojopen.board.<id>`. Existing
localStorage data therefore opens without migration.

## Deliberate structure choices

- **Engine modules do not import the store.** `diagram.ts` and `exportSvg.ts` take a
  `DiagramEnv`/`ExportEnv` object (theme, colour resolver, files, slide list, arrow
  geometry). This keeps them testable and avoids import cycles.
- **`sot.ts` depends only on the store and pure libs**, so `actions.ts` can import the
  recorder without a cycle.
- **String SVG is kept** for diagram blocks and export. React renders diagram SVG with
  `dangerouslySetInnerHTML`; export and thumbnails reuse the same string builder.
- **The legacy hook surface is preserved.** Chrome, panels and overlays keep the
  `data-act`/`data-tool`/id attributes used by the CDP harness. `App` exposes
  `window.J = { S, renderAll: notify, addSlide, parseDSL, layoutDiagram, diagramFor,
  openBoard }` for scripts that expect the original globals.
- **No `StrictMode`.** Double-invoked effects would reboot the store, duplicate keyboard
  listeners and restart timers in development.

## Behaviour fixes during the port

These were bugs in the legacy file; the port keeps the intended behaviour:

1. Text/sticky creation no longer discards the editor: the canvas pointerdown default is
   cancelled so the editor keeps focus.
2. Sticky edits are written to `text` (the field the note renders), not `label`.
3. `uid()` uses a full 64-character alphabet, so ids never contain `undefined`.
4. SVG dimensions are clamped before `shapeMarkup`, removing negative-size console errors.
5. The DSL parser reports an unclosed group warning instead of throwing on an undefined
   `diag` reference.

### 2026 site visual refresh

The live site at <https://jojopen.com/> shipped a redesigned `cp-*` UI (bundle
`index-Dvu7dF-m.js`). `src/styles/newui.css` is that design language adapted to the
port's existing class names, imported after the legacy stylesheet. It brings:

- compact rounded chrome panels, 40 px icon buttons, hover key hints;
- the smaller left toolbar, right rail and bottom-left status cluster of the new site;
- a bottom context bar with `Size 1×` and the `Clean it` action;
- the Google-style **Sign in** chip in the top right (still a local-only gate here);
- `Random colors` and labelled `Dots` controls in the bottom-left bar;
- `system` theme (default) that follows `prefers-color-scheme`, alongside light/dark;
- the Excalifont handwriting font (`public/fonts/Excalifont-Regular.woff2`).

The Sands of Time card is anchored inside its own host so it stays on screen under the
new absolute-positioned card styles. All legacy `data-act` hooks were kept, so the CDP
harness still passes against the refreshed UI.

Everything else matches [`FEATURES.md`](../FEATURES.md), including the two documented
deviations from the production site: recordings persist in the board document, and replay
uses a dimmed overlay.

## Parity harness

The CDP scripts in `docs/harness/` were written against the original. They now target
`http://127.0.0.1:5173/` and still work because the legacy DOM hooks are preserved. To
run a copied harness outside the repo (the repo is `"type": "module"`), copy `lib.js` to
a `.cjs` file and require it from `.cjs` scripts:

```bash
node docs/harness/rebuild-e2e.js    # record → replay → GIF/MP4 → Mermaid → builds
node docs/harness/rebuild-keys.js   # replay keyboard control + theme/style sweep
```

Screenshots and downloads are written under `/tmp/opencode/jojo/`.

## Known limits

- AI requests need a user-supplied provider key; without one the assistant stays in its
  scaffold state, matching an anonymous visitor.
- Cloud boards, MCP pairing and sign-in remain gated, as in the original spec.
- `prefers-reduced-motion` is not wired up; the original had no such handling.
- The legacy `--ink` CSS variable is still undefined in both implementations
  (`var(--ink)` falls back to inherited colour). Preserved for visual parity.
