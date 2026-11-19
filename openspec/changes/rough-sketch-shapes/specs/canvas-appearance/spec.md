# Spec Delta

## ADDED Requirements

### Requirement: Sketch and clean rendering parity for shapes and connectors

The system SHALL render shapes (rectangles, ellipses, diamonds, cylinders, documents, persons), containers, and arrow connectors using authentic hand-drawn multi-stroke sketchy outlines and organic fills when the canvas style is `sketch`, and clean crisp geometric vector lines when the canvas style is `clean`.

#### Scenario: Rendering shapes in sketch mode

- **WHEN** the canvas appearance style is set to "sketch"
- **THEN** shape borders display hand-drawn multi-stroke sketchy outlines with natural bowing and organic corner overshoots, and shape fills display organic contour boundaries rather than rigid computer-drawn edges

#### Scenario: Rendering shapes in clean mode

- **WHEN** the canvas appearance style is set to "clean"
- **THEN** shapes render with crisp, single-stroke geometric vector lines, zero roughness, and flat fills

#### Scenario: Rendering arrows in sketch mode

- **WHEN** an arrow or connector is rendered in "sketch" style
- **THEN** its shaft and arrowheads are rendered using hand-drawn rough sketchy strokes while precisely docking at start and end attachment points

#### Scenario: Deterministic rendering across re-renders

- **WHEN** elements are re-rendered during panning, zooming, or editing
- **THEN** each element's rough strokes remain completely stable without flickering due to deterministic seed hashing based on element ID
