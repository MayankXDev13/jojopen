# Spec Delta

## Purpose

Lets users draw freehand lines and create connected arrows that stay selectable, labeled, and deletable.

## ADDED Requirements

### Requirement: Line tool draws solid strokes
The system SHALL create a freehand stroke on drag with a live preview and SHALL persist it as a solid continuous stroke with the active width and color.

#### Scenario: Drag draws a line
- **WHEN** the user drags on the canvas with the line tool
- **THEN** a live preview follows the pointer and a solid stroke remains on release

#### Scenario: Stroke renders solid
- **WHEN** a freehand stroke is rendered at any zoom
- **THEN** it appears as one continuous solid stroke without dotted or faint gaps

### Requirement: Arrow tool creates connected arrows
The system SHALL create an arrow on drag, SHALL anchor endpoints to elements when released over them, and SHALL keep routing, labels, and selection working.

#### Scenario: Drag creates an arrow
- **WHEN** the user drags with the arrow tool between two points
- **THEN** an arrow element appears with the chosen routing and remains selected

#### Scenario: Arrow endpoints attach
- **WHEN** the user releases an arrow endpoint over a shape
- **THEN** that endpoint stays attached to the shape during later moves

#### Scenario: Arrow label edits
- **WHEN** the user edits an arrow's label and commits
- **THEN** the label shows on the arrow and persists across reload

#### Scenario: Deleting keeps graph clean
- **WHEN** a connected element is deleted
- **THEN** attached arrow endpoints detach without orphan references
