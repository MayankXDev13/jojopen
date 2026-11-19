# Laser Pointer Specification

## Purpose

Gives presenters a red line-trail pointer that is easy to follow while presenting, without leaving any marks on the board.

## Requirements

### Requirement: Laser draws a red line trail

The system SHALL render the laser pointer as a continuous red line following the pointer path with rounded caps, activating only while the primary button is held; hovering with no button pressed draws nothing.

#### Scenario: Moving pointer leaves a red trail

- **WHEN** the user presses, holds, and moves with the laser tool active
- **THEN** a red line trail follows the pointer path instead of disconnected dots

#### Scenario: Hover alone draws nothing

- **WHEN** the user moves the pointer over the canvas with the laser tool active but no button pressed
- **THEN** no trail appears

#### Scenario: Trail fades after release

- **WHEN** the user releases the button
- **THEN** the trail fades out gradually over under a second instead of vanishing instantly

### Requirement: Laser hides the OS cursor and shows a red dot

While the laser tool is active, the system SHALL hide the operating-system pointer over the canvas and SHALL show a red dot marking the pointer position.

#### Scenario: Red dot instead of arrow

- **WHEN** the laser tool is active and the pointer is over the canvas
- **THEN** no arrow cursor is visible and a red dot marks the point

#### Scenario: Laser leaves no board marks

- **WHEN** the laser trail fades
- **THEN** no element is added to the board and undo history is unchanged
