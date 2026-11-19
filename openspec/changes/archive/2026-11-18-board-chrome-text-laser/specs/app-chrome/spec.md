# Spec Delta

## MODIFIED Requirements

### Requirement: Bottom-left bar matches the live control set and order

The bottom-left bar SHALL start collapsed to the zoom percentage and expand on hover or focus to,
left to right, zoom out, the zoom percentage (reset to 100%), zoom in, Fit, Snap, Dots and Random
colors in one group, followed by Undo and Redo in a second group, with the live labels, icons,
key hints and active styling. Undo and Redo SHALL use curved arrow icons matching the live site.

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

#### Scenario: Undo and redo use curved icons

- **WHEN** the bottom-left bar is visible
- **THEN** Undo and Redo show curved arrow icons rather than straight up and down arrows

### Requirement: Context bar matches the live control set

When one or more elements are selected, the context bar SHALL show an Auto role chip, a colour
dot button, six shape buttons, A−/A+, a single Layer order control, Lock, Delete and Clean
it, with the live titles and order. Element sizing stays with A−/A+ only; no zoom-like size
indicator is shown.

#### Scenario: Control order

- **WHEN** a single shape is selected
- **THEN** the context bar shows Auto, color, Box, Ellipse, Diamond, Cylinder, Pill, Document,
  A−, A+, Layer order, Lock, Delete and Clean it in that order

#### Scenario: No zoom-like size indicator

- **WHEN** any element is selected
- **THEN** the context bar shows no static size label that could read as canvas zoom

#### Scenario: Colour dot

- **WHEN** the user activates the colour dot
- **THEN** the selected element's colour can be changed and the dot reflects the current colour

#### Scenario: Layer order

- **WHEN** the user activates Layer order
- **THEN** the element can be brought forward or sent backward from that control
