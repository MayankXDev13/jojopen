# Spec Delta

## Purpose

Lets users resize elements precisely and control canvas zoom so Size and viewport actions always respond.

## ADDED Requirements

### Requirement: Selection resizes via handles and Size control
The system SHALL show resize handles for a single unlocked selection and SHALL apply handle drags and Size control steps to element dimensions.

#### Scenario: Drag handle resizes
- **WHEN** the user drags a resize handle on a selected shape or text
- **THEN** the element dimensions update live and persist on release

#### Scenario: Size control steps
- **WHEN** the user activates Size increase or decrease with a selection
- **THEN** the selected elements grow or shrink and the change is undoable

### Requirement: Zoom presets and Fit respond
The system SHALL provide zoom presets from 0.75x to 2x, Fit-to-content, and 100% reset, and SHALL update the viewport and zoom label on activation.

#### Scenario: Zoom preset applies
- **WHEN** the user picks a zoom preset such as 1.5x
- **THEN** the viewport zooms around the viewport center and the label shows the new percentage

#### Scenario: Fit frames content
- **WHEN** the user activates Fit with content on the board
- **THEN** all content becomes visible and the zoom label updates

#### Scenario: Zoom label resets
- **WHEN** the user clicks the zoom percentage label
- **THEN** the zoom returns to 100%
