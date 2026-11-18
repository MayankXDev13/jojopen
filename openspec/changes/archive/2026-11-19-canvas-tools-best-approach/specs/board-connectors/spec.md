# board-connectors — Delta

## MODIFIED Requirements

### Requirement: Line tool draws solid strokes
The system SHALL create a freehand stroke on drag with live preview and SHALL persist it as a solid continuous stroke with active width and color.

#### Scenario: Drag draws a line
- **WHEN** the user drags on the canvas with the line tool
- **THEN** a live preview follows the pointer and a solid stroke remains on release

#### Scenario: Stroke renders solid
- **WHEN** a freehand stroke is rendered at any zoom
- **THEN** it appears as one continuous solid stroke without dotted or faint gaps

### Requirement: Arrow tool creates connected arrows
The system SHALL create arrows with anchor bindings, SHALL show a suggested-binding highlight while dragging, SHALL allow endpoint/midpoint re-binding, and SHALL keep labels draggable and persistent.

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

#### Scenario: Hover shows binding target
- **WHEN** an arrow endpoint hovers a bindable shape while drawing or dragging
- **THEN** the target highlights as the suggested binding

#### Scenario: Release binds with anchor
- **WHEN** the user releases an endpoint over a highlighted shape
- **THEN** the binding stores normalized anchor, exact/precise flags, and snap mode

#### Scenario: Endpoints re-bind after creation
- **WHEN** the user drags an existing endpoint or midpoint handle
- **THEN** waypoints update, elbow re-routes, and binding re-attaches or clears

#### Scenario: Label stays on path
- **WHEN** an arrow with a label moves or re-routes
- **THEN** the label remains centered on the path and editable inline
