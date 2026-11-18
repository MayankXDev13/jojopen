# Tasks

## 1. Parity evidence baseline

- [x] 1.1 Add `docs/harness/parity.js` that drives a base URL, probes the surfaces verified during planning (collapsed/expanded clusters, linger timing, menu rect and items, context-bar controls, Random colors strokes) and writes a manifest; verify it runs against `http://127.0.0.1:5173/` and produces one file per manifest entry
- [x] 1.2 Capture the live baseline from `https://jojopen.com/` for every anonymous surface and record the capture date, bundle `index-AUJ3ngSu.js` and CSS `index-CLwQeLoE.css` in the manifest; verify each manifest entry has a screenshot
- [x] 1.3 Create `docs/PARITY.md` listing the confirmed gaps (always-expanded clusters, centred modal menu, neutral Random colors, missing colour dot/Layer order, empty first run, storage key mismatch) with screenshot links and a status per surface; verify every link resolves under `docs/img/parity/`

## 2. Collapse and reveal chrome

- [x] 2.1 Remove the always-visible `.more` override in `src/styles/newui.css` and implement the live model: clusters collapsed by default, `:hover`/`:focus-within` reveal with zero size and `visibility: hidden` when closed, and the 1.2 s hide linger; verify the initial state shows only the primary control and a five-second hover stays open
- [x] 2.2 Add the toolbar peek hint and the `@media (hover: none)` fallback; verify the hint disappears on hover and touch users see every control
- [x] 2.3 Add `docs/harness/chrome-reveal.js` asserting collapsed counts, reveal on hover, still-open after 3 s inside, and hidden about 1.2 s after leaving, for toolbar, rail, top-right and bottom-left; verify it passes with zero console errors
- [x] 2.4 Document the collapse/reveal and linger behaviour in `docs/MIGRATION.md`; verify the text matches the captured after screenshots

## 3. Bottom-left bar parity

- [x] 3.1 Render `BottomBar` from an ordered control list and add the collapsed state (zoom label only); verify DOM order in both states matches zoom out, label, zoom in, Fit, Snap, Dots, Random colors, Undo, Redo
- [x] 3.2 Match the live titles and key hints (`Fit everything (Shift+1)`, `Undo (Ctrl+Z)`, `Redo (Ctrl+Shift+Z)`), add `type="button"` and `aria-pressed`, and disable Undo/Redo when there is no history, as the live baseline shows; verify against the baseline screenshot
- [x] 3.3 Verify zoom out, label reset, zoom in, Fit and Snap change state, update styling, persist where applicable and show the Snap toast; fix any no-op found and verify at 1280×720 and 1440×900
- [x] 3.4 Update the bottom-bar section of `FEATURES.md` with the collapsed/expanded order and behaviours; verify the documentation matches the rendered bar

## 4. Canvas appearance controls

- [x] 4.1 Fix `randomColors()` to assign `COLOR_KEYS` keys resolved through `COLOR_TO_ROLE`, spread colours before repeating and set `settings().palette = 'roles'`; verify a board with two or more elements ends with at least two distinct stroke colours and none is `#808080`-only
- [x] 4.2 Keep Random colors as one history step, persist the result and show the toast; verify Undo restores previous colours and a reload keeps the new ones
- [x] 4.3 Add the context-bar colour dot backed by a colour input that reflects the selection and writes through the undoable colour path; verify selecting, changing and undoing a colour
- [x] 4.4 Verify Dots toggles the grid, updates its active state, persists across reload and reacts to its keyboard shortcut; fix any no-op found
- [x] 4.5 Add `docs/harness/appearance.js` covering Random colors colours, single-step undo, colour-dot change and Dots toggle/persistence; verify it passes
- [x] 4.6 Document Random colors, the colour dot and Dots in `FEATURES.md`; verify the text matches the after screenshots

## 5. Anchored main menu

- [x] 5.1 Replace the centred `MenuSheet` with a ~230 px popover anchored at the top-left (live rect 16,66) and remove the dimmed scrim; verify the rect and that the canvas stays visible at both test viewports
- [x] 5.2 Render the live item set (My boards, Scratch board, Connect AI, Keyboard shortcuts with `?`, Connect your AI app (guide), Sign in, Privacy, Terms) and move template/import/backup/style entries to the surfaces that own them; verify every item is present and runs its action
- [x] 5.3 Close on outside click and on a second trigger click, and keep Escape as an intentional extra; verify each path and record the Escape difference in `docs/PARITY.md`
- [x] 5.4 Preserve `data-act="menu"` and keyboard focus handling; verify the harness selectors resolve, Tab reaches the items and the menu does not trap focus after closing

## 6. Context bar parity

- [x] 6.1 Match the live control set and order: Auto chip, colour dot, Box, Ellipse, Diamond, Cylinder, Pill, Document, A−, A+, Size, Layer order, Lock, Delete, Clean it; verify the rendered order and titles against the baseline
- [x] 6.2 Replace the two order buttons with one Layer order control and remove the extra Duplicate entry from the bar; verify forward/backward actions still work and the DOM matches live
- [x] 6.3 Update the context-bar section of `FEATURES.md`; verify it lists the colour dot and Layer order

## 7. First-run board and live-storage import

- [x] 7.1 Seed the URL-shortener demo from `templates.ts` when no port board exists and persist it immediately; verify a fresh profile shows the diagram and sticky note and that a reload keeps it
- [x] 7.2 Import `jojopen:scratch:v2` when the port has no board, normalising it through `normalizeDoc`, leaving the live key untouched; verify with a seeded key, an existing port board (ignored) and malformed JSON (falls back without error)
- [x] 7.3 Verify edits to an imported board persist through the port's own keys on reload
- [x] 7.4 Document the first-run demo and the read-through import in `docs/MIGRATION.md` and `FEATURES.md`; verify both describe the actual boot order

## 8. Integration and evidence

- [x] 8.1 Run the full harness (`rebuild-e2e.js`, `rebuild-keys.js`, `chrome-reveal.js`, `appearance.js`, `parity.js`); verify zero console errors and zero failed requests
- [x] 8.2 Capture after screenshots for every audited surface plus before/after pairs for the toolbar reveal, bottom bar, Random colors, menu, context bar and first run; verify every manifest entry exists in `docs/img/parity/`
- [x] 8.3 Finalize `docs/PARITY.md` with a status per surface, including the intentional Escape-closes-menu difference, and update `docs/AUDIT.md` / `docs/MIGRATION.md`; verify no surface is left without a status
- [x] 8.4 Run `bun run typecheck` and `bun run build`; verify both succeed with no new warnings
- [x] 8.5 Run `openspec validate restore-live-parity --strict`; verify the change validates

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Re-run the parity harness against the live site after archive to confirm the recorded snapshot still matches.
