# Proposal

## Why

The React port has drifted from the live site in several small, visible ways. Hover-revealed
chrome collapses while the pointer is still on it, the bottom-left bar's order and controls do
not match jojopen.com, Random colors does not do what the live site does, and the main menu
opens as a centered modal instead of the original's anchored dropdown. These gaps are easy to
miss feature-by-feature, and the port's parity claims rest on a single audit done before the
2026 UI refresh.

A screenshot-backed re-verification of the live site is needed now so every remaining gap is
recorded, fixed and covered by evidence instead of memory.

**Verified on 18 Nov 2026 against the live site** (`https://jojopen.com/`, bundle
`index-AUJ3ngSu.js`, CSS `index-CLwQeLoE.css`). Headless Chrome at 1440×900 confirmed:

- The live toolbar, rail, top-right and bottom-left clusters start **collapsed**; only the
  primary control is visible. They reveal on hover or focus and hide about 1.2 s after the
  pointer leaves (`--cp-linger`). The toolbar shows a small peek hint while collapsed. The port
  currently shows every control at all times and has no peek hint.
- The live main menu is an **anchored popover** at (16, 66), 230×241 px, with the items My
  boards, Scratch board, Connect AI, Keyboard shortcuts (with a `?` hint), Connect your AI app
  (guide), Sign in, Privacy and Terms. It closes on outside click and on the trigger, not on
  Escape. The port renders a centred 900×606 modal with a dimmed scrim and different items.
- **Random colors** on the live board repaints every shape and arrow across the palette. In the
  port every element becomes `#808080` (neutral) because colour keys are passed to `roleColor()`,
  which indexes by role name.
- The live context bar starts with an Auto role chip and a **colour dot** button, then six shape
  buttons, A−/A+, Size, a single Layer order control, Lock, Delete and Clean it. The port has no
  colour dot and uses two order buttons plus an extra Duplicate control.
- The live first run seeds a **demo URL-shortener board** (User → CDN → API Gateway → Backend,
  Postgres/Redis/Kafka, analytics worker, sticky note) under `jojopen:scratch:v2`. The port opens
  an empty board with only the start card and stores under `jojopen.doc.v1`.

## What Changes

- Re-audit the live site (https://jojopen.com/) feature-by-feature and capture a screenshot for
  every anonymous surface: canvas, toolbar, rail, top bar, bottom-left bar, context bar, menu,
  panels, overlays, slides, presenter, replay, export and dialogs.
- Publish the audit as a screenshot-backed parity report with a status per surface and the
  observed difference from the port.
- Restore the live collapse/reveal model: clusters start collapsed, reveal on hover or focus,
  stay open while the pointer or focus remains, hide after the live ~1.2 s linger, and show the
  toolbar peek hint while collapsed.
- Match the live bottom-left bar in both states: collapsed to the zoom label, and expanded to
  zoom out, zoom label/reset, zoom in, Fit, Snap, Dots, Random colors, Undo and Redo with the
  live labels and key hints.
- Make Random colors assign a distinct palette colour to every shape and arrow and show the
  result immediately; make Dots toggle the background dot grid.
- Replace the centered Main menu sheet with the live 230 px dropdown anchored to the hamburger
  button, using the live item set (My boards, Scratch board, Connect AI, Keyboard shortcuts,
  Connect your AI app (guide), Sign in, Privacy, Terms) and close-on-outside-click behaviour.
- Match the context bar: Auto role chip, colour dot button, six shape buttons, A−/A+, Size,
  Layer order, Lock, Delete, Clean it.
- Seed the demo URL-shortener board on first run and import an existing live
  `jojopen:scratch:v2` board when the port has no board of its own.
- Keep all existing `data-act` / `data-tool` hooks so the CDP harness and its selectors continue
  to work.

## Capabilities

### New Capabilities

- `app-chrome`: collapsed-by-default clusters, hover/focus reveal with the live linger, the
  peek hint, the bottom-left bar and context bar control sets, and the hamburger dropdown.
- `canvas-appearance`: Random colors assignment, the selected-element colour dot, and the
  background dot grid toggle.
- `board-bootstrap`: the first-run demo board and read-through of the live site's
  `jojopen:scratch:v2` storage.

### Modified Capabilities

<!-- No existing specs; openspec/specs is empty. -->

## Impact

- UI: `src/components/Chrome.tsx`, `src/components/Overlays.tsx`, `src/App.tsx`,
  `src/styles/newui.css`, `src/styles/app.css`.
- Behaviour: `src/state/actions.ts` (`randomColors`, `toggleGrid`, `openMenu`, zoom/snap
  actions, colour dot), `src/state/store.ts` and the boot path for demo/imported boards.
- Data: read-only import of `jojopen:scratch:v2`; existing port keys keep working.
- Evidence and docs: new screenshots under `docs/img/parity/`, parity report under `docs/`,
  updates to `FEATURES.md`, `docs/AUDIT.md` and `docs/MIGRATION.md`.
- Harness: `docs/harness/` needs selectors/timings for the collapsed state, dropdown and
  context bar.
- No dependency changes and no network surface beyond the existing anonymous app.
