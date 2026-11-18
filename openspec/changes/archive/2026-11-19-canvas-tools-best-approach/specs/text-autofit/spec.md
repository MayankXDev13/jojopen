# text-autofit — Delta

## MODIFIED Requirements

### Requirement: Editor auto-grows while typing
The system SHALL grow the inline editor's height to fit its content as the user types, SHALL wrap text inside sized elements, and SHALL keep focus without scrolling the page.

#### Scenario: Typing grows the editor
- **WHEN** the user types past the editor's initial height
- **THEN** the editor grows taller to show all content without an internal scrollbar

#### Scenario: Shape text wraps
- **WHEN** the user edits text inside a shape, sticky, or container
- **THEN** lines wrap at the element width instead of overflowing sideways

#### Scenario: Tab inserts spaces
- **WHEN** the user presses Tab inside the editor
- **THEN** spaces are inserted instead of moving focus away

#### Scenario: Typing grows editor with real metrics
- **WHEN** the user types past the initial height
- **THEN** the editor grows using measured canvas text metrics with no internal scrollbar

#### Scenario: Zoom-aware max wrap
- **WHEN** auto-size text grows beyond max wrap width
- **THEN** it wraps at 800 scene units (or 800 screen px when zoomed out, capped at 2000)

### Requirement: Committed elements autofit their text
The system SHALL resize the element on commit so committed text is never clipped: text elements fit their content size, and shapes and stickies grow taller to fit wrapped lines.

#### Scenario: Text element fits content
- **WHEN** the user commits board text
- **THEN** the element dimensions fit the rendered lines with padding and nothing is clipped

#### Scenario: Shape grows to wrapped lines
- **WHEN** the user commits a multi-line label that exceeds the shape height
- **THEN** the shape grows taller to show every line

#### Scenario: Auto-size fits content
- **WHEN** auto-size text is committed
- **THEN** width and height match measured lines with padding and nothing clips

#### Scenario: Edge drag converts to fixed-width
- **WHEN** the user drags an auto-size text edge
- **THEN** it becomes fixed-width at that width and wraps thereafter
