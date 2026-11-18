# Design: Automated Test Suite for Engine Logic

## Context

JojoPen is built with Bun 1.4.0 and TypeScript. The application core contains extensive mathematical algorithms and string parsers across `src/lib/`:
- `geometry.ts`: Ray-casting, polygon/ellipse boundary ray intersections, anchor point snap math, and arrow routing.
- `ink.ts`: Pointer event smoothing, simulated stylus pressure dynamics, Chaikin corner rounding, and Ramer-Douglas-Peucker stroke point simplification.
- `dsl.ts` & `diagram.ts`: Custom domain-specific diagram syntax parser, edge/node AST generation, and SVG rendering.

Currently, verification relies on end-to-end browser interaction (CDP scripts in `docs/harness/`). Adding fast, headless unit tests enables sub-second validation during refactors and feature additions.

## Goals / Non-Goals

**Goals:**
- Provide zero-config, sub-second test execution using `bun test`.
- Thoroughly test pure mathematical calculations and parsing logic without needing a DOM or browser context.
- Verify boundary conditions, edge cases, and error recovery (e.g. division by zero in ray casting, invalid DSL syntax, degenerate stroke paths).
- Expose a standard `bun run test` / `bun test` command in `package.json`.

**Non-Goals:**
- UI / DOM component testing (testing React components or canvas canvas rendering handles is deferred to visual harness / e2e).
- Modifying or refactoring the underlying mathematical algorithms in this change.

## Decisions

### 1. Test Runner: `bun:test`
- **Choice:** Use Bun's native test runner (`bun test` / `import { describe, test, expect } from "bun:test"`).
- **Rationale:** The repository already specifies `bun@1.4.0` in `package.json`. `bun:test` executes TypeScript directly without transpilation steps, requires zero npm packages to install, and executes tests in milliseconds.
- **Alternatives Considered:**
  - *Vitest*: Requires installing `vitest`, `@vitest/ui`, and configuring Vite test plugins. Unnecessary overhead for pure logic modules.
  - *Jest*: Slower and requires complex Babel/TS transform configurations.

### 2. Test File Organization: `tests/` Directory
- **Choice:** Place unit test files in a dedicated `tests/` root directory:
  - `tests/geometry.test.ts`
  - `tests/ink.test.ts`
  - `tests/dsl.test.ts`
  - `tests/diagram.test.ts`
- **Rationale:** Keeps application source code in `src/` clean while allowing `bun test` to discover all test files automatically.

### 3. Test Coverage Strategy per Module

#### `geometry.test.ts`
- **Bounds calculation:** `elementBounds`, `boundsOf` with empty arrays, single elements, and disparate bounding boxes.
- **Point containment:** `pointInElement` for rectangular and elliptical shapes.
- **Distance & Snapping:** `distPointToSeg`, `distToElement`, `normalizedAnchorOf`, and `suggestedBinding` threshold checks.
- **Ray & Anchor Math:** `anchorPoint` ray intersection calculations for all supported shapes (`rectangle`, `rounded`, `ellipse`, `diamond`, `cylinder`, `document`, `person`, `sticky`).
- **Arrow Routing & Handles:** `arrowGeom` (straight, orthogonal, curved), `cleanupArrowPoints`, and handle hit-testing (`hitArrowHandle`).

#### `ink.test.ts`
- **Stylus & Pressure:** `simulatePressure` limits and speed scaling; `streamline` interpolation.
- **Smoothing & Simplification:** `chaikin` point doubling/corner rounding; `simplify` (RDP algorithm) reducing collinear points while preserving curve endpoints.
- **Angle Snapping:** `snapAngle15` verifying snapping to 0°, 15°, 30°, 45°, 90°, etc., when Shift is held.
- **SVG Path Generation:** `strokeOutlinePath` verifying valid SVG polygon/path string output.

#### `dsl.test.ts` & `diagram.test.ts`
- **Node & Shape Parsing:** Parsing nodes with custom shapes (`[server]`, `(user)`, `database`), labels, colors, and icon identifiers.
- **Edge Parsing:** Directed (`->`), bidirectional (`<->`), dashed (`-->`), and labeled connectors.
- **Container / Group Parsing:** Nested groupings and scope.
- **Error Diagnostics:** Diagnostics reporting for unbalanced brackets, unknown tokens, and syntax errors.
- **SVG Generation:** `diagramSVG` output structure and `nodePaint` attribute resolution.

## Risks / Trade-offs

- **[Risk] Node/Browser DOM Globals Missing:** Some functions in `src/lib/` could inadvertently touch `window` or `document`.
  - *Mitigation:* The modules selected (`geometry.ts`, `ink.ts`, `dsl.ts`, `diagram.ts`) are pure mathematical and string manipulation modules. Any helper referencing `document` (such as `dom.ts`) is avoided in unit tests or mocked if necessary.
- **[Risk] Floating Point Precision Differences:** Ray intersection math and trigonometric calculations can produce minor floating-point variations.
  - *Mitigation:* Use `toBeCloseTo()` for float assertions rather than exact equality.
