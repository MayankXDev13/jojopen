# Tasks

## 1. Multi-Edge Face Anchor Distribution

- [x] 1.1 Compute outgoing and incoming face edge groups in `compileDiagramDoc` (`src/lib/diagram.ts`) and assign ordered, distributed normalized anchors across the face when multiple edges connect to the same side
- [x] 1.2 Ensure single-connection edges retain the exact 0.5 face center anchor without shifting

## 2. Orthogonal Route Port Preservation

- [x] 2.1 Update `autoOrthogonal` and corridor routing in `src/lib/geometry.ts` to route cleanly from distributed `p0` and `p1` anchor points without snapping them back to a single midpoint
- [x] 2.2 Ensure parallel departure and arrival stems maintain distinct tracks and jog cleanly into destination nodes

## 3. Verification & Parity

- [x] 3.1 Add unit tests in `tests/diagram.test.ts` and `tests/geometry.test.ts` verifying distributed anchor allocation and non-overlapping routes for branching/merging nodes
- [x] 3.2 Run `bun test` and `bun run build` to confirm all 105+ tests and production build pass cleanly
