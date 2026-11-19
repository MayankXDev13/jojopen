# Design

## Context

See `proposal.md` for motivation. In `compileDiagramDoc` (`src/lib/diagram.ts`), edges are translated into arrow elements with attached start and end anchors. In `src/lib/geometry.ts`, `arrowGeom` and `autoOrthogonal` route the path between source and target elements. Previously, all edges sharing a side used hardcoded 50% normalized anchors, causing multiple arrows connecting to the same face to collapse onto a single overlapping coordinate.

## Goals / Non-Goals

**Goals:**
- Detect multiple edges sharing the same face (top, bottom, left, right) on a source or target node during diagram compilation and layout.
- Order multi-edge connection ports along the face based on the relative spatial order of the connected peers to prevent unnecessary line crossings.
- Distribute the anchor points across the face (e.g. `(i + 1) / (k + 1)` clamped within comfortable padding from shape corners).
- Ensure `autoOrthogonal` honors the distributed `p0` and `p1` anchor points so stems emerge and enter parallel and distinct.

**Non-Goals:**
- Arbitrary freehand arrow manual anchor repositioning (this design focuses on diagram compilation and auto-routed multi-edge distribution).
- Changing single-connection arrows (single connections remain at the exact face midpoint).

## Decisions

### Decision 1: Multi-edge grouping and sorting in `compileDiagramDoc`
- Group edges per node and per face:
  - Outgoing edges: group by source node and departure side.
  - Incoming edges: group by target node and arrival side.
- For each group with count $k > 1$:
  - If departure/arrival is on a horizontal face (top or bottom), sort the edges by the opposing endpoint's X position (`toEl.x` or `fromEl.x`).
  - If departure/arrival is on a vertical face (left or right), sort the edges by the opposing endpoint's Y position (`toEl.y` or `fromEl.y`).
  - Assign normalized anchors evenly distributed across the face: `t = (i + 1) / (k + 1)` (or mapped across a safe inner span, e.g., `0.2` to `0.8`).
- Rationale: Sorting by opposing node coordinates guarantees that branching lines fan out in spatial order without crossing each other.

### Decision 2: Honor distributed anchors in `autoOrthogonal`
- When `p0` and `p1` are provided with distinct distributed offsets on their respective faces, `autoOrthogonal` routes perpendicular stubs directly from `p0` and `p1`.
- For vertical fan-outs (e.g. downward branching):
  - Each arrow drops straight down from its distributed source X coordinate `p0.x`.
  - The horizontal corridor bus connects `p0.x` to `p1.x` at a clean intermediate Y coordinate.
  - The arrow drops into target `p1.x` cleanly.
- Rationale: Stems remain parallel and spaced apart, exactly matching the original JojoPen visual layout.

## Risks / Trade-offs

- **[Risk] Extreme edge counts on small shapes** → Mitigation: Clamp anchor offsets to safe margins (minimum 8px from shape edges) and set a minimum port pitch.
- **[Risk] Misalignment if single arrows shift** → Mitigation: Only apply distributed spacing when edge group size $k > 1$. Single edges strictly retain the exact center anchor (`0.5`).
