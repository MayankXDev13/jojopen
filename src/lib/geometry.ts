/* Geometry: bounds, anchors, arrow paths. */

import type { BoardElement, Point } from './model';
import type { Theme } from './palette';

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
  if (e.type === 'arrow' || e.type === 'freehand') {
    const pts = (e.points || []).map((p) => ({ x: e.x + p.x, y: e.y + p.y }));
    if (!pts.length) return { minX: e.x, minY: e.y, maxX: e.x, maxY: e.y };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  return { minX: e.x, minY: e.y, maxX: e.x + e.width, maxY: e.y + e.height };
}

export function boundsOf(list: BoardElement[]): (Bounds & { width: number; height: number }) | null {
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

export function nextFrameElement(list: BoardElement[], point: Point, excludeId?: string): BoardElement | null {
  const hit = list
    .slice()
    .reverse()
    .find((e) => e.id !== excludeId && e.type !== 'arrow' && e.type !== 'freehand' && pointInElement(point.x, point.y, e));
  return hit || null;
}

/** Normalized anchor of a world point inside an element (0..1). */
export function normalizedAnchorOf(e: BoardElement, p: Point): { x: number; y: number } {
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
  if (e.type === 'arrow' || e.type === 'freehand') {
    const pts = (e.points || []).map((q) => ({ x: e.x + q.x, y: e.y + q.y }));
    if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
    let m = Infinity;
    for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, distPointToSeg(p, pts[i], pts[i + 1]));
    return m;
  }
  const b = elementBounds(e);
  const dx = Math.max(b.minX - p.x, 0, p.x - b.maxX);
  const dy = Math.max(b.minY - p.y, 0, p.y - b.maxY);
  if (dx === 0 && dy === 0) return 0;
  return Math.hypot(dx, dy);
}

/* ---- Arrow handles, mirroring the original board (jojopen.com) ----
   Orthogonal arrows expose axis-constrained segment handles; other modes
   expose waypoint handles on manual routes plus insert (+) handles. */

export type ArrowHandle =
  | { kind: 'endpoint'; index: number; which: 'start' | 'end'; point: Point }
  | { kind: 'waypoint'; index: number; point: Point }
  | { kind: 'insert'; index: number; point: Point }
  | { kind: 'segment'; index: number; axis: 'h' | 'v'; point: Point };

/** Absolute (world) raw points of an arrow. */
export function rawPoints(el: BoardElement): Point[] {
  return (el.points || []).map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
}

/** Handles from a display point list (original computes them on routed points). */
export function arrowHandlesFor(pts: Point[], routeMode: string | undefined, route: string | undefined, zoom: number): ArrowHandle[] {
  if (pts.length < 2) return [];
  const out: ArrowHandle[] = [];
  if (routeMode === 'orthogonal') {
    for (let r = 0; r < pts.length - 1; r++) {
      const d = pts[r];
      const f = pts[r + 1];
      const axis = Math.abs(d.y - f.y) < 0.5 ? 'h' : Math.abs(d.x - f.x) < 0.5 ? 'v' : null;
      if (!axis || Math.hypot(f.x - d.x, f.y - d.y) * zoom < 28) continue;
      out.push({ kind: 'segment', index: r, axis, point: { x: (d.x + f.x) / 2, y: (d.y + f.y) / 2 } });
    }
    return out;
  }
  const base = route === 'manual' ? pts : [pts[0], pts[pts.length - 1]];
  // Waypoints only exist on manual routes (original shows none on auto).
  if (route === 'manual') {
    for (let r = 1; r < base.length - 1; r++) out.push({ kind: 'waypoint', index: r, point: base[r] });
  }
  for (let r = 0; r < base.length - 1; r++) {
    const d = base[r];
    const f = base[r + 1];
    if (Math.hypot(f.x - d.x, f.y - d.y) * zoom < 36) continue;
    out.push({ kind: 'insert', index: r, point: { x: (d.x + f.x) / 2, y: (d.y + f.y) / 2 } });
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
): { handle: ArrowHandle | { kind: 'endpoint'; index: number; which: 'start' | 'end'; point: Point } } | null {
  if (el.type !== 'arrow' || el.locked) return null;
  const a = rawPoints(el);
  const ends: Array<{ which: 'start' | 'end'; index: number; point: Point }> = [
    { which: 'start', index: 0, point: a[0] },
    { which: 'end', index: a.length - 1, point: a[a.length - 1] },
  ];
  for (const e of ends) {
    const s = toScreen(e.point);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= 10)
      return { handle: { kind: 'endpoint', ...e } };
  }
  for (const h of arrowHandles(el, zoom)) {
    const s = toScreen(h.point);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= 9) return { handle: h };
  }
  return null;
}

/** De-dupe + drop collinear middle points (original sA). */
export function cleanupArrowPoints(pts: Point[]): Point[] {
  const n = pts.filter((p, i, arr) => {
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

type Side = 'left' | 'right' | 'top' | 'bottom';
const SIDES: Side[] = ['left', 'right', 'top', 'bottom'];
const STUB = 16;

function sideNormal(s: Side): Point {
  return s === 'left' ? { x: -1, y: 0 } : s === 'right' ? { x: 1, y: 0 } : s === 'top' ? { x: 0, y: -1 } : { x: 0, y: 1 };
}

/** Point on a side, clamped 6px inside like the original. */
function sidePoint(b: Bounds, side: Side, along?: number): Point {
  if (side === 'left') return { x: b.minX, y: Math.min(Math.max(along ?? (b.minY + b.maxY) / 2, b.minY + 6), b.maxY - 6) };
  if (side === 'right') return { x: b.maxX, y: Math.min(Math.max(along ?? (b.minY + b.maxY) / 2, b.minY + 6), b.maxY - 6) };
  if (side === 'top') return { x: Math.min(Math.max(along ?? (b.minX + b.maxX) / 2, b.minX + 6), b.maxX - 6), y: b.minY };
  return { x: Math.min(Math.max(along ?? (b.minX + b.maxX) / 2, b.minX + 6), b.maxX - 6), y: b.maxY };
}

function expand(b: Bounds, pad: number): Bounds {
  return { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad };
}

function segCrossesBox(a: Point, b: Point, box: Bounds): boolean {
  // Axis-aligned segment vs strict box interior.
  if (Math.abs(a.y - b.y) < 1e-6) {
    const y = a.y;
    if (y <= box.minY || y >= box.maxY) return false;
    return Math.max(Math.min(a.x, b.x), box.minX) < Math.min(Math.max(a.x, b.x), box.maxX);
  }
  if (Math.abs(a.x - b.x) < 1e-6) {
    const x = a.x;
    if (x <= box.minX || x >= box.maxX) return false;
    return Math.max(Math.min(a.y, b.y), box.minY) < Math.min(Math.max(a.y, b.y), box.maxY);
  }
  // Diagonal (shouldn't happen in orthogonal paths): sample midpoint.
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return m.x > box.minX && m.x < box.maxX && m.y > box.minY && m.y < box.maxY;
}

function pathHitsBoxes(pts: Point[], boxes: Bounds[]): boolean {
  // Skip first/last segments (stubs touching their own box).
  for (let i = 1; i < pts.length - 2; i++) {
    for (const b of boxes) if (segCrossesBox(pts[i], pts[i + 1], b)) return true;
  }
  return false;
}

function pathLen(pts: Point[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  return l;
}

/** Push a middle track outside both boxes; returns null if impossible. */
function freeTrack(horizontal: boolean, ideal: number, spanMin: number, spanMax: number, boxes: Bounds[], pad: number): number | null {
  const lo = Math.min(spanMin, spanMax);
  const hi = Math.max(spanMin, spanMax);
  const blocked = (t: number) =>
    boxes.some((b) =>
      horizontal
        ? t > b.minY && t < b.maxY && hi > b.minX && lo < b.maxX
        : t > b.minX && t < b.maxX && hi > b.minY && lo < b.maxY,
    );
  if (!blocked(ideal)) return ideal;
  const cands = boxes.flatMap((b) => (horizontal ? [b.minY - pad, b.maxY + pad] : [b.minX - pad, b.maxX + pad]));
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
      const pen = (n1.x * toB.x + n1.y * toB.y < 0 ? 400 : 0) + (n2.x * toA.x + n2.y * toA.y < 0 ? 400 : 0);
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
  if (pts.length < 2) return '';
  const q = (p: Point, q2: Point, t: number): Point => {
    const l = Math.hypot(q2.x - p.x, q2.y - p.y) || 1;
    return { x: p.x + ((q2.x - p.x) / l) * t, y: p.y + ((q2.y - p.y) / l) * t };
  };
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const o = pts[i - 1];
    const c = pts[i];
    const n = pts[i + 1];
    const f = Math.min(r, Math.hypot(c.x - o.x, c.y - o.y) / 2, Math.hypot(n.x - c.x, n.y - c.y) / 2);
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

function midByLength(pts: Point[]): Point {
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(l);
    total += l;
  }
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= total / 2) {
      const t = lens[i] ? (total / 2 - acc) / lens[i] : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
    }
    acc += lens[i];
  }
  return pts[Math.floor(pts.length / 2)];
}

function unit(from: Point, to: Point): Point {
  const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / l, y: (to.y - from.y) / l };
}

export function arrowGeom(
  el: BoardElement,
  getElement: (id: string) => BoardElement | undefined,
  th: Theme,
): ArrowGeom {
  const sEl = el.start?.elementId ? getElement(el.start.elementId) : undefined;
  const tEl = el.end?.elementId ? getElement(el.end.elementId) : undefined;
  const raw = el.points || [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const first = { x: el.x + (raw[0]?.x ?? 0), y: el.y + (raw[0]?.y ?? 0) };
  const last = { x: el.x + (raw[raw.length - 1]?.x ?? 0), y: el.y + (raw[raw.length - 1]?.y ?? 0) };
  let p0 = first;
  let p1 = last;
  // Precise bindings aim at normalizedAnchor; otherwise fall back to edge toward peer.
  const precisePoint = (bindEl: BoardElement, binding: NonNullable<BoardElement['start']>) => {
    if (binding.isPrecise && binding.normalizedAnchor) {
      const b = elementBounds(bindEl);
      const ax = b.minX + binding.normalizedAnchor.x * (b.maxX - b.minX);
      const ay = b.minY + binding.normalizedAnchor.y * (b.maxY - b.minY);
      if (binding.isExact) return { x: ax, y: ay };
      return anchorPoint(bindEl, { x: ax, y: ay });
    }
    return null;
  };
  if (sEl && el.start) p0 = precisePoint(sEl, el.start) ?? anchorPoint(sEl, tEl ? centerOf(tEl) : last);
  if (tEl && el.end) p1 = precisePoint(tEl, el.end) ?? anchorPoint(tEl, sEl ? centerOf(sEl) : first);
  const mode = el.routeMode || 'orthogonal';

  // Auto route between two distinct bound shapes: side-aware obstacle
  // avoidance like the original (stubs + rounded orthogonal runs).
  if (mode === 'orthogonal' && el.route !== 'manual' && sEl && tEl && sEl.id !== tEl.id) {
    const routed = autoOrthogonal(elementBounds(sEl), elementBounds(tEl));
    if (routed && routed.length >= 2) {
      const a = routed[0];
      const z = routed[routed.length - 1];
      const d = roundedPath(routed);
      const lp = midByLength(routed);
      const off = (el as any).labelPoint;
      return {
        d,
        p0: a,
        p1: z,
        pts: routed,
        tan0: unit(routed[1], routed[0]),
        tan1: unit(routed[routed.length - 2], z),
        labelPoint: off ? { x: lp.x + off.dx, y: lp.y + off.dy } : lp,
        stroke: th.arrow,
      };
    }
  }

  // Manual orthogonal routes render their stored waypoints (rounded),
  // with endpoints snapped to their bindings like the original (kg).
  if (mode === 'orthogonal' && (el.route === 'manual' || (sEl && tEl && sEl.id === tEl.id))) {
    const stored = rawPoints(el);
    if (stored.length >= 3) {
      const seq = [...stored];
      if (sEl && el.start) seq[0] = p0;
      if (tEl && el.end) seq[seq.length - 1] = p1;
      const d = roundedPath(seq);
      const lp = midByLength(seq);
      const off = (el as any).labelPoint;
      return {
        d,
        p0: seq[0],
        p1: seq[seq.length - 1],
        pts: seq,
        tan0: unit(seq[1], seq[0]),
        tan1: unit(seq[seq.length - 2], seq[seq.length - 1]),
        labelPoint: off ? { x: lp.x + off.dx, y: lp.y + off.dy } : lp,
        stroke: th.arrow,
      };
    }
  }

  // Draggable label offset (dx/dy in world units).
  let labelPoint = (el as any).labelPoint
    ? { x: (p0.x + p1.x) / 2 + (el as any).labelPoint.dx, y: (p0.y + p1.y) / 2 + (el as any).labelPoint.dy }
    : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  let d = '';
  let pts: Point[] = [p0, p1];
  if (mode === 'straight') {
    const stored = rawPoints(el);
    // Snap stored ends to bindings (original kg); keep hand bends.
    const seq = [...stored];
    if (sEl && el.start && seq.length) seq[0] = p0;
    if (tEl && el.end && seq.length) seq[seq.length - 1] = p1;
    pts = seq.length > 2 ? seq : [p0, p1];
    d = `M${pts.map((p) => `${p.x} ${p.y}`).join(' L')}`;
  } else if (mode === 'curved') {
    const stored = rawPoints(el);
    const seq = [...stored];
    if (sEl && el.start && seq.length) seq[0] = p0;
    if (tEl && el.end && seq.length) seq[seq.length - 1] = p1;
    if (el.route === 'manual' && seq.length >= 3) {
      d = smoothPath(seq);
      pts = seq;
      const lp = midByLength(seq);
      const off = (el as any).labelPoint;
      labelPoint = off ? { x: lp.x + off.dx, y: lp.y + off.dy } : lp;
    } else if (Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y)) {
      const mx = (p0.x + p1.x) / 2;
      d = `M${p0.x} ${p0.y} C${mx} ${p0.y} ${mx} ${p1.y} ${p1.x} ${p1.y}`;
    } else {
      const my = (p0.y + p1.y) / 2;
      d = `M${p0.x} ${p0.y} C${p0.x} ${my} ${p1.x} ${my} ${p1.x} ${p1.y}`;
    }
  } else if (Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y)) {
    if (Math.abs(p1.y - p0.y) < 1) d = `M${p0.x} ${p0.y} H${p1.x}`;
    else {
      const mx = (p0.x + p1.x) / 2;
      d = `M${p0.x} ${p0.y} H${mx} V${p1.y} H${p1.x}`;
      pts = [p0, { x: mx, y: p0.y }, { x: mx, y: p1.y }, p1];
      labelPoint = { x: mx, y: (p0.y + p1.y) / 2 };
    }
  } else if (Math.abs(p1.x - p0.x) < 1) {
    d = `M${p0.x} ${p0.y} V${p1.y}`;
  } else {
    const my = (p0.y + p1.y) / 2;
    d = `M${p0.x} ${p0.y} V${my} H${p1.x} V${p1.y}`;
    pts = [p0, { x: p0.x, y: my }, { x: p1.x, y: my }, p1];
    labelPoint = { x: (p0.x + p1.x) / 2, y: my };
  }
  const t = unit(p0, p1);
  // End tangents follow the drawn polyline legs (original head orientation).
  const leg0 = pts.length > 1 ? unit(pts[1], pts[0]) : { x: -t.x, y: -t.y };
  const leg1 = pts.length > 1 ? unit(pts[pts.length - 2], pts[pts.length - 1]) : t;
  return { d, p0, p1, pts, tan0: leg0, tan1: leg1, labelPoint, stroke: th.arrow };
}

export function arrowHead(geom: ArrowGeom, end: 'start' | 'end', color: string): string {
  // Head points along the end tangent (original: last two routed points).
  const t = end === 'end' ? geom.tan1 : geom.tan0;
  const a = end === 'end' ? geom.p1 : geom.p0;
  const ang = Math.atan2(t.y, t.x);
  const len = 10;
  const wid = 4.4;
  const x1 = a.x - len * Math.cos(ang) + wid * Math.sin(ang);
  const y1 = a.y - len * Math.sin(ang) - wid * Math.cos(ang);
  const x2 = a.x - len * Math.cos(ang) - wid * Math.sin(ang);
  const y2 = a.y - len * Math.sin(ang) + wid * Math.cos(ang);
  return `<path d="M${a.x} ${a.y} L${x1} ${y1} L${x2} ${y2} Z" fill="${color}"/>`;
}

export const dashArray = (el: BoardElement): string => {
  if (el.kind === 'async') return '7 5';
  if (el.kind === 'optional') return '2 5';
  if (el.dash === 'dashed') return '7 5';
  if (el.dash === 'dotted') return '2 5';
  return '';
};
