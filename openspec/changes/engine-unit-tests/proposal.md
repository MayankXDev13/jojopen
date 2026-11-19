# Proposal: Automated Test Suite for Engine Logic

## Why

JojoPen relies on complex computational geometry, ink smoothing, and diagram DSL parsing, but currently has zero fast automated unit tests in `src/`. Regressions in ray casting, anchor intersection math, stroke simplification, and DSL parsing can easily go unnoticed without manual canvas testing or slow browser CDP harnesses.

## What Changes

- Add a high-speed unit test suite using Bun's native test runner (`bun test`).
- Add comprehensive test coverage for pure geometry algorithms in `src/lib/geometry.ts` (bounding boxes, anchor point math, border intersections, point-to-segment distance, arrow routing, handle hit-testing).
- Add unit tests for freehand ink processing in `src/lib/ink.ts` (pressure simulation, Chaikin smoothing, RDP stroke simplification, 15-degree angle snapping).
- Add unit tests for DSL parsing and diagram generation in `src/lib/dsl.ts` and `src/lib/diagram.ts` (node syntax, edge routing, groups, styling, error diagnostics).
- Add a `test` script in `package.json` to integrate unit testing into standard developer workflows.

## Capabilities

### New Capabilities

None. This change introduces developer-facing automated verification tooling and refactoring safety. It does not alter end-user application capabilities or canvas behavior.

### Modified Capabilities

None. All existing canvas and engine behavior specifications remain unchanged (`skip_specs: true`).

## Impact

- **Test Infrastructure**: Uses Bun's built-in `bun test` runner without adding third-party testing dependencies.
- **Source Code**: Adds `tests/geometry.test.ts`, `tests/ink.test.ts`, `tests/dsl.test.ts`, and updates `package.json` with `"test": "bun test"`. No application runtime logic is modified.
- **Developer Workflow**: Developers and CI can run `bun test` for sub-second regression testing across all mathematical and parsing engine routines.
