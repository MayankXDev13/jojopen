# eraser

## Purpose

Erases any board content by collision, including ink and arrows, with a temporary shortcut.

## ADDED Requirements

### Requirement: Eraser deletes by collision

The system SHALL delete shapes, ink strokes, arrows, text, and stickies whose collision shape intersects the eraser path.

#### Scenario: Stroke erase removes ink

- **WHEN** the eraser crosses a pen stroke
- **THEN** that stroke is removed in one undoable step

#### Scenario: Arrow erase detaches cleanly

- **WHEN** the eraser removes a bound arrow
- **THEN** bindings detach without orphans

### Requirement: Temporary eraser switch

The system SHALL allow holding Ctrl or pressing E for temporary erase and SHALL restore the prior tool on release.

#### Scenario: Hold to erase and restore

- **WHEN** the user holds Ctrl while drawing
- **THEN** erase mode activates and the previous tool restores on release
