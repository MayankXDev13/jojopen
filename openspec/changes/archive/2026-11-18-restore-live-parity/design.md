# Design

## Context

See `proposal.md` for motivation. Headless Chrome at 1440×900 on 18 Nov 2026 (live bundle
`index-AUJ3ngSu.js`, CSS `index-CLwQeLoE.css`) established the current state:

- Live chrome uses `cp-collapsible` clusters. Secondary controls carry `cp-more`; collapsed
  clusters hide them with `visibility: hidden` and zero width/height. `:hover`/`:focus-within`
  reveals them, and the hide transition uses `transition-delay: var(--cp-linger, 1.2s)`. A
  `.cp-peekhint` bar is visible only while the toolbar is collapsed. In the port,
  `src/styles/newui.css` overrides `.more` to always be visible and never hides the clusters.
- Live bottom bar collapsed: only the zoom label. Hovered: zoom out, zoom label, zoom in, Fit,
  Snap, Dots, Random colors, then Undo/Redo. Titles include `Fit everything (Shift+1)`,
  `Undo (Ctrl+Z)` and `Redo (Ctrl+Shift+Z)`. The port renders every control at all times.
- Live main menu: `.cp-layermenu-pop.cp-mainpop`, absolute at (16, 66), 230×241 px, with My
  boards, Scratch board, Connect AI, Keyboard shortcuts (`?` hint), Connect your AI app (guide),
  Sign in, Privacy and Terms. Outside click and a second trigger click close it; Escape does not.
  The port renders a centred 900×606 `.sheet` behind a dimmed `.scrim` with different items.
- Live context bar: `.cp-contextbar` 727×44 with an Auto role chip, a `.cp-colorbtn` colour dot,
  six shape buttons (Box, Ellipse, Diamond, Cylinder, Pill, Document), A−/A+, Size, one Layer
  order control, Lock, Delete and Clean it. The port has no colour dot and uses two order buttons
  plus Duplicate.
- `randomColors()` in `src/state/actions.ts` shuffles `COLOR_KEYS` (`violet`, `teal`, …) but calls
  `roleColor()` with them. `roleColor()` indexes `ROLE_COLORS` by role name (`actor`, …), so every
  lookup misses and returns `neutral`. The live action repaints across the palette; the port
  turns every element `#808080`. `colorFor()` already maps colour keys through `COLOR_TO_ROLE`.
- Live first run seeds the URL-shortener demo under `jojopen:scratch:v2`; the port boots empty
  with a start card and writes `jojopen.doc.v1`.
- The CDP harness in `docs/harness/` drives the port through `lib.js` against
  `http://127.0.0.1:5173/` and relies on `data-act`/`data-tool`/id hooks. The live site has no
  such hooks, so its probes target `cp-*` classes and titles.


## Goals / Non-Goals

**Goals:**

- One reusable collapse/reveal pattern for all four clusters: collapsed initial state, hover or
  focus reveal, ~1.2 s linger after leave, and the toolbar peek hint.
- A bottom-left bar whose collapsed and expanded states, order, labels, icons and active states
  match the live site, with every control proven to respond.
- A main menu anchored to the hamburger button, 230 px wide, with the live item set, keeping the
  canvas visible.
- A context bar with the live control set, including the colour dot and single Layer order.
- A working Random colors action and a verified Dots toggle.
- The live first-run demo board and read-through import of `jojopen:scratch:v2`.
- Screenshot evidence for every audited surface plus a parity report that states match/diff per
  surface.

**Non-Goals:**

- Redesigning the chrome or adopting the live site's exact CSS/bundle.
- Cloud boards, MCP pairing, sign-in or other gated features beyond showing the menu entries.
- Changing the port's own persistence keys or the board document shape; the live record is
  imported read-only.
- Pixel-perfect screenshot diffing infrastructure; comparison is human-readable evidence plus
  harness assertions.

## Decisions

### 1. CSS-only collapse and reveal with `:hover`, `:focus-within` and the live linger

Each cluster already owns a `collapsible` class. Hide secondary controls by default and show them
when the cluster matches `:hover` or `:focus-within`, mirroring the live `cp-collapsible` rules.
Keep the live `--cp-linger: 1.2s` transition delay on hide so a short pointer excursion does not
snap the bar shut, while a pointer or focus that stays inside keeps it open indefinitely. No
JavaScript timer and no two-second dismissal.

- Collapsed secondary controls use zero max-width/max-height plus `visibility: hidden`, as live
  does, so the cluster shrinks to its primary control.
- Add the live `.cp-peekhint` equivalent to the toolbar: a 12–14 px bar visible only while
  collapsed.
- Keep the cluster's hover target stable: hover is tested on the cluster element, not on the
  individual shrinking button, so moving between revealed buttons does not close it.
- Add `@media (hover: none)` so touch devices always show all controls.
- Alternatives considered: React state with `pointerenter`/`pointerleave` and a close timer. It
  works but reintroduces the dismissal bug, needs listeners on four clusters and is harder for
  the harness to reason about. CSS handles focus and hover natively.

### 2. Keep the bottom bar declarative, ordered and collapsed by default

Represent the bottom-left controls as an ordered array in `BottomBar` (group, id, icon, label,
title, active predicate, handler), then render it. The live order and collapsed state are fixed by
the audit; the array makes the contract explicit and prevents drift. Keep each item's existing
`data-act` and ids.

- Collapsed state shows only the zoom label. Expanded state shows zoom out, label, zoom in, Fit,
  Snap, Dots, Random colors, then Undo/Redo.
- Use the live titles and key hints (`Fit everything (Shift+1)`, `Undo (Ctrl+Z)`,
  `Redo (Ctrl+Shift+Z)`); add `type="button"` and `aria-pressed` for Snap/Dots.

### 3. Anchored popover for the main menu

Render the menu inside the top-left cluster as an absolutely positioned 230 px popover below the
hamburger button, matching the live `.cp-mainpop` at (16, 66). Remove the dimmed scrim. Dismissal
comes from a document-level outside-click listener and from clicking the trigger again; choosing
an item runs its action and closes the menu.

- Use the live item set: My boards, Scratch board, Connect AI, Keyboard shortcuts (with `?`),
  Connect your AI app (guide), Sign in, Privacy, Terms. Template, import/backup and style entries
  move out of the hamburger into the surfaces that already own them.
- Keep `data-act="menu"` on the trigger and `data-act="closeOverlay"` where a close affordance
  remains, so the harness keeps working.
- Keep Escape as an extra convenience even though the live site does not close on Escape; note it
  as an intentional difference in `docs/PARITY.md`.
- Alternatives considered: keep the modal and restyle it (rejected: spec requires anchored,
  canvas visible); a floating-ui-style portal (rejected: unnecessary dependency for one menu).


### 4. Fix Random colors at the colour-key boundary

Store a colour key from `COLOR_KEYS` in `element.color` and let the existing `colorFor()` map it
through `COLOR_TO_ROLE`. This is the contract `applyColor` and the swatch palette already use.

- Shuffle `COLOR_KEYS`, assign per shape/arrow, set `colorLocked = true`, notify and persist as
  one history entry.
- Set `settings().palette = 'roles'` when randomizing so a B/W board shows the new colours
  instead of monochrome. This is a deliberate change from the current silent no-op.
- Spread colours across roles before repeating; the palette has nine visible roles
  (`ink` duplicates `neutral`, so it may repeat at most once).
- Alternative considered: assign raw hex strokes. Rejected: breaks theme/role resolution and the
  colour swatches.

### 5. Context bar: colour dot and single layer-order control

Mirror the live `.cp-contextbar` control set. Replace the port's palette-icon popover with a
colour dot button that reflects the selected element's colour and opens the picker (native
`<input type="color">` styled as the dot, as the live `.cp-colorbtn` behaves). Collapse the two
order buttons into one Layer order control with forward/backward actions, and drop the extra
Duplicate entry from the bar.

- Keep the Auto role chip first, then the dot, six shape actions, A−/A+, Size, Layer order, Lock,
  Delete and Clean it.
- Normalise shape titles to the live wording (Box, Ellipse, Diamond, Cylinder, Pill, Document).
- The dot writes through `applyColor`/the existing colour path so changes are undoable.

### 6. Evidence-first parity audit

Extend the CDP harness with a small parity script that visits the live site and the local dev
server, captures the same named surfaces at 1440×900, and writes a JSON manifest. Save images
under `docs/img/parity/` and summarize them in `docs/PARITY.md` with the capture date, live
bundle hash, and per-surface status.

- Reuse the probes already exercised during planning: live `cp-*` classes and titles, collapsed
  before/after measurements, 1.2 s linger timing, menu rect and item set, colour-dot presence,
  Random colors before/after strokes and `jojopen:scratch:v2` contents.
- Capture final-state screenshots for every surface; add before/after pairs only for the fixed
  quirks (toolbar reveal, bottom bar, Random colors, menu) so the repo does not grow with
  near-duplicates.
- Record the live bundle filename/hash in the report so a future audit knows what it compared
  against.
- If the live site is unreachable, mark affected surfaces `unknown` — never `match`.

### 7. First-run demo and live-storage import

Seed the demo from the existing `templates.ts` system template when no port board exists, so the
content stays in one place and matches the live URL-shortener diagram. Save it immediately.

- On boot, if the port has no board and `jojopen:scratch:v2` parses with elements, normalise it
  through `normalizeDoc` and open it without writing back to the live key.
- If port data exists, ignore the live record entirely.
- Malformed live JSON is caught, logged once, and treated as absent so boot never fails.
- After import, normal editing persists through the port's own keys; the live key is never
  mutated.

## Risks / Trade-offs

- **Live site changes during the change** → Record the capture date and bundle hash; treat
  screenshots as evidence for that snapshot, not permanent truth.
- **Reveal lingers too long and hides a control mid-click** → Match the live 1.2 s linger and
  test clicking every revealed control; any interaction resets the hover state because the
  pointer is inside the cluster.
- **Anchored menu clips on short viewports** → Cap the popover height with internal scrolling and
  verify at 1280×720 and 1440×900.
- **Random colors overrides deliberate per-element colours** → It is an explicit user action and
  remains a single undo step; the toast states what happened.
- **Importing live data could clobber a port board** → Import only when no port board exists and
  never write to the live key.
- **Screenshot payload in git** → PNG-optimize captures, keep only final states plus four
  before/after pairs, and link from the report instead of embedding images in Markdown.
- **Broken colours already persisted from the previous build** → No automatic migration; users
  re-run Random colors. The stored values are valid colour keys (`neutral`), so nothing breaks.

## Migration Plan

No changes to the port's storage schema or keys. On boot, a new read-through imports
`jojopen:scratch:v2` only when the port has no board; the live record is left untouched. If the
import is undesired, deleting the port board and reloading returns to the demo/start-card path.
Rollback is a revert of the UI/action commits; boards keep opening because no document fields
change.

