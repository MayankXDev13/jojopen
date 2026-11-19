# Spec Delta

## ADDED Requirements

### Requirement: Arrow endpoints distribute across shared faces

The system SHALL distribute multiple arrow connection points across a shape face when multiple arrows attach to the same side of that shape, rather than collapsing all connections into a single center point.

#### Scenario: Multiple outgoing arrows from one face

- **WHEN** multiple arrows originate from the same face of a source shape (such as bottom edge)
- **THEN** their departure anchor points are spaced across that face and ordered according to the relative positions of their target shapes

#### Scenario: Multiple incoming arrows to one face

- **WHEN** multiple arrows terminate on the same face of a target shape (such as top edge)
- **THEN** their arrival anchor points are spaced across that face without overlapping into a single stem

#### Scenario: Single arrow remains centered

- **WHEN** only one arrow connects to a given face of a shape
- **THEN** that arrow connects to the exact center of that face
