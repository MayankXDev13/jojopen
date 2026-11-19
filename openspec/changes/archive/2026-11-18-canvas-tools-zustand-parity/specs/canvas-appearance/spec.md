# Spec Delta

## MODIFIED Requirements

### Requirement: Random colors repaints every shape and arrow

Activating Random colors SHALL assign a colour from the board palette to every shape and arrow, lock those colours against automatic theme changes, update the canvas immediately, keep the control in an active state until toggled off, and record the change as one undoable step.

#### Scenario: A board with shapes and arrows

- **WHEN** the user activates Random colors on a board with shapes and arrows
- **THEN** every shape and arrow receives a palette colour and the canvas shows the new colours without a reload

#### Scenario: Colours are spread across the palette

- **WHEN** the board has more elements than palette roles
- **THEN** colours are distributed across the available roles before repeating

#### Scenario: The board does not turn monochrome

- **WHEN** the board has two or more elements and Random colors completes
- **THEN** at least two distinct stroke colours are present and not every element is neutral `#808080`

#### Scenario: Active state remains

- **WHEN** the user activates Random colors
- **THEN** the control reads as active and stays active until toggled off

## ADDED Requirements

### Requirement: Sticky renders folded corner

The system SHALL render sticky notes with a folded corner and soft shadow matching the live site at any zoom.

#### Scenario: Sticky shows fold

- **WHEN** a sticky note is visible on the board
- **THEN** it shows a folded corner and shadow rather than a flat square

### Requirement: Freehand renders solid and opaque

The system SHALL render freehand strokes as solid opaque strokes at the element width and color without dotted or faded artifacts.

#### Scenario: Pen stroke is solid

- **WHEN** the user draws a pen stroke
- **THEN** the stroke appears solid and continuous rather than dotted or faint

### Requirement: Zoom and palette match live visuals

The system SHALL show zoom presets in live order with the current zoom marked and SHALL show the color palette row with live colors and active states.

#### Scenario: Zoom menu order

- **WHEN** the zoom menu is open
- **THEN** presets appear from 0.75x to 2x with the current level marked

#### Scenario: Palette row matches live

- **WHEN** the color palette is visible
- **THEN** it shows the live color set in live order with the active color indicated
