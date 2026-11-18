# Tasks: Automated Test Suite for Engine Logic

## 1. Test Runner Configuration

- [x] 1.1 Add `"test": "bun test"` script to `package.json` and verify with `bun test`

## 2. Geometry Unit Tests

- [x] 2.1 Implement `tests/geometry.test.ts` for bounds, containment, and distance math (`elementBounds`, `boundsOf`, `pointInElement`, `distPointToSeg`, `distToElement`) and verify with `bun test tests/geometry.test.ts`
- [x] 2.2 Add tests in `tests/geometry.test.ts` for anchor ray-casting (`centerOf`, `anchorPoint`) across all shape types and suggested bindings (`normalizedAnchorOf`, `suggestedBinding`) and verify with `bun test tests/geometry.test.ts`
- [x] 2.3 Add tests in `tests/geometry.test.ts` for connector handles, point cleanup, and arrow routing (`arrowHandlesFor`, `hitArrowHandle`, `cleanupArrowPoints`, `arrowGeom`) and verify with `bun test tests/geometry.test.ts`

## 3. Ink Engine Unit Tests

- [x] 3.1 Implement `tests/ink.test.ts` for pressure dynamics (`simulatePressure`) and streamline/Chaikin smoothing (`streamline`, `chaikin`) and verify with `bun test tests/ink.test.ts`
- [x] 3.2 Add tests in `tests/ink.test.ts` for stroke simplification (`simplify`), 15-degree angle snapping (`snapAngle15`), and path generation (`strokeOutlinePath`) and verify with `bun test tests/ink.test.ts`

## 4. DSL and Diagram Unit Tests

- [x] 4.1 Implement `tests/dsl.test.ts` for node, edge, and group parsing in `parseDSL` and verify with `bun test tests/dsl.test.ts`
- [x] 4.2 Add error diagnostic test cases in `tests/dsl.test.ts` for invalid syntax reporting and verify with `bun test tests/dsl.test.ts`
- [x] 4.3 Implement `tests/diagram.test.ts` for `nodePaint`, `shapeMarkup`, and `diagramSVG` generation and verify with `bun test tests/diagram.test.ts`

## 5. Verification

- [x] 5.1 Run the full test suite via `bun run test` and verify all tests pass cleanly in under 1 second
