# Live parity report

A screenshot-backed comparison of this port against the live site. Each capture records the
surfaces that differ, so a future change can tell whether a difference is a regression or a
deliberate decision.

## Baseline snapshot

| | |
| --- | --- |
| Captured | 18 Nov 2026 |
| Live URL | <https://jojopen.com/> |
| Live bundle | `index-AUJ3ngSu.js` |
| Live CSS | `index-CLwQeLoE.css` |
| Port | `http://127.0.0.1:5173/` (Vite dev) |
| Viewport | 1440×900, device scale 1 |
| Raw probe | [`manifest.json`](img/parity/baseline-2026-11-18/manifest.json) |
| Harness | `node docs/harness/parity.js --base <url> --out <dir>` |

The live site has no `data-act` hooks, so the parity harness detects the live `cp-*` classes and
uses titles for live probes, while local probes keep using the port's `data-act`/`data-tool`
hooks. The manifest records every measurement; the table below summarises it.

## Status per surface

Status is `gap` while the port differs from the recorded live snapshot, `match` when it matches,
`match*` when it matches except for a documented intentional difference, and `intentional`
for a documented, deliberate difference.

| Surface | Live | Port after fix | Status | Evidence |
| --- | --- | --- | --- | --- |
| Toolbar reveal | Collapsed to Select; 17 secondary tools reveal on hover and hide after ~1.2 s | Collapsed to 0/17 at rest, 17 on hover, still open after 3 s, 0 after the linger | match | [before](img/parity/baseline-2026-11-18/toolbar-collapsed.png) · [after collapsed](img/parity/after-2026-11-18/toolbar-collapsed.png) · [after revealed](img/parity/after-2026-11-18/toolbar-revealed.png) |
| Toolbar peek hint | A small bar is visible while collapsed | 14×3 px `.peekhint`, hidden while revealed and on touch | match | [after collapsed](img/parity/after-2026-11-18/toolbar-collapsed.png) |
| Rail reveal | Collapsed to AI/hourglass/slides/boards; Diagram code and Keyboard shortcuts reveal | Collapsed to 0/2 at rest, 2 on hover, hidden after the linger | match | [after collapsed](img/parity/after-2026-11-18/rail-collapsed.png) · [after revealed](img/parity/after-2026-11-18/rail-revealed.png) |
| Top-right reveal | Collapsed to the active style chip; Font, B/W, Theme reveal | Collapsed to 0/6 at rest, 6 on hover, hidden after the linger | match | [after collapsed](img/parity/after-2026-11-18/topright-collapsed.png) · [after revealed](img/parity/after-2026-11-18/topright-revealed.png) |
| Bottom-left bar | Collapsed to the zoom label; expands to zoom out, label, zoom in, Fit, Snap, Dots, Random colors, Undo, Redo | Zoom label only at rest; expands in live order with live titles; Undo/Redo disabled without history | match | [after collapsed](img/parity/after-2026-11-18/bottombar-collapsed.png) · [after revealed](img/parity/after-2026-11-18/bottombar-revealed.png) |
| Main menu | Absolute popover at (16, 66), 230×241 px, eight items; closes on outside click and the trigger, not Escape | Anchored 230 px popover at (16, 66) with the live item set; closes on outside click, the trigger, and Escape (intentional extra) | match* | [before](img/parity/baseline-2026-11-18/menu-open.png) · [after](img/parity/after-2026-11-18/menu-open.png) |
| Context bar | Auto chip, colour dot, six shapes, A−/A+, Size, Layer order, Lock, Delete, Clean it | Auto chip, colour dot, Box/Ellipse/Diamond/Cylinder/Pill/Document, A−/A+, Size, single Layer order popover, Lock, Delete, Clean it | match | [before](img/parity/baseline-2026-11-18/contextbar.png) · [after](img/parity/after-2026-11-18/contextbar.png) |
| Random colors | Repaints every shape and arrow across the palette | Spreads `COLOR_KEYS` across shapes/arrows, one undo step, persists, toasts | match | [before](img/parity/baseline-2026-11-18/random-colors.png) · [after](img/parity/after-2026-11-18/after-random.png) ([before](img/parity/after-2026-11-18/before-random.png)) |
| Dots toggle | Toggles the background dot grid and its active state | Toggles grid + active state, persists, reacts to `Ctrl+Shift+'` | match | [after toggle](img/parity/after-2026-11-18/dots-toggled.png) |
| First run | Seeds a 19-element URL-shortener demo under `jojopen:scratch:v2` | Seeds a “Scratch board” with the system-template diagram + 301s sticky, and imports `jojopen:scratch:v2` read-only when the port has no board (demo shape differs: one diagram element, not 19 nodes) | match* | [before](img/parity/baseline-2026-11-18/base.png) · [after](img/parity/after-2026-11-18/firstrun-demo.png) |

## Confirmed gaps at baseline

### 1. Chrome never collapses

Live clusters carry `cp-collapsible`; secondary controls carry `cp-more`. While collapsed they
have zero size and `visibility: hidden`, and the hide transition uses
`transition-delay: var(--cp-linger, 1.2s)`. Measured on the live toolbar: 0 of 17 secondary
controls visible at rest, 17 while hovered, still 17 after 3 seconds inside, and 0 about 1.2
seconds after the pointer leaves. The port paints all 17 permanently.

Evidence: [toolbar collapsed](img/parity/baseline-2026-11-18/toolbar-collapsed.png),
[toolbar revealed](img/parity/baseline-2026-11-18/toolbar-revealed.png),
[bottombar collapsed](img/parity/baseline-2026-11-18/bottombar-collapsed.png).

### 2. Main menu is a modal, not a popover

Live renders `.cp-layermenu-pop.cp-mainpop` at x=16, y=66, 230×241 px with:

1. My boards
2. Scratch board
3. Connect AI
4. Keyboard shortcuts (`?` hint)
5. Connect your AI app (guide)
6. Sign in
7. Privacy
8. Terms

Outside click and a second click on the trigger close it. Escape does **not** close it. The port
renders `.sheet` at 270,147 at 900×606 behind `.scrim` with New board, My boards, Import JSON,
Backup JSON, three template cards, Assistant, Diagram code, Slides, Sands of Time, Export, style
switches and Close.

Evidence: [live menu](img/parity/baseline-2026-11-18/menu-open.png).

### 3. Random colors turns the board grey

The action shuffles `COLOR_KEYS` (`violet`, `teal`, …) but calls `roleColor()`, which indexes
`ROLE_COLORS` by role name (`actor`, `network`, …). Every lookup misses and returns `neutral`, so
every shape and arrow becomes `#808080`. Live spreads the palette; its stroke list changes from
`#3974D0`, `#795AD6`, `#25907F`, … to `#D96F2F`, `#25907F`, `#3974D0`, `#38914F`, ….

Evidence: [random colors](img/parity/baseline-2026-11-18/random-colors.png),
[before/after JSON](img/parity/baseline-2026-11-18/manifest.json).

### 4. Context bar control set differs

Live `.cp-contextbar` is 727×44 and contains, in order: an Auto role chip, a colour dot
(`.cp-colorbtn`), Box, Ellipse, Diamond, Cylinder, Pill, Document, A−, A+, Size, a single **Layer
order** control, Lock, Delete and Clean it. The port has no colour dot, uses two order buttons,
keeps an extra Duplicate button and labels the shapes `rectangle`, `rounded`, `ellipse`, …,
`person`.

Evidence: [context bar](img/parity/baseline-2026-11-18/contextbar.png).

### 5. First run is empty and uses different storage

Live writes `jojopen:scratch:v2` with a 19-element demo: User → CDN → API Gateway → Backend,
Postgres, Redis and Kafka, an analytics worker and a sticky note reading
“301s are cacheable — let the CDN absorb redirects”. The port writes `jojopen.doc.v1`,
`jojopen.boards.v1`, `jojopen.current.v1` and per-board keys, and boots with zero elements and
the start card.

Evidence: [first run](img/parity/baseline-2026-11-18/base.png), [raw probe](img/parity/baseline-2026-11-18/manifest.json).

## Intentional differences

These are kept even after the fixes, and are listed here so they are not mistaken for gaps.

| Difference | Why |
| --- | --- |
| Escape closes the main menu | The live menu ignores Escape. Keeping Escape is an accessibility improvement; outside click and the trigger match live. |
| Port storage keys stay `jojopen.doc.v1` etc. | The port keeps its own persisted format. `jojopen:scratch:v2` is imported read-only on first run, never rewritten. |
| Sign in does not start an OAuth flow | Cloud sign-in is out of scope for the anonymous port; the entry is present so the menu matches. |
| Connect AI opens the local assistant panel | MCP pairing is out of scope; the local assistant/export surfaces remain. |

## Re-running the probe

```sh
bun run dev --host 127.0.0.1
node docs/harness/parity.js --base http://127.0.0.1:5173/ --out /tmp/opencode/jojo/parity
node docs/harness/parity.js --base https://jojopen.com/ --out /tmp/opencode/jojo/parity-live
```

Each run writes `manifest.json` plus one PNG per entry and exits non-zero if any entry has no
screenshot. A live run also records the bundle and CSS filenames, so a new capture can be
compared against this snapshot.
