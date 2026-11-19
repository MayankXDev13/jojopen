# Spec Delta

## Purpose

Lets users place and edit text on the board and type directly inside shapes without losing content or selection.

## ADDED Requirements

### Requirement: Text tool creates editable board text

The system SHALL create a text element at the clicked board point when the text tool is active and SHALL enter in-place editing immediately.

#### Scenario: Click empty board with text tool

- **WHEN** the user clicks empty board space with the text tool active
- **THEN** a new text element appears at that point and the inline editor is focused

#### Scenario: Empty commit removes the element

- **WHEN** the user commits empty or whitespace-only text for a new element
- **THEN** no empty text element remains on the board

### Requirement: Shapes accept in-place text

The system SHALL allow entering text edit for shape, sticky, and container labels via click or double-click and SHALL persist committed text on the element.

#### Scenario: Click inside shape to type

- **WHEN** the user clicks or double-clicks inside an unlocked shape
- **THEN** the inline editor opens for that shape's label

#### Scenario: Commit keeps selection

- **WHEN** the user commits non-empty text with Enter or blur
- **THEN** the element shows the new text and remains selected

#### Scenario: Cancel discards draft

- **WHEN** the user presses Escape during in-place edit
- **THEN** the draft is discarded and the prior text is unchanged
