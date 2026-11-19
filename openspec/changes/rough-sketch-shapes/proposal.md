# Proposal

## Why

JojoPen shapes, containers, and arrows currently render as rigid geometric boxes with a weak SVG displacement filter, creating a sterile "clean" look even when `style: "sketch"` is active. The original live JojoPen (`jojopen.com`) uses RoughJS to render authentic hand-drawn multi-stroke sketchy outlines, organic corner loops, and textured fills in `sketch` mode, while preserving crisp geometric vectors in `clean` mode. This change restores 100% parity with the original live JojoPen shape and arrow appearance.

## What Changes

- Add `roughjs` as a core dependency for hand-drawn rendering.
- Create a dedicated `src/lib/sketch.ts` module providing:
  - Deterministic seed generation per element ID (FNV-1a hash).
  - Path normalizer (`pk`) segmenting curves into line approximations for rough generation.
  - LRU/Map caching for generated RoughJS path objects (`Bg`).
  - Organic wobbly fill path generator (`Yg`) for shape backgrounds in sketch mode.
  - Dynamic roughness configuration: `sketch` = 1.7, `chalkboard` = 1.1, `clean` = 0.
- Update `src/components/NodeView.tsx`:
  - In `sketch` mode: render shapes (rectangle, ellipse, diamond, cylinder, document, person) and containers with authentic RoughJS multi-stroke sketchy outlines and organic fill paths.
  - In `clean` mode: render crisp single-stroke geometric vector paths with flat fill.
- Update `src/components/Edges.tsx`:
  - In `sketch` mode: render arrow shafts and arrow heads with RoughJS sketchy paths preserving exact endpoint docking.
  - In `clean` or dashed modes: preserve clean vector lines.

## Capabilities

### Modified Capabilities

- `canvas-appearance`: Update rendering requirements for shapes, containers, and arrows to mandate authentic RoughJS hand-drawn sketchy multi-strokes in `sketch` mode, and crisp vector geometry in `clean` mode.

## Impact

- `package.json`, `bun.lock`: Add `roughjs` dependency.
- `src/lib/sketch.ts`: New module for deterministic RoughJS path generation and caching.
- `src/components/NodeView.tsx`: Enhanced shape and container rendering with sketch vs clean support.
- `src/components/Edges.tsx`: Enhanced arrow shaft and arrowhead rendering with sketch vs clean support.
- Zero breaking changes to document models, undo/redo, or persistence.
