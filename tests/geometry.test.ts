import { describe, test, expect } from "bun:test";
import {
  elementBounds,
  boundsOf,
  pointInElement,
  nextFrameElement,
  normalizedAnchorOf,
  suggestedBinding,
  distPointToSeg,
  distToElement,
  arrowHandlesFor,
  cleanupArrowPoints,
  centerOf,
  anchorPoint,
  hitArrowHandle,
  arrowGeom,
  projectOntoPolyline,
  pointAlongPolyline,
} from "../src/lib/geometry";
import type { BoardElement } from "../src/lib/model";
import { THEME } from "../src/lib/palette";

function makeEl(partial: Partial<BoardElement>): BoardElement {
  return {
    id: "el-1",
    type: "shape",
    version: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    index: 1,
    angle: 0,
    frameId: null,
    groupIds: [],
    locked: false,
    role: null,
    color: null,
    colorLocked: false,
    meta: {},
    ...partial,
  };
}

describe("Geometry: Bounds and Containment", () => {
  test("elementBounds computes correct bounding box for shape", () => {
    const el = makeEl({ x: 20, y: 30, width: 200, height: 100 });
    const b = elementBounds(el);
    expect(b).toEqual({ minX: 20, minY: 30, maxX: 220, maxY: 130 });
  });

  test("elementBounds handles arrow/freehand with relative points", () => {
    const arrow = makeEl({
      type: "arrow",
      x: 100,
      y: 50,
      points: [
        { x: 0, y: 0 },
        { x: 40, y: -20 },
        { x: 100, y: 80 },
      ],
    });
    const b = elementBounds(arrow);
    expect(b).toEqual({ minX: 100, minY: 30, maxX: 200, maxY: 130 });
  });

  test("boundsOf returns null for empty list", () => {
    expect(boundsOf([])).toBeNull();
  });

  test("boundsOf aggregates multiple elements and computes width/height", () => {
    const el1 = makeEl({ x: 0, y: 0, width: 50, height: 50 });
    const el2 = makeEl({ x: 100, y: 200, width: 100, height: 50 });
    const b = boundsOf([el1, el2]);
    expect(b).not.toBeNull();
    expect(b!.minX).toBe(0);
    expect(b!.minY).toBe(0);
    expect(b!.maxX).toBe(200);
    expect(b!.maxY).toBe(250);
    expect(b!.width).toBe(200);
    expect(b!.height).toBe(250);
  });

  test("pointInElement checks boundaries accurately", () => {
    const el = makeEl({ x: 10, y: 10, width: 50, height: 50 });
    expect(pointInElement(10, 10, el)).toBe(true);
    expect(pointInElement(35, 35, el)).toBe(true);
    expect(pointInElement(60, 60, el)).toBe(true);
    expect(pointInElement(9, 35, el)).toBe(false);
    expect(pointInElement(61, 35, el)).toBe(false);
    expect(pointInElement(35, 9, el)).toBe(false);
    expect(pointInElement(35, 61, el)).toBe(false);
  });
});

describe("Geometry: Distance Calculations", () => {
  test("distPointToSeg calculates perpendicular and endpoint distances", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };

    // Point on segment
    expect(distPointToSeg({ x: 5, y: 0 }, a, b)).toBe(0);
    // Point perpendicular to segment
    expect(distPointToSeg({ x: 5, y: 4 }, a, b)).toBe(4);
    // Point past start
    expect(distPointToSeg({ x: -3, y: 4 }, a, b)).toBe(5);
    // Point past end
    expect(distPointToSeg({ x: 13, y: 4 }, a, b)).toBe(5);
  });

  test("distToElement computes distance to box or polyline", () => {
    const box = makeEl({ x: 10, y: 10, width: 20, height: 20 });
    // Inside box
    expect(distToElement({ x: 15, y: 15 }, box)).toBe(0);
    // Outside along x
    expect(distToElement({ x: 40, y: 20 }, box)).toBe(10);
    // Outside along corner diagonal (3, 4, 5 triangle)
    expect(distToElement({ x: 33, y: 34 }, box)).toBeCloseTo(5);

    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    expect(distToElement({ x: 50, y: 10 }, arrow)).toBe(10);
  });
});

describe("Geometry: Anchor and Snapping Math", () => {
  test("normalizedAnchorOf computes normalized coordinates clamped 0..1", () => {
    const el = makeEl({ x: 100, y: 100, width: 200, height: 100 });
    expect(normalizedAnchorOf(el, { x: 200, y: 150 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(normalizedAnchorOf(el, { x: 100, y: 100 })).toEqual({ x: 0, y: 0 });
    expect(normalizedAnchorOf(el, { x: 300, y: 200 })).toEqual({ x: 1, y: 1 });
    // Outside clamped
    expect(normalizedAnchorOf(el, { x: 50, y: 50 })).toEqual({ x: 0, y: 0 });
    expect(normalizedAnchorOf(el, { x: 400, y: 300 })).toEqual({ x: 1, y: 1 });
  });

  test("suggestedBinding finds topmost element and returns normalized anchor", () => {
    const bottom = makeEl({
      id: "bottom",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const top = makeEl({ id: "top", x: 20, y: 20, width: 60, height: 60 });
    const list = [bottom, top];

    // Inside top
    const res1 = suggestedBinding(list, { x: 50, y: 50 });
    expect(res1).not.toBeNull();
    expect(res1!.el.id).toBe("top");
    expect(res1!.anchor.x).toBeCloseTo(0.5);
    expect(res1!.anchor.y).toBeCloseTo(0.5);

    // Inside bottom only
    const res2 = suggestedBinding(list, { x: 10, y: 10 });
    expect(res2).not.toBeNull();
    expect(res2!.el.id).toBe("bottom");

    // Excluded id
    const res3 = suggestedBinding(list, { x: 50, y: 50 }, "top");
    expect(res3).not.toBeNull();
    expect(res3!.el.id).toBe("bottom");

    // Miss
    expect(suggestedBinding(list, { x: 200, y: 200 })).toBeNull();

    // Diagram elements are ignored and do not provide suggestedBinding
    const diag = makeEl({
      id: "diag-1",
      type: "diagram",
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    });
    expect(suggestedBinding([diag], { x: 250, y: 250 })).toBeNull();
    expect(nextFrameElement([diag], { x: 250, y: 250 })).toBeNull();
  });

  test("centerOf calculates element center accurately", () => {
    const el = makeEl({ x: 40, y: 60, width: 200, height: 100 });
    expect(centerOf(el)).toEqual({ x: 140, y: 110 });
  });

  test("anchorPoint calculates ray intersection with bounding edges", () => {
    const el = makeEl({ x: 100, y: 100, width: 100, height: 100 });
    // Center is (150, 150)
    // Ray right toward (300, 150) -> should intersect right edge at (200, 150)
    expect(anchorPoint(el, { x: 300, y: 150 })).toEqual({ x: 200, y: 150 });
    // Ray left toward (0, 150) -> should intersect left edge at (100, 150)
    expect(anchorPoint(el, { x: 0, y: 150 })).toEqual({ x: 100, y: 150 });
    // Ray top toward (150, 0) -> should intersect top edge at (150, 100)
    expect(anchorPoint(el, { x: 150, y: 0 })).toEqual({ x: 150, y: 100 });
    // Ray bottom toward (150, 300) -> should intersect bottom edge at (150, 200)
    expect(anchorPoint(el, { x: 150, y: 300 })).toEqual({ x: 150, y: 200 });
  });
});

describe("Geometry: Arrow Routing and Handles", () => {
  test("arrowHandlesFor creates segment handles for orthogonal routing", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const handles = arrowHandlesFor(pts, "orthogonal", "auto", 1);
    expect(handles.length).toBe(2);
    expect(handles[0]).toEqual({
      kind: "segment",
      index: 0,
      axis: "h",
      point: { x: 50, y: 0 },
    });
    expect(handles[1]).toEqual({
      kind: "segment",
      index: 1,
      axis: "v",
      point: { x: 100, y: 50 },
    });
  });

  test("arrowHandlesFor creates waypoints and insert handles for manual routing", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ];
    const handles = arrowHandlesFor(pts, "straight", "manual", 1);
    const waypoints = handles.filter((h) => h.kind === "waypoint");
    const inserts = handles.filter((h) => h.kind === "insert");
    expect(waypoints.length).toBe(1);
    expect(waypoints[0].point).toEqual({ x: 50, y: 50 });
    expect(inserts.length).toBe(2);
  });

  test("cleanupArrowPoints removes duplicate and collinear points", () => {
    const noisy = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0.2 }, // Duplicate (<0.5)
      { x: 50, y: 0 }, // Collinear horizontal
      { x: 100, y: 0 },
      { x: 100, y: 50 }, // Collinear vertical
      { x: 100, y: 100 },
    ];
    const cleaned = cleanupArrowPoints(noisy);
    expect(cleaned).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
  });

  test("hitArrowHandle detects endpoints and handles within radius", () => {
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "orthogonal",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    const toScreen = (p: { x: number; y: number }) => ({ x: p.x, y: p.y });

    // Hit start endpoint (<= 10px)
    const hitStart = hitArrowHandle(arrow, { x: 5, y: 0 }, toScreen, 1);
    expect(hitStart).not.toBeNull();
    expect(hitStart!.handle.kind).toBe("endpoint");
    expect((hitStart!.handle as any).which).toBe("start");

    // Hit end endpoint
    const hitEnd = hitArrowHandle(arrow, { x: 96, y: 0 }, toScreen, 1);
    expect(hitEnd).not.toBeNull();
    expect(hitEnd!.handle.kind).toBe("endpoint");
    expect((hitEnd!.handle as any).which).toBe("end");

    // Hit segment handle at midpoint (50, 0)
    const hitMid = hitArrowHandle(arrow, { x: 53, y: 0 }, toScreen, 1);
    expect(hitMid).not.toBeNull();
    expect(hitMid!.handle.kind).toBe("segment");

    // Miss
    const miss = hitArrowHandle(arrow, { x: 50, y: 50 }, toScreen, 1);
    expect(miss).toBeNull();
  });

  test("arrowGeom generates geometry for straight and bound arrows", () => {
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "straight",
      points: [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ],
    });
    const geom = arrowGeom(arrow, () => undefined, THEME.light);
    expect(geom.p0).toEqual({ x: 10, y: 10 });
    expect(geom.p1).toEqual({ x: 90, y: 90 });
    expect(geom.d).toContain("M10 10 L90 90");
    expect(geom.pts.length).toBe(2);
  });

  test("handles null or corrupted points gracefully without throwing", () => {
    const corruptArrow = makeEl({
      type: "arrow",
      x: 10,
      y: 20,
      points: [null as any, { x: 50, y: 50 }, undefined as any],
    });
    const bounds = elementBounds(corruptArrow);
    expect(bounds).toEqual({ minX: 60, minY: 70, maxX: 60, maxY: 70 });

    const geom = arrowGeom(corruptArrow, () => undefined, THEME.light);
    expect(geom).toBeDefined();
    expect(geom.pts.length).toBeGreaterThanOrEqual(2);

    const corruptFreehand = makeEl({
      type: "freehand",
      x: 0,
      y: 0,
      points: [null as any, null as any],
    });
    const freehandBounds = elementBounds(corruptFreehand);
    expect(freehandBounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
    expect(distToElement({ x: 5, y: 5 }, corruptFreehand)).toBe(Infinity);
  });

  test("projectOntoPolyline constrains projections strictly onto polyline segments", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ];
    // Far above and to the right
    const res1 = projectOntoPolyline(pts, { x: 500, y: 500 });
    expect(res1.point.y).toBe(0);
    expect(res1.point.x).toBeLessThanOrEqual(200);
    expect(res1.point.x).toBeGreaterThanOrEqual(0);

    // Far to the left
    const res2 = projectOntoPolyline(pts, { x: -300, y: -200 });
    expect(res2.point.y).toBe(0);
    expect(res2.point.x).toBeGreaterThanOrEqual(0);

    // Midway
    const res3 = projectOntoPolyline(pts, { x: 100, y: 999 });
    expect(res3.point).toEqual({ x: 100, y: 0 });
    expect(res3.t).toBeCloseTo(0.5, 2);
  });

  test("arrow label remains strictly on the arrow line across different labelT values", () => {
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "straight",
      points: [
        { x: 0, y: 100 },
        { x: 300, y: 100 },
      ],
      label: "Mayank",
      labelT: 0.25,
    });
    const geom1 = arrowGeom(arrow, () => undefined, THEME.dark);
    expect(geom1.labelPoint.y).toBe(100);
    expect(geom1.labelPoint.x).toBeCloseTo(75, 1);

    arrow.labelT = 0.8;
    const geom2 = arrowGeom(arrow, () => undefined, THEME.dark);
    expect(geom2.labelPoint.y).toBe(100);
    expect(geom2.labelPoint.x).toBeCloseTo(240, 1);
  });

  test("orthogonal arrow routes with centered midpoint S-bend between staggered shapes", () => {
    const sEl = makeEl({ id: "box1", x: 100, y: 100, width: 100, height: 100 });
    const tEl = makeEl({ id: "box2", x: 400, y: 250, width: 100, height: 100 });
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "orthogonal",
      start: { elementId: "box1", anchor: "auto" },
      end: { elementId: "box2", anchor: "auto" },
      points: [
        { x: 200, y: 150 },
        { x: 400, y: 300 },
      ],
    });
    const elements: Record<string, any> = { box1: sEl, box2: tEl };
    const geom = arrowGeom(arrow, (id) => elements[id], THEME.light);

    expect(geom.pts.length).toBeGreaterThanOrEqual(4);
    // Exit right of box1 (x = 200), enter left of box2 (x = 400)
    // S-bend vertical transition segment must be at midpoint mx = (200 + 400) / 2 = 300
    const midX = (geom.pts[1].x + geom.pts[geom.pts.length - 2].x) / 2;
    expect(midX).toBeCloseTo(300, 1);
  });

  test("2-point orthogonal arrow preserves elbow shape instead of falling back to straight line", () => {
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "orthogonal",
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
    });
    const geom = arrowGeom(arrow, () => undefined, THEME.light);
    expect(geom.pts.length).toBe(4);
    expect(geom.pts[1].x).toBe(200);
    expect(geom.pts[2].x).toBe(200);
  });

  test("curved arrow stays straight by default and curves smoothly when bent by user", () => {
    // 2-point curved arrow stays straight by default
    const arrow2 = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "curved",
      points: [
        { x: 200, y: 100 },
        { x: 200, y: 300 },
      ],
    });
    const geom2 = arrowGeom(arrow2, () => undefined, THEME.light);
    expect(geom2.d).toBe("M200 100 L200 300");
    expect(geom2.pts.length).toBe(2);

    // When bent with a midpoint (3 points), it curves smoothly via Catmull-Rom
    const arrow3 = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "curved",
      points: [
        { x: 200, y: 100 },
        { x: 250, y: 200 },
        { x: 200, y: 300 },
      ],
    });
    const geom3 = arrowGeom(arrow3, () => undefined, THEME.light);
    expect(geom3.d).toContain("C");
    expect(geom3.pts.length).toBe(3);
  });

  test("2-point curved arrow between diagonal points stays straight until bent by user", () => {
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      routeMode: "curved",
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
    });
    const geom = arrowGeom(arrow, () => undefined, THEME.light);
    expect(geom.d).toBe("M100 100 L300 200");
    expect(geom.pts.length).toBe(2);
  });

  test("bound curved arrow with auto route ignores stale multi-point bends and stays straight between anchors", () => {
    const sEl = makeEl({ id: "s", type: "shape", x: 100, y: 100, width: 80, height: 60 });
    const tEl = makeEl({ id: "t", type: "shape", x: 300, y: 250, width: 80, height: 60 });
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      route: "auto",
      routeMode: "curved",
      start: { elementId: "s", anchor: "auto" },
      end: { elementId: "t", anchor: "auto" },
      // Stale detour waypoints from a previous orthogonal route
      points: [
        { x: 180, y: 130 },
        { x: 180, y: 50 },
        { x: 300, y: 50 },
        { x: 300, y: 250 },
      ],
    });
    const geom = arrowGeom(arrow, (id) => (id === "s" ? sEl : tEl), THEME.light);
    // Should NOT route through (180, 50) detour; should stay clean straight line between anchors
    expect(geom.d).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
    expect(geom.pts.length).toBe(2);
  });

  test("arrowGeom preserves precise normalizedAnchor without collapsing to midpoint", () => {
    const sEl = makeEl({ id: "s", type: "shape", x: 100, y: 100, width: 200, height: 80 });
    const tEl = makeEl({ id: "t", type: "shape", x: 100, y: 300, width: 200, height: 80 });

    // Arrow with start at 25% across bottom face (x = 100 + 0.25 * 200 = 150)
    const arrow = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      route: "auto",
      routeMode: "orthogonal",
      start: {
        elementId: "s",
        anchor: "auto",
        isPrecise: true,
        normalizedAnchor: { x: 0.25, y: 1 },
      },
      end: {
        elementId: "t",
        anchor: "auto",
        isPrecise: true,
        normalizedAnchor: { x: 0.5, y: 0 },
      },
      points: [
        { x: 150, y: 180 },
        { x: 200, y: 300 },
      ],
    });

    const geom = arrowGeom(arrow, (id) => (id === "s" ? sEl : tEl), THEME.light);
    // Departure point must start at x=150, not the face center x=200
    expect(geom.pts[0].x).toBe(150);
    expect(geom.pts[0].y).toBe(180); // s.y + s.height

    // Destination point arrives at x=200 (center of t)
    expect(geom.pts[geom.pts.length - 1].x).toBe(200);
    expect(geom.pts[geom.pts.length - 1].y).toBe(300); // t.y
  });

  test("multiple branching arrows from same face maintain separate departure tracks", () => {
    const parent = makeEl({ id: "p", type: "shape", x: 200, y: 100, width: 200, height: 80 });
    const child1 = makeEl({ id: "c1", type: "shape", x: 50, y: 300, width: 100, height: 80 });
    const child2 = makeEl({ id: "c2", type: "shape", x: 250, y: 300, width: 100, height: 80 });
    const child3 = makeEl({ id: "c3", type: "shape", x: 450, y: 300, width: 100, height: 80 });

    const elMap: Record<string, BoardElement> = { p: parent, c1: child1, c2: child2, c3: child3 };

    const a1 = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      route: "auto",
      routeMode: "orthogonal",
      start: { elementId: "p", anchor: "auto", isPrecise: true, normalizedAnchor: { x: 0.25, y: 1 } },
      end: { elementId: "c1", anchor: "auto", isPrecise: true, normalizedAnchor: { x: 0.5, y: 0 } },
      points: [{ x: 250, y: 180 }, { x: 100, y: 300 }],
    });

    const a2 = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      route: "auto",
      routeMode: "orthogonal",
      start: { elementId: "p", anchor: "auto", isPrecise: true, normalizedAnchor: { x: 0.5, y: 1 } },
      end: { elementId: "c2", anchor: "auto", isPrecise: true, normalizedAnchor: { x: 0.5, y: 0 } },
      points: [{ x: 300, y: 180 }, { x: 300, y: 300 }],
    });

    const a3 = makeEl({
      type: "arrow",
      x: 0,
      y: 0,
      route: "auto",
      routeMode: "orthogonal",
      start: { elementId: "p", anchor: "auto", isPrecise: true, normalizedAnchor: { x: 0.75, y: 1 } },
      end: { elementId: "c3", anchor: "auto", isPrecise: true, normalizedAnchor: { x: 0.5, y: 0 } },
      points: [{ x: 350, y: 180 }, { x: 500, y: 300 }],
    });

    const g1 = arrowGeom(a1, (id) => elMap[id], THEME.light);
    const g2 = arrowGeom(a2, (id) => elMap[id], THEME.light);
    const g3 = arrowGeom(a3, (id) => elMap[id], THEME.light);

    // Each departure X must be distinct: 250, 300, 350
    expect(g1.pts[0].x).toBe(250);
    expect(g2.pts[0].x).toBe(300);
    expect(g3.pts[0].x).toBe(350);

    // Second point (initial vertical descent) maintains the separate tracks
    expect(g1.pts[1].x).toBe(250);
    expect(g3.pts[1].x).toBe(350);
  });

  test("edgeNormalizedAnchor clamps points to the nearest perimeter edge", () => {
    const { edgeNormalizedAnchor } = require("../src/lib/geometry");
    const el = makeEl({ x: 100, y: 100, width: 200, height: 100 });

    // Near top edge at 25% width (x = 150, y = 105) -> should snap to top edge { x: 0.25, y: 0 }
    const top = edgeNormalizedAnchor(el, { x: 150, y: 105 });
    expect(top.x).toBeCloseTo(0.25);
    expect(top.y).toBe(0);

    // Near bottom edge at 75% width (x = 250, y = 195) -> should snap to bottom edge { x: 0.75, y: 1 }
    const bottom = edgeNormalizedAnchor(el, { x: 250, y: 195 });
    expect(bottom.x).toBeCloseTo(0.75);
    expect(bottom.y).toBe(1);

    // Near left edge at 40% height (x = 105, y = 140) -> should snap to left edge { x: 0, y: 0.4 }
    const left = edgeNormalizedAnchor(el, { x: 105, y: 140 });
    expect(left.x).toBe(0);
    expect(left.y).toBeCloseTo(0.4);
  });

  test("anchorPoint does not force face center on non-diagram shapes", () => {
    const el = makeEl({ x: 100, y: 100, width: 200, height: 100 });
    // Center is (200, 150). Toward (250, 50).
    const regular = anchorPoint(el, { x: 250, y: 50 }, false);
    // Ray intersection preserves angled offset: should NOT be clamped to cx=200
    expect(regular.x).not.toBe(200);

    // When forceCenter is true (diagram mode), it clamps to center (200, 100)
    const forced = anchorPoint(el, { x: 250, y: 50 }, true);
    expect(forced).toEqual({ x: 200, y: 100 });
  });

  test("autoOrthogonal routes around intermediate obstacle shapes", () => {
    const shortener = makeEl({ id: "s", x: 576, y: 128, width: 192, height: 64 });
    const auth = makeEl({ id: "a", x: 576, y: 240, width: 192, height: 64 });
    const redis = makeEl({ id: "r", x: 864, y: 208, width: 144, height: 64 });
    const kafka = makeEl({ id: "k", x: 864, y: 368, width: 144, height: 64 });
    const map: Record<string, BoardElement> = { s: shortener, a: auth, r: redis, k: kafka };
    const arrow = makeEl({
      type: "arrow",
      route: "auto",
      routeMode: "orthogonal",
      start: { elementId: "s", isPrecise: true, normalizedAnchor: { x: 0.5, y: 1 } },
      end: { elementId: "k", isPrecise: true, normalizedAnchor: { x: 0.5, y: 0 } },
      points: [
        { x: 672, y: 192 },
        { x: 936, y: 368 },
      ],
    });
    const obstacles = [elementBounds(auth), elementBounds(redis)];
    const geom = arrowGeom(arrow, (id) => map[id], THEME.dark, obstacles);

    for (let i = 0; i < geom.pts.length - 1; i++) {
      const p = geom.pts[i];
      const q = geom.pts[i + 1];
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      const hitsAuth = mx > 576 && mx < 768 && my > 240 && my < 304;
      const hitsRedis = mx > 864 && mx < 1008 && my > 208 && my < 272;
      expect(hitsAuth).toBe(false);
      expect(hitsRedis).toBe(false);
    }
  });
});

