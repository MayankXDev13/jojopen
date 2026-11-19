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
});
