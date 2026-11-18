# App Chrome Specification

## Purpose

Defines the floating application chrome - the collapsible toolbar, rail, top-right and
bottom-left clusters, and the main menu - so its controls are always reachable and behave the
same as the live site.

## Requirements

### Requirement: Clusters start collapsed and reveal on hover or focus
The toolbar, rail, top-right and bottom-left clusters SHALL start collapsed, showing only their
always-visible primary controls. Hovering or focusing the cluster SHALL reveal its secondary
controls, and they SHALL stay revealed for as long as the pointer or focus remains. After both
leave, the cluster SHALL hide them after a short linger of roughly the live site's 1.2 seconds,
never while the pointer or focus is still inside.

#### Scenario: Initial state
- **WHEN** the board opens
- **THEN** the toolbar shows only Select, the top-right shows only the active style chip, the
  rail hides Diagram code and Keyboard shortcuts, and the bottom bar shows only the zoom label

#### Scenario: Pointer rests on the toolbar
- **WHEN** the pointer enters the left toolbar and stays still for more than two seconds
- **THEN** every tool and separator remains visible and clickable

#### Scenario: Pointer leaves the cluster
- **WHEN** the pointer moves from the toolbar to the canvas and no focus remains
- **THEN** the secondary tools hide after the linger, not immediately

#### Scenario: Keyboard focus keeps the cluster open
- **WHEN** the user tabs into the bottom-left bar and focus remains within it
- **THEN** the secondary controls stay visible even without pointer hover

### Requirement: Collapsed toolbar shows a peek hint
While the left toolbar is collapsed, it SHALL show a small peek hint that signals more tools are
available, and the hint SHALL disappear while the toolbar is revealed.

#### Scenario: Collapsed hint
- **WHEN** the toolbar is collapsed and not focused
- **THEN** a small horizontal peek hint is visible at the end of the toolbar

#### Scenario: Revealed state
- **WHEN** the pointer hovers the toolbar
- **THEN** the peek hint disappears and the full tool list is shown

### Requirement: Bottom-left bar matches the live control set and order
The bottom-left bar SHALL start collapsed to the zoom percentage and expand on hover or focus to,
left to right, zoom out, the zoom percentage (reset to 100%), zoom in, Fit, Snap, Dots and Random
colors in one group, followed by Undo and Redo in a second group, with the live labels, icons,
key hints and active styling.

#### Scenario: Collapsed state
- **WHEN** the canvas is visible, zen mode is off and the bar is not hovered or focused
- **THEN** only the zoom percentage is visible

#### Scenario: Expanded control order
- **WHEN** the bar is hovered or focused
- **THEN** the controls appear in the order zoom out, zoom label, zoom in, Fit, Snap, Dots,
  Random colors, Undo, Redo

#### Scenario: Active states are visible
- **WHEN** Snap is on, Dots is off, or undo history is empty
- **THEN** Snap reads as active, Dots reads as inactive, and Undo is unavailable

#### Scenario: Labels and key hints match the live site
- **WHEN** the user hovers a control
- **THEN** its title matches the live wording, including `Fit everything (Shift+1)`,
  `Undo (Ctrl+Z)` and `Redo (Ctrl+Shift+Z)`

#### Scenario: Zoom label shows the current zoom
- **WHEN** the zoom level changes
- **THEN** the label shows the rounded percentage and clicking it returns the zoom to 100%

### Requirement: Bottom-left controls respond to input
Each bottom-left control SHALL change application state on activation and never appear
clickable while doing nothing.

#### Scenario: Zoom out
- **WHEN** the user clicks zoom out at 100% zoom
- **THEN** the canvas zooms out around the viewport centre and the label updates

#### Scenario: Zoom in and fit
- **WHEN** the user clicks zoom in or Fit
- **THEN** the canvas zooms in around the viewport centre, or frames all content

#### Scenario: Snap toggles
- **WHEN** the user clicks Snap
- **THEN** snapping flips, the button's active state changes, the choice persists and a toast
  confirms the new state

#### Scenario: Dots toggles
- **WHEN** the user clicks Dots
- **THEN** the background dot grid is shown or hidden, the button's active state follows, and
  the choice persists

#### Scenario: Random colors runs
- **WHEN** the user clicks Random colors
- **THEN** the canvas repaints with a new colour assignment and the change can be undone

### Requirement: Main menu is anchored to its button
The hamburger button SHALL open the main menu as a compact dropdown anchored below the button,
leaving the canvas visible, matching the live 230 px popover. It SHALL contain My boards, Scratch
board, Connect AI, Keyboard shortcuts (with a `?` hint), Connect your AI app (guide), Sign in,
Privacy and Terms. It SHALL close on outside click, on the trigger itself, and after choosing an
item. Escape MAY also close it.

#### Scenario: Opening the menu
- **WHEN** the user activates the hamburger button
- **THEN** a roughly 230 px wide popover appears directly below the button rather than as a
  centred full-canvas dialog, and the canvas stays visible

#### Scenario: Item set
- **WHEN** the menu is open
- **THEN** it shows My boards, Scratch board, Connect AI, Keyboard shortcuts, Connect your AI app
  (guide), Sign in, Privacy and Terms

#### Scenario: Dismissing the menu
- **WHEN** the user clicks outside the menu or clicks the hamburger button again
- **THEN** the menu closes and the canvas is unchanged

#### Scenario: Choosing an item
- **WHEN** the user selects a menu action
- **THEN** the action runs and the menu closes

### Requirement: Context bar matches the live control set
When one or more elements are selected, the context bar SHALL show an Auto role chip, a colour
dot button, six shape buttons, A−/A+, Size, a single Layer order control, Lock, Delete and Clean
it, with the live titles and order.

#### Scenario: Control order
- **WHEN** a single shape is selected
- **THEN** the context bar shows Auto, color, Box, Ellipse, Diamond, Cylinder, Pill, Document,
  A−, A+, Size, Layer order, Lock, Delete and Clean it in that order

#### Scenario: Colour dot
- **WHEN** the user activates the colour dot
- **THEN** the selected element's colour can be changed and the dot reflects the current colour

#### Scenario: Layer order
- **WHEN** the user activates Layer order
- **THEN** the element can be brought forward or sent backward from that control

### Requirement: Automation hooks remain stable
The chrome SHALL keep the existing `data-act`, `data-tool` and element id hooks used by the
parity harness for every control that already has one.

#### Scenario: Existing selectors still resolve
- **WHEN** the harness queries `[data-act="menu"]`, `[data-act="zoomout"]`,
  `[data-act="snap"]`, `[data-act="dots"]`, `[data-act="random"]`, `#zoomLabel` or
  `#snapBtn`
- **THEN** each selector resolves to the corresponding control
