# Board Text Editing Specification

## Purpose

Lets users place and edit text on the board and type directly inside shapes without losing content or selection.

## Requirements

### Requirement: Text tool creates editable board text
The system SHALL create auto-size text on click and fixed-width wrapped text on drag, and SHALL enter in-place editing immediately with live measured sizing.

#### Scenario: Click empty board with text tool
- **WHEN** the user clicks empty board space with the text tool active
- **THEN** a new text element appears at that point and the inline editor is focused

#### Scenario: Empty commit removes the element
- **WHEN** the user commits empty or whitespace-only text for a new element
- **THEN** no empty text element remains on the board

#### Scenario: Click creates auto-size text
- **WHEN** the user clicks with the text tool
- **THEN** an auto-size element appears at the click point and editing starts

#### Scenario: Drag creates fixed-width text
- **WHEN** the user drags beyond 36px with the text tool
- **THEN** a fixed-width element with that wrap width is created and editing starts

#### Scenario: Enter inserts newline
- **WHEN** the user presses Enter while editing
- **THEN** a newline is inserted instead of committing

#### Scenario: Commit exits editing
- **WHEN** the user presses Cmd/Ctrl+Enter, Esc, or clicks outside
- **THEN** editing commits and the element persists with fitted size

### Requirement: Shapes accept in-place text
The system SHALL allow entering text edit for shape, sticky, and container labels via click or double-click and SHALL persist committed text on the element.

#### Scenario: Click inside shape to type
- **WHEN** the user clicks or double-clicks inside an unlocked shape
- **THEN** the inline editor opens for that shape's label

#### Scenario: Commit keeps selection
- **WHEN** the user commits non-empty text with Cmd/Ctrl+Enter or blur
- **THEN** the element shows the new text and remains selected

#### Scenario: Cancel discards draft
- **WHEN** the user presses Escape during in-place edit of an existing element
- **THEN** the draft is discarded and the prior text is unchanged

#### Scenario: Double-click edits label
- **WHEN** the user double-clicks a shape or arrow label
- **THEN** inline editing opens for that label

#### Scenario: Empty text cleans up
- **WHEN** the user commits empty board text
- **THEN** the element is removed instead of persisting empty
