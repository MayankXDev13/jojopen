/* Geometry: bounds, anchors, arrow paths. */

import type { BoardElement, Point } from './model';
import type { Theme } from './palette';

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type ArrowGeom = {
  d: string;
  p0: Point;
  p1: Point;
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

export function arrowGeom(
  el: BoardElement,
  getElement: (id: string) => BoardElement | undefined,
  th: Theme,
): ArrowGeom {
  const sEl = el.start?.elementId ? getElement(el.start.elementId) : undefined;
  const tEl = el.end?.elementId ? getElement(el.end.elementId) : undefined;
  const pts = el.points || [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const first = { x: el.x + (pts[0]?.x ?? 0), y: el.y + (pts[0]?.y ?? 0) };
  const last = { x: el.x + (pts[pts.length - 1]?.x ?? 0), y: el.y + (pts[pts.length - 1]?.y ?? 0) };
  let p0 = first;
  let p1 = last;
  if (sEl) p0 = anchorPoint(sEl, tEl ? centerOf(tEl) : last);
  if (tEl) p1 = anchorPoint(tEl, sEl ? centerOf(sEl) : first);

  let d = '';
  let labelPoint = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const mode = el.routeMode || 'orthogonal';
  if (mode === 'straight') {
    d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
  } else if (mode === 'curved') {
    if (Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y)) {
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
      labelPoint = { x: mx, y: (p0.y + p1.y) / 2 };
    }
  } else if (Math.abs(p1.x - p0.x) < 1) {
    d = `M${p0.x} ${p0.y} V${p1.y}`;
  } else {
    const my = (p0.y + p1.y) / 2;
    d = `M${p0.x} ${p0.y} V${my} H${p1.x} V${p1.y}`;
    labelPoint = { x: (p0.x + p1.x) / 2, y: my };
  }
  return { d, p0, p1, labelPoint, stroke: th.arrow };
}

export function arrowHead(geom: ArrowGeom, end: 'start' | 'end', color: string): string {
  const { p0, p1 } = geom;
  const a = end === 'end' ? p1 : p0;
  const b = end === 'end' ? p0 : p1;
  const ang = Math.atan2(a.y - b.y, a.x - b.x);
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
