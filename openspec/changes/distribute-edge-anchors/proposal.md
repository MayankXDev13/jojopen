# Proposal

## Why

In system diagrams and flowcharts, a single shape often has multiple incoming or outgoing arrows attached to the same face (e.g., a "Create Container" service fanning out to "Namespaces", "Cgroups", and "Container Filesystem", or multiple services fanning into a "Running Container"). Currently, all arrows sharing the same face collapse into the exact geometric center of that face, creating an overlapping stem where multiple lines sit directly on top of each other. Distributing multiple connections across the face eliminates overlapping lines and ensures clear, readable diagram flows matching the original JojoPen behavior.

## What Changes

- Distribute multiple arrow connections that attach to the same face of a shape (top, bottom, left, or right) across that face rather than forcing them all onto a single center point.
- Single arrow connections on a face continue to anchor at the exact face midpoint.
- Order multi-edge connection points along the face according to the relative spatial positions of their opposing endpoints, preventing line crossings.
- Ensure orthogonal arrow routing (`autoOrthogonal`) routes cleanly from each distributed face port without colliding into neighboring stems.

## Capabilities

### Modified Capabilities
- `board-connectors`: Add requirement for distributed connection ports when multiple arrows attach to the same face of a shape.

## Impact

- `src/lib/geometry.ts`: Edge anchor resolution and orthogonal routing to support distributed face points when multiple arrows connect to the same element side.
- `src/lib/diagram.ts`: Diagram layout compilation to assign distributed normalized anchors to branching and merging edges.
- `tests/geometry.test.ts`, `tests/diagram.test.ts`: Unit tests validating distributed multi-arrow attachments and non-overlapping routes.
