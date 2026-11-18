# Canvas Appearance Specification

## Purpose

Defines how the canvas picks element colours and draws its background grid, so the visual
controls in the chrome produce a predictable, persistent result.

## Requirements

### Requirement: Random colors repaints every shape and arrow
Activating Random colors SHALL assign a colour from the board palette to every shape and arrow,
lock those colours against automatic theme changes, update the canvas immediately, and record
the change as one undoable step.

#### Scenario: A board with shapes and arrows
- **WHEN** the user activates Random colors on a board with shapes and arrows
- **THEN** every shape and arrow receives a palette colour and the canvas shows the new colours
  without a reload

#### Scenario: Colours are spread across the palette
- **WHEN** the board has more elements than palette roles
- **THEN** colours are distributed across the available roles before repeating

#### Scenario: The board does not turn monochrome
- **WHEN** the board has two or more elements and Random colors completes
- **THEN** at least two distinct stroke colours are present and not every element is neutral
  `#808080`

### Requirement: Selected-element colour dot
The context bar SHALL provide a colour dot that shows the selected element's colour and opens the
colour picker when activated, so a single element's colour can be changed without using Random
colors.

#### Scenario: Dot reflects the colour
- **WHEN** an element with a palette colour is selected
- **THEN** the dot shows that colour

#### Scenario: Dot changes the colour
- **WHEN** the user picks a colour from the dot
- **THEN** the selected element updates immediately and the change is undoable

#### Scenario: The action is undoable
- **WHEN** the user activates Random colors and then Undo
- **THEN** the previous colours are restored in a single step

#### Scenario: The choice survives reload
- **WHEN** the user reloads the board after using Random colors
- **THEN** the assigned colours are still shown

### Requirement: Random colors gives feedback
Activating Random colors SHALL confirm the action with a toast, matching the other bottom-left
toggles.

#### Scenario: Confirmation message
- **WHEN** Random colors completes
- **THEN** a "Random colors" toast is shown

### Requirement: Dots toggles the background grid
The Dots control SHALL show or hide the canvas dot grid, reflect the state in its active styling,
and persist the preference across reloads. The keyboard shortcut for the grid SHALL perform the
same toggle.

#### Scenario: Hiding the grid
- **WHEN** the user clicks Dots while the grid is visible
- **THEN** the dots disappear and the control no longer reads as active

#### Scenario: Persistence
- **WHEN** the user reloads after hiding the grid
- **THEN** the grid stays hidden

#### Scenario: Keyboard shortcut
- **WHEN** the user presses the grid shortcut
- **THEN** the grid toggles exactly as clicking Dots does
