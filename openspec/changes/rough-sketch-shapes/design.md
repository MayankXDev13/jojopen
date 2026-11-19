# Design

## Context

See `proposal.md` for motivation. Currently, `src/components/NodeView.tsx` and `src/components/Edges.tsx` render standard SVG geometry with a CSS/SVG displacement map filter `url(#rough)`. This leaves shapes appearing like clean computer-drawn boxes. The live original JojoPen (`jojopen.com`) uses RoughJS's path generator with deterministic seeds to produce authentic hand-drawn multi-stroke outlines, organic corner overshoots, and wobbly fill contours.

## Goals / Non-Goals

**Goals:**

- Provide 100% visual parity with original JojoPen in `sketch` mode (hand-drawn multi-stroke sketchy outlines and organic fills).
- Provide crisp, modern single-stroke vector lines in `clean` mode.
- Support `chalkboard` mode with intermediate roughness (`1.1`).
- Ensure deterministic rendering without flickering during pan/zoom/drag using element ID hashing (`FNV-1a`) and memory caching.

**Non-Goals:**

- Changing document data schemas or storage formats.
- Changing bounding box interaction or text editing behavior.

## Decisions

### Decision 1: Use RoughJS Generator with SVG `<path>` Rendering

- **Rationale**: JojoPen renders canvas nodes as React DOM / SVG elements (`NodeView.tsx`, `Edges.tsx`). Using `rough.generator().path()` and `generator.toPaths()` produces SVG path data strings (`d`) that integrate seamlessly into existing React SVG components without switching to an imperative canvas.
- **Alternative considered**: Imperative HTML5 `<canvas>` rendering. Rejected because it would break React DOM layer ordering, slide masking, text editing overlays, and accessibility.

### Decision 2: Deterministic Seeding via FNV-1a Hash

- **Rationale**: Element IDs are stable UUIDs/strings. Hashing the element ID using FNV-1a yields a consistent pseudo-random integer seed for RoughJS. Every render of the same element produces the exact same stroke contours, preventing flickering or jitter during zoom and pan.
- **Alternative considered**: Random seeds on each render. Rejected because it causes extreme visual flickering during interactions.

### Decision 3: Path Normalization (`pk`) for Rough Path Curves

- **Rationale**: RoughJS's path parser performs best on segmented lines and beziers. The path normalizer (`pk`) segments curve and arc commands (`Q`, `C`, `A`, `H`, `V`) into smooth points for the rough generator, matching the original JojoPen implementation.

### Decision 4: Global LRU / Map Caching for Rough Paths

- **Rationale**: Cache keys formatted as `${id}|${d}|${stroke}|${strokeWidth}|${roughness}|${dashed}` ensure path calculation happens only once per element state. Panning, zooming, and selections reuse cached paths with zero performance impact.

## Risks / Trade-offs

- **[Risk]** Memory growth from cached rough paths in long sessions → **Mitigation**: Clear cache if size exceeds 5,000 entries (matching live implementation).
- **[Risk]** Arrow docking precision with rough multi-strokes → **Mitigation**: Use `preserveVertices: true` and `marker: true` for arrows and arrow heads to keep tips exactly pinned to connection points.
