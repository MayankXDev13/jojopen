# Bound Text Specification

## Purpose

Lets users write text directly inside shapes, stickies, containers, and arrow labels by editing the element's own label, with grow-only autofit like the original.

## Requirements

### Requirement: Double-click edits the element's own label

The system SHALL open inline editing for the element's own label or text on double-click or Enter, with no separate bound-text element.

#### Scenario: Double-click shape edits label

- **WHEN** the user double-clicks a shape, sticky, container, text, or arrow
- **THEN** that element becomes selected and its label editing opens with all text selected

#### Scenario: Double-click empty canvas starts text

- **WHEN** the user double-clicks empty canvas with the select tool
- **THEN** the text tool activates and a new auto-size text editing opens there

#### Scenario: Enter edits selection

- **WHEN** the user presses Enter with one text-capable element selected
- **THEN** inline editing opens for it

### Requirement: Shape labels grow the box on commit

The system SHALL grow a shape's width to its longest word plus padding and its height to wrapped lines on commit, never shrinking, quantized to the grid.

#### Scenario: Long label grows shape

- **WHEN** the user commits a shape label wider than the box
- **THEN** the box grows to fit with padding and existing size is kept otherwise

### Requirement: Every exit commits

The system SHALL commit trailing-trimmed text on blur, Escape, and Cmd/Ctrl+Enter, SHALL delete only empty board text, and SHALL keep empty shape labels as empty labels.

#### Scenario: Escape commits

- **WHEN** the user presses Escape while editing
- **THEN** the trailing-trimmed draft is committed instead of discarded
