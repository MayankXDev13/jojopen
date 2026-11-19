# Board Random Color Specification

## Purpose

Keeps random-color mode active across draws so new shapes automatically receive palette colors until toggled off.

## Requirements

### Requirement: Random mode stays active until toggled

The system SHALL treat Random colors as a persistent mode with visible active styling, SHALL persist the active state across reloads, and SHALL confirm changes with a toast.

#### Scenario: Activating persists

- **WHEN** the user activates Random colors
- **THEN** the control reads as active and remains active after reload until toggled off

#### Scenario: Toggling off stops

- **WHEN** the user toggles Random colors off
- **THEN** the control reads as inactive and new shapes use the default color behavior

### Requirement: New shapes auto-receive palette colors

The system SHALL assign a palette color to every newly drawn shape and arrow while random mode is active and SHALL lock it against automatic theme changes.

#### Scenario: New shape gets random color

- **WHEN** the user draws a shape while random mode is active
- **THEN** the new element appears with a palette color without extra clicks

#### Scenario: Colors vary across draws

- **WHEN** the user draws several shapes while random mode is active
- **THEN** the assigned colors are spread across the palette rather than all identical
