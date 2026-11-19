# Tasks

## 1. Setup & Dependencies

- [x] 1.1 Verify `roughjs` dependency in `package.json` and ensure clean installation via `bun install`
- [x] 1.2 Create `src/lib/sketch.ts` with RoughJS generator instance, FNV-1a hash seeder (`seedFromId`), path segmenter (`pk`), cache storage, and `generateRoughPath` / `generateFillPath` functions
- [x] 1.3 Add unit test `tests/sketch.test.ts` verifying deterministic seeding, path caching, and sketch vs clean style outputs

## 2. Shape & Container Rendering

- [x] 2.1 Update `src/components/NodeView.tsx` to render authentic RoughJS sketchy paths and organic fill paths in `sketch` mode, crisp vector paths in `clean` mode, and intermediate roughness in `chalkboard` mode
- [x] 2.2 Update container elements in `src/components/NodeView.tsx` to use RoughJS sketchy outlines in `sketch` mode
- [x] 2.3 Verify shape and container rendering with unit tests and ensure existing node tests pass

## 3. Arrow & Connector Parity

- [x] 3.1 Update `src/components/Edges.tsx` to render arrow shafts and arrowheads with RoughJS sketchy paths when in `sketch` mode with precise vertex preservation
- [x] 3.2 Verify arrow and connector rendering across both curved and orthogonal modes with existing geometry tests

## 4. Integration Verification

- [x] 4.1 Run full test suite (`bun test`) and typecheck (`bun run typecheck`) to ensure zero regressions
- [x] 4.2 Verify production build succeeds with `bun run build`
