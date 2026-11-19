# Sticky Note Specification

## Purpose

Provides quick yellow notes with plain-text editing, auto-grow, and alignment.

## Requirements

### Requirement: Sticky tool creates editable notes

The system SHALL create a sticky at the clicked point and SHALL enter editing immediately.

#### Scenario: Click creates sticky

- **WHEN** the user clicks with the sticky tool
- **THEN** a 200x200 note appears and editing starts

### Requirement: Stickies auto-grow and align

The system SHALL grow sticky height to fit wrapped text and SHALL support left/center alignment.

#### Scenario: Long note grows taller

- **WHEN** sticky text wraps beyond current height on commit
- **THEN** height grows to show all lines
