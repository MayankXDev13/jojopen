/* Geometry: bounds, anchors, arrow paths. */

import type { BoardElement, Point } from "./model";
import type { Theme } from "./palette";

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type ArrowGeom = {
  d: string;
  p0: Point;
  p1: Point;
  /** Absolute display polyline (routed for auto, stored otherwise). */
  pts: Point[];
  /** Unit tangents pointing outward at each end (for arrowheads). */
  tan0: Point;
  tan1: Point;
  labelPoint: Point;
  stroke: string;
};

export function elementBounds(e: BoardElement): Bounds {
  if (e.type === "arrow" || e.type === "freehand") {
    const pts = (e.points || [])
      .filter(
        (p): p is Point =>
          !!p && typeof p.x === "number" && typeof p.y === "number",
      )
      .map((p) => ({ x: e.x + p.x, y: e.y + p.y }));
    if (!pts.length) return { minX: e.x, minY: e.y, maxX: e.x, maxY: e.y };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }
  return { minX: e.x, minY: e.y, maxX: e.x + e.width, maxY: e.y + e.height };
}

export function boundsOf(
  list: BoardElement[],
): (Bounds & { width: number; height: number }) | null {
  if (!list.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of list) {
    const b = elementBounds(e);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export const pointInElement = (x: number, y: number, e: BoardElement) => {
  const b = elementBounds(e);
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
};

/** Whether outer shape contains or encloses inner shape. */
export function shapeEncloses(
  outer: BoardElement,
  inner: BoardElement,
): boolean {
  if (outer.type !== "shape" || inner.type !== "shape") return false;
  if (outer.width < inner.width && outer.height < inner.height) return false;

  const pad = 8;
  const fullyInside =
    inner.x >= outer.x - pad &&
    inner.y >= outer.y - pad &&
    inner.x + inner.width <= outer.x + outer.width + pad &&
    inner.y + inner.height <= outer.y + outer.height + pad;

  if (fullyInside) return true;

  const innerCx = inner.x + inner.width / 2;
  const innerCy = inner.y + inner.height / 2;
  const centerInside =
    innerCx >= outer.x &&
    innerCx <= outer.x + outer.width &&
    innerCy >= outer.y &&
    innerCy <= outer.y + outer.height;

  if (centerInside && outer.width >= inner.width && outer.height >= inner.height) {
    const xOverlap = Math.max(
      0,
      Math.min(outer.x + outer.width, inner.x + inner.width) -
        Math.max(outer.x, inner.x),
    );
    const yOverlap = Math.max(
      0,
      Math.min(outer.y + outer.height, inner.y + inner.height) -
        Math.max(outer.y, inner.y),
    );
    const overlapArea = xOverlap * yOverlap;
    const innerArea = inner.width * inner.height;
    if (innerArea > 0 && overlapArea / innerArea >= 0.7) {
      return true;
    }
  }

  return false;
}

export function nextFrameElement(
  list: BoardElement[],
  point: Point,
  excludeId?: string,
): BoardElement | null {
  const hit = list
    .slice()
    .reverse()
    .find(
      (e) =>
        e.id !== excludeId &&
        e.type !== "arrow" &&
        e.type !== "freehand" &&
        pointInElement(point.x, point.y, e),
    );
  return hit || null;
}

/** Normalized anchor of a world point inside an element (0..1). */
export function normalizedAnchorOf(
  e: BoardElement,
  p: Point,
): { x: number; y: number } {
  const b = elementBounds(e);
  const w = Math.max(1, b.maxX - b.minX);
  const h = Math.max(1, b.maxY - b.minY);
  return {
    x: Math.min(1, Math.max(0, (p.x - b.minX) / w)),
    y: Math.min(1, Math.max(0, (p.y - b.minY) / h)),
  };
}

/** Suggested binding while drawing: topmost bindable under cursor + anchor. */
export function suggestedBinding(
  list: BoardElement[],
  point: Point,
  excludeId?: string,
): { el: BoardElement; anchor: { x: number; y: number } } | null {
  const hit = nextFrameElement(list, point, excludeId);
  if (!hit) return null;
  return { el: hit, anchor: normalizedAnchorOf(hit, point) };
}

export function distPointToSeg(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Collision distance from world point to element centerline (for eraser/hit). */
export function distToElement(p: Point, e: BoardElement): number {
  if (e.type === "arrow" || e.type === "freehand") {
    const pts = (e.points || [])
      .filter(
        (q): q is Point =>
          !!q && typeof q.x === "number" && typeof q.y === "number",
      )
      .map((q) => ({ x: e.x + q.x, y: e.y + q.y }));
    if (!pts.length) return Infinity;
    if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
    let m = Infinity;
    for (let i = 0; i < pts.length - 1; i++)
      m = Math.min(m, distPointToSeg(p, pts[i], pts[i + 1]));
    return m;
  }
  const b = elementBounds(e);
  const dx = Math.max(b.minX - p.x, 0, p.x - b.maxX);
  const dy = Math.max(b.minY - p.y, 0, p.y - b.maxY);
  if (dx === 0 && dy === 0) return 0;
  return Math.hypot(dx, dy);
}

/** Hit test world point against routed arrow path and label point. */
export function hitTestArrow(
  p: Point,
  el: BoardElement,
  getElement: (id: string) => BoardElement | undefined,
  th: Theme,
  tolerance = 16,
): boolean {
  if (el.type !== "arrow") return false;
  try {
    const geom = arrowGeom(el, getElement, th);
    for (let i = 1; i < geom.pts.length; i++) {
      if (distPointToSeg(p, geom.pts[i - 1], geom.pts[i]) <= tolerance) {
        return true;
      }
    }
    if (
      Math.hypot(p.x - geom.labelPoint.x, p.y - geom.labelPoint.y) <=
      tolerance * 1.5
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}


/* ---- Arrow handles, mirroring the original board (jojopen.com) ----
   Orthogonal arrows expose axis-constrained segment handles; other modes
   expose waypoint handles on manual routes plus insert (+) handles. */

export type ArrowHandle =
  | { kind: "endpoint"; index: number; which: "start" | "end"; point: Point }
  | { kind: "waypoint"; index: number; point: Point }
  | { kind: "insert"; index: number; point: Point }
  | { kind: "segment"; index: number; axis: "h" | "v"; point: Point };

/** Absolute (world) raw points of an arrow. */
export function rawPoints(el: BoardElement): Point[] {
  return (el.points || [])
    .filter(
      (p): p is Point =>
        !!p && typeof p.x === "number" && typeof p.y === "number",
    )
    .map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
}

/** Handles from a display point list (original computes them on routed points). */
export function arrowHandlesFor(
  pts: Point[],
  routeMode: string | undefined,
  route: string | undefined,
  zoom: number,
): ArrowHandle[] {
  if (pts.length < 2) return [];
  const out: ArrowHandle[] = [];
  if (routeMode === "orthogonal") {
    for (let r = 0; r < pts.length - 1; r++) {
      const d = pts[r];
      const f = pts[r + 1];
      const axis =
        Math.abs(d.y - f.y) < 0.5
          ? "h"
          : Math.abs(d.x - f.x) < 0.5
            ? "v"
            : null;
      if (!axis || Math.hypot(f.x - d.x, f.y - d.y) * zoom < 28) continue;
      out.push({
        kind: "segment",
        index: r,
        axis,
        point: { x: (d.x + f.x) / 2, y: (d.y + f.y) / 2 },
      });
    }
    return out;
  }
  const base = route === "manual" ? pts : [pts[0], pts[pts.length - 1]];
  // Waypoints only exist on manual routes (original shows none on auto).
  if (route === "manual") {
    for (let r = 1; r < base.length - 1; r++)
      out.push({ kind: "waypoint", index: r, point: base[r] });
  }
  for (let r = 0; r < base.length - 1; r++) {
    const d = base[r];
    const f = base[r + 1];
    if (Math.hypot(f.x - d.x, f.y - d.y) * zoom < 36) continue;
    out.push({
      kind: "insert",
      index: r,
      point: { x: (d.x + f.x) / 2, y: (d.y + f.y) / 2 },
    });
  }
  return out;
}

export function arrowHandles(el: BoardElement, zoom: number): ArrowHandle[] {
  return arrowHandlesFor(rawPoints(el), el.routeMode, el.route, zoom);
}

/** Hit-test arrow endpoints (10px) then handles (9px), like the original. */
export function hitArrowHandle(
  el: BoardElement,
  screen: { x: number; y: number },
  toScreen: (p: Point) => { x: number; y: number },
  zoom: number,
): {
  handle:
    | ArrowHandle
    | { kind: "endpoint"; index: number; which: "start" | "end"; point: Point };
} | null {
  if (el.type !== "arrow" || el.locked) return null;
  const a = rawPoints(el);
  const ends: Array<{ which: "start" | "end"; index: number; point: Point }> = [
    { which: "start", index: 0, point: a[0] },
    { which: "end", index: a.length - 1, point: a[a.length - 1] },
  ];
  for (const e of ends) {
    const s = toScreen(e.point);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= 10)
      return { handle: { kind: "endpoint", ...e } };
  }
  for (const h of arrowHandles(el, zoom)) {
    const s = toScreen(h.point);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= 9) return { handle: h };
  }
  return null;
}

/** De-dupe + drop collinear middle points (original sA). */
export function cleanupArrowPoints(pts: Point[]): Point[] {
  const valid = (pts || []).filter(
    (p): p is Point =>
      !!p && typeof p.x === "number" && typeof p.y === "number",
  );
  const n = valid.filter((p, i, arr) => {
    if (!i) return true;
    const q = arr[i - 1];
    return !(Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5);
  });
  for (let i = n.length - 2; i >= 1; i--) {
    const a = n[i - 1];
    const b = n[i];
    const c = n[i + 1];
    if (
      (Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) ||
      (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)
    ) {
      n.splice(i, 1);
    }
  }
  return n;
}

export function centerOf(e: BoardElement): Point {
  const b = elementBounds(e);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function anchorPoint(e: BoardElement, toward: Point): Point {
  const b = elementBounds(e);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (!dx && !dy) return { x: cx, y: b.maxY };
  const hw = Math.max(1, (b.maxX - b.minX) / 2);
  const hh = Math.max(1, (b.maxY - b.minY) / 2);
  const t = Math.min(Math.abs(hw / (dx || 1e-6)), Math.abs(hh / (dy || 1e-6)));
  return { x: cx + dx * t, y: cy + dy * t };
}

/* ---- Original-style auto router (jojopen.com) ----
   Bound arrows with route auto pick exit/enter sides, leave 16px stubs,
   then run orthogonally outside both expanded boxes. */

type Side = "left" | "right" | "top" | "bottom";
const SIDES: Side[] = ["left", "right", "top", "bottom"];
const STUB = 16;

function sideNormal(s: Side): Point {
  return s === "left"
    ? { x: -1, y: 0 }
    : s === "right"
      ? { x: 1, y: 0 }
      : s === "top"
        ? { x: 0, y: -1 }
        : { x: 0, y: 1 };
}

/** Point on a side, clamped 6px inside like the original. */
function sidePoint(b: Bounds, side: Side, along?: number): Point {
  if (side === "left")
    return {
      x: b.minX,
      y: Math.min(
        Math.max(along ?? (b.minY + b.maxY) / 2, b.minY + 6),
        b.maxY - 6,
      ),
    };
  if (side === "right")
    return {
      x: b.maxX,
      y: Math.min(
        Math.max(along ?? (b.minY + b.maxY) / 2, b.minY + 6),
        b.maxY - 6,
      ),
    };
  if (side === "top")
    return {
      x: Math.min(
        Math.max(along ?? (b.minX + b.maxX) / 2, b.minX + 6),
        b.maxX - 6,
      ),
      y: b.minY,
    };
  return {
    x: Math.min(
      Math.max(along ?? (b.minX + b.maxX) / 2, b.minX + 6),
      b.maxX - 6,
    ),
    y: b.maxY,
  };
}

function expand(b: Bounds, pad: number): Bounds {
  return {
    minX: b.minX - pad,
    minY: b.minY - pad,
    maxX: b.maxX + pad,
    maxY: b.maxY + pad,
  };
}

function segCrossesBox(a: Point, b: Point, box: Bounds): boolean {
  // Axis-aligned segment vs strict box interior.
  if (Math.abs(a.y - b.y) < 1e-6) {
    const y = a.y;
    if (y <= box.minY || y >= box.maxY) return false;
    return (
      Math.max(Math.min(a.x, b.x), box.minX) <
      Math.min(Math.max(a.x, b.x), box.maxX)
    );
  }
  if (Math.abs(a.x - b.x) < 1e-6) {
    const x = a.x;
    if (x <= box.minX || x >= box.maxX) return false;
    return (
      Math.max(Math.min(a.y, b.y), box.minY) <
      Math.min(Math.max(a.y, b.y), box.maxY)
    );
  }
  // Diagonal (shouldn't happen in orthogonal paths): sample midpoint.
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return m.x > box.minX && m.x < box.maxX && m.y > box.minY && m.y < box.maxY;
}

function pathHitsBoxes(pts: Point[], boxes: Bounds[]): boolean {
  // Skip first/last segments (stubs touching their own box).
  for (let i = 1; i < pts.length - 2; i++) {
    for (const b of boxes)
      if (segCrossesBox(pts[i], pts[i + 1], b)) return true;
  }
  return false;
}

function pathLen(pts: Point[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++)
    l += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  return l;
}

/** Push a middle track outside both boxes; returns null if impossible. */
function freeTrack(
  horizontal: boolean,
  ideal: number,
  spanMin: number,
  spanMax: number,
  boxes: Bounds[],
  pad: number,
): number | null {
  const lo = Math.min(spanMin, spanMax);
  const hi = Math.max(spanMin, spanMax);
  const blocked = (t: number) =>
    boxes.some((b) =>
      horizontal
        ? t > b.minY && t < b.maxY && hi > b.minX && lo < b.maxX
        : t > b.minX && t < b.maxX && hi > b.minY && lo < b.maxY,
    );
  if (!blocked(ideal)) return ideal;
  const cands = boxes.flatMap((b) =>
    horizontal ? [b.minY - pad, b.maxY + pad] : [b.minX - pad, b.maxX + pad],
  );
  let best: number | null = null;
  for (const c of cands) {
    if (blocked(c)) continue;
    if (best == null || Math.abs(c - ideal) < Math.abs(best - ideal)) best = c;
  }
  return best;
}

function autoOrthogonal(a: Bounds, b: Bounds): Point[] | null {
  const pad = 16;
  const ea = expand(a, pad);
  const eb = expand(b, pad);
  const boxes = [ea, eb];
  const ac = { x: (a.minX + a.maxX) / 2, y: (a.minY + a.maxY) / 2 };
  const bc = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  let best: Point[] | null = null;
  let bestScore = Infinity;
  for (const s1 of SIDES) {
    for (const s2 of SIDES) {
      const n1 = sideNormal(s1);
      const n2 = sideNormal(s2);
      // Natural sides face the peer; penalize backsides like the original.
      const toB = { x: bc.x - ac.x, y: bc.y - ac.y };
      const toA = { x: ac.x - bc.x, y: ac.y - bc.y };
      const pen =
        (n1.x * toB.x + n1.y * toB.y < 0 ? 400 : 0) +
        (n2.x * toA.x + n2.y * toA.y < 0 ? 400 : 0);
      const p0 = sidePoint(a, s1);
      const p1 = sidePoint(b, s2);
      const q0 = { x: p0.x + n1.x * STUB, y: p0.y + n1.y * STUB };
      const q1 = { x: p1.x + n2.x * STUB, y: p1.y + n2.y * STUB };
      const cands: Point[][] = [];
      if (Math.abs(q0.x - q1.x) < 0.5 || Math.abs(q0.y - q1.y) < 0.5) {
        cands.push([p0, q0, q1, p1]);
      } else {
        // H-first and V-first S-bends.
        cands.push([p0, q0, { x: q1.x, y: q0.y }, q1, p1]);
        cands.push([p0, q0, { x: q0.x, y: q1.y }, q1, p1]);
        // Tracks pushed outside both boxes.
        const fy = freeTrack(true, q0.y, q0.x, q1.x, boxes, pad);
        if (fy != null && Math.abs(fy - q0.y) > 0.5)
          cands.push([p0, q0, { x: q0.x, y: fy }, { x: q1.x, y: fy }, q1, p1]);
        const fx = freeTrack(false, q0.x, q0.y, q1.y, boxes, pad);
        if (fx != null && Math.abs(fx - q0.x) > 0.5)
          cands.push([p0, q0, { x: fx, y: q0.y }, { x: fx, y: q1.y }, q1, p1]);
      }
      for (const c of cands) {
        if (pathHitsBoxes(c, boxes)) continue;
        const score = pathLen(c) + pen;
        if (score < bestScore) {
          bestScore = score;
          best = c;
        }
      }
    }
  }
  if (!best) return null;
  // Drop zero-length runs + dedupe.
  return cleanupArrowPoints(best);
}

/** Rounded orthogonal path (original Lt, radius 8). */
function roundedPath(pts: Point[], r = 8): string {
  if (pts.length < 2) return "";
  const q = (p: Point, q2: Point, t: number): Point => {
    const l = Math.hypot(q2.x - p.x, q2.y - p.y) || 1;
    return { x: p.x + ((q2.x - p.x) / l) * t, y: p.y + ((q2.y - p.y) / l) * t };
  };
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const o = pts[i - 1];
    const c = pts[i];
    const n = pts[i + 1];
    const f = Math.min(
      r,
      Math.hypot(c.x - o.x, c.y - o.y) / 2,
      Math.hypot(n.x - c.x, n.y - c.y) / 2,
    );
    const g = q(c, o, f);
    const y = q(c, n, f);
    d += ` L${g.x} ${g.y} Q${c.x} ${c.y} ${y.x} ${y.y}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last.x} ${last.y}`;
}

/** Catmull-Rom smoothing through all points (original Fh). */
function smoothPath(pts: Point[]): string {
  if (pts.length < 3) {
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x} ${pts[i].y}`;
    return d;
  }
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let a = 0; a < pts.length - 1; a++) {
    const p = pts[a - 1] ?? pts[a];
    const c = pts[a];
    const o = pts[a + 1];
    const r = pts[a + 2] ?? o;
    const q1 = { x: c.x + (o.x - p.x) / 6, y: c.y + (o.y - p.y) / 6 };
    const q2 = { x: o.x - (r.x - c.x) / 6, y: o.y - (r.y - c.y) / 6 };
    d += ` C${q1.x} ${q1.y} ${q2.x} ${q2.y} ${o.x} ${o.y}`;
  }
  return d;
}

export function pointAlongPolyline(pts: Point[], fraction: number): Point {
  if (pts.length < 2) return pts[0] || { x: 0, y: 0 };
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(l);
    total += l;
  }
  if (total <= 0) return pts[0];
  const target = Math.max(0, Math.min(1, fraction)) * total;
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target) {
      const t = lens[i] ? (target - acc) / lens[i] : 0;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      };
    }
    acc += lens[i];
  }
  return pts[pts.length - 1];
}

export function projectOntoPolyline(
  pts: Point[],
  p: Point,
): { point: Point; t: number } {
  if (pts.length < 2) return { point: pts[0] || { x: 0, y: 0 }, t: 0.5 };
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(l);
    total += l;
  }
  if (total <= 0) return { point: pts[0], t: 0.5 };

  let bestDist = Infinity;
  let bestDistFromStart = total * 0.5;

  let currentDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    let segT = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    segT = Math.max(0, Math.min(1, segT));
    const proj = { x: a.x + segT * dx, y: a.y + segT * dy };
    const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestDistFromStart = currentDist + segT * lens[i];
    }
    currentDist += lens[i];
  }

  // Constrain label to stay on the line between endpoints
  const pad = Math.min(24, total * 0.15);
  const clampedDist = Math.max(pad, Math.min(total - pad, bestDistFromStart));
  const t = total > 0 ? clampedDist / total : 0.5;

  return {
    point: pointAlongPolyline(pts, t),
    t,
  };
}

function midByLength(pts: Point[]): Point {
  return pointAlongPolyline(pts, 0.5);
}

function unit(from: Point, to: Point): Point {
  const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / l, y: (to.y - from.y) / l };
}

/** Evaluate a point on a cubic Bézier at parameter t (0..1). */
function cubicAt(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

/** Sample a cubic Bézier into n+1 polyline points for hit testing & tangents. */
function sampleCubic(p0: Point, c1: Point, c2: Point, p3: Point, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) pts.push(cubicAt(p0, c1, c2, p3, i / n));
  return pts;
}

export function arrowGeom(
  el: BoardElement,
  getElement: (id: string) => BoardElement | undefined,
  th: Theme,
): ArrowGeom {
  const sEl = el.start?.elementId ? getElement(el.start.elementId) : undefined;
  const tEl = el.end?.elementId ? getElement(el.end.elementId) : undefined;
  const valid = (el.points || []).filter(
    (p): p is Point =>
      !!p && typeof p.x === "number" && typeof p.y === "number",
  );
  const raw =
    valid.length >= 2
      ? valid
      : [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ];
  const first = { x: el.x + (raw[0]?.x ?? 0), y: el.y + (raw[0]?.y ?? 0) };
  const last = {
    x: el.x + (raw[raw.length - 1]?.x ?? 0),
    y: el.y + (raw[raw.length - 1]?.y ?? 0),
  };
  let p0 = first;
  let p1 = last;
  // Precise bindings aim at normalizedAnchor; otherwise fall back to edge toward peer.
  const precisePoint = (
    bindEl: BoardElement,
    binding: NonNullable<BoardElement["start"]>,
  ) => {
    if (binding.isPrecise && binding.normalizedAnchor) {
      const b = elementBounds(bindEl);
      const ax = b.minX + binding.normalizedAnchor.x * (b.maxX - b.minX);
      const ay = b.minY + binding.normalizedAnchor.y * (b.maxY - b.minY);
      if (binding.isExact) return { x: ax, y: ay };
      return anchorPoint(bindEl, { x: ax, y: ay });
    }
    return null;
  };
  if (sEl && el.start)
    p0 =
      precisePoint(sEl, el.start) ??
      anchorPoint(sEl, tEl ? centerOf(tEl) : last);
  if (tEl && el.end)
    p1 =
      precisePoint(tEl, el.end) ??
      anchorPoint(tEl, sEl ? centerOf(sEl) : first);
  const mode = el.routeMode || "orthogonal";

  let d = "";
  let pts: Point[] = [p0, p1];

  const stored = rawPoints(el);
  const seq = [...stored];
  if (sEl && el.start && seq.length) seq[0] = p0;
  if (tEl && el.end && seq.length) seq[seq.length - 1] = p1;

  if (
    mode === "orthogonal" &&
    el.route !== "manual" &&
    sEl &&
    tEl &&
    sEl.id !== tEl.id
  ) {
    const routed = autoOrthogonal(elementBounds(sEl), elementBounds(tEl));
    if (routed && routed.length >= 2) {
      d = roundedPath(routed);
      pts = routed;
    } else {
      d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
      pts = [p0, p1];
    }
  } else if (seq.length >= 3) {
    if (mode === "curved") {
      d = smoothPath(seq);
      pts = seq;
    } else if (mode === "orthogonal") {
      d = roundedPath(seq);
      pts = seq;
    } else {
      d = `M${seq.map((p) => `${p.x} ${p.y}`).join(" L")}`;
      pts = seq;
    }
  } else {
    // 2-point arrows in free space or bound without obstacles are straight lines
    d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
    pts = [p0, p1];
  }

  const rawT = (el as any).labelT ?? (el as any).labelRatio;
  const labelT =
    typeof rawT === "number" ? Math.max(0.05, Math.min(0.95, rawT)) : 0.5;
  const labelPoint = pointAlongPolyline(pts, labelT);

  const t = unit(p0, p1);
  const leg0 = pts.length > 1 ? unit(pts[1], pts[0]) : { x: -t.x, y: -t.y };
  const leg1 =
    pts.length > 1 ? unit(pts[pts.length - 2], pts[pts.length - 1]) : t;

  return {
    d,
    p0: pts[0] ?? p0,
    p1: pts[pts.length - 1] ?? p1,
    pts,
    tan0: leg0,
    tan1: leg1,
    labelPoint,
    stroke: th.arrow,
  };
}

export function arrowHead(
  geom: ArrowGeom,
  end: "start" | "end",
  color: string,
): string {
  const p = (pt: Point) => `${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  const n = end === "end" ? geom.p1 : geom.p0;
  const t = end === "end" ? geom.tan1 : geom.tan0;
  const c = 12;
  const v = c * 0.42;
  const ox = t.x;
  const oy = t.y;
  const fx = -oy;
  const fy = ox;
  const y = (back: number, side: number) => ({
    x: n.x - ox * back + fx * side,
    y: n.y - oy * back + fy * side,
  });
  const m = y(c, v);
  const b = y(c, -v);
  const k = y(c * 0.74, 0);
  return `<path d="M${p(n)} L${p(m)} L${p(k)} L${p(b)} Z" fill="${color}"/>`;
}

export const dashArray = (el: BoardElement): string => {
  if (el.kind === "async") return "7 5";
  if (el.kind === "optional") return "2 5";
  if (el.dash === "dashed") return "7 5";
  if (el.dash === "dotted") return "2 5";
  return "";
};
