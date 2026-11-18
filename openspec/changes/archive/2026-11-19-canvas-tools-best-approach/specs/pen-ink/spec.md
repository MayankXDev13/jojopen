# pen-ink

## Purpose

Delivers smooth pressure-aware ink for the pen tool, matching tldraw/Excalidraw freehand quality instead of jagged polylines.

## ADDED Requirements

### Requirement: Pen captures pressure-aware strokes
The system SHALL capture pointer pressure (real for pen, velocity-simulated for mouse) and SHALL render outlined smooth strokes with thinning.

#### Scenario: Slow press draws thicker ink
- **WHEN** the user draws slowly or presses harder
- **THEN** the stroke renders wider than fast/light segments

#### Scenario: Shift constrains to straight
- **WHEN** the user holds Shift while drawing
- **THEN** segments snap to 15-degree increments

### Requirement: Strokes simplify and persist efficiently
The system SHALL simplify points on release, SHALL cap stored points, SHALL keep strokes open with no auto-close or fill, and SHALL drop dot-sized strokes.

#### Scenario: Release simplifies without visual jump
- **WHEN** the user releases a long stroke
- **THEN** stored points reduce with no visible shape change

#### Scenario: No auto-close
- **WHEN** the user draws a near-loop stroke
- **THEN** it remains an open outline with no fill

#### Scenario: Stroke erase matches original tolerance
- **WHEN** the eraser crosses a pen stroke within 6/zoom plus stroke width
- **THEN** that stroke is removed in one undoable step
