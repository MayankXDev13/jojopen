/* Pen ink pipeline: pressure, streamline, smoothing, thinning, simplify. */

export type InkPoint = { x: number; y: number; pressure: number };

export function pressureFromEvent(e: PointerEvent | React.PointerEvent, last: number): { pressure: number; isPen: boolean } {
  const anyE = e as any;
  const raw = typeof anyE.pressure === 'number' ? anyE.pressure : 0.5;
  const pointerType = (anyE.pointerType as string) || 'mouse';
  const isPen = pointerType === 'pen' && raw !== 0.5 && raw > 0;
  if (isPen) return { pressure: Math.min(1, Math.max(0.1, raw)), isPen: true };
  return { pressure: 0.5, isPen: false };
}

/** Velocity-simulated pressure for mouse: faster = thinner. */
export function simulatePressure(dist: number, dtMs: number): number {
  const v = dist / Math.max(1, dtMs);
  // v ~0 -> 0.9, v large -> 0.25
  return Math.min(0.9, Math.max(0.25, 0.9 - v * 0.35));
}

export function streamline(prev: InkPoint, next: InkPoint, t = 0.45): InkPoint {
  return {
    x: prev.x + (next.x - prev.x) * (1 - t),
    y: prev.y + (next.y - prev.y) * (1 - t),
    pressure: prev.pressure + (next.pressure - prev.pressure) * (1 - t),
  };
}

/** Chaikin smoothing for centerline. */
export function chaikin(points: InkPoint[]): InkPoint[] {
  if (points.length < 3) return points;
  const out: InkPoint[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    out.push(
      { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25, pressure: (a.pressure * 0.75 + b.pressure * 0.25) },
      { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75, pressure: (a.pressure * 0.25 + b.pressure * 0.75) },
    );
  }
  out.push(points[points.length - 1]);
  return out;
}

function perp(ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax;
  const dy = by - ax * 0 + ay * 0; // placeholder to keep simple
  void dx;
  void dy;
  const ddx = bx - ax;
  const ddy = by - ay;
  const len = Math.hypot(ddx, ddy) || 1;
  return [-ddy / len, ddx / len];
}

/** Build outlined stroke polygon path from centerline + widths (original: size×2.2, thinning .55). */
export function strokeOutlinePath(points: InkPoint[], baseWidth: number, thinning = 0.55): string {
  if (!points.length) return '';
  if (points.length === 1) {
    const p = points[0];
    const r = (baseWidth * (0.4 + p.pressure * thinning)) / 2;
    return `M${p.x - r} ${p.y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const smooth = chaikin(points);
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < smooth.length; i++) {
    const p = smooth[i];
    const a = smooth[Math.max(0, i - 1)];
    const b = smooth[Math.min(smooth.length - 1, i + 1)];
    const [nx, ny] = perp(a.x, a.y, b.x, b.y);
    const w = (baseWidth * (0.45 + p.pressure * thinning)) / 2;
    left.push(`${(p.x + nx * w).toFixed(1)} ${(p.y + ny * w).toFixed(1)}`);
    right.unshift(`${(p.x - nx * w).toFixed(1)} ${(p.y - ny * w).toFixed(1)}`);
  }
  return `M${left.join(' L')} L${right.join(' L')} Z`;
}

/** Ramer-Douglas-Peucker simplify. */
export function simplify(points: InkPoint[], tol = 1.2): InkPoint[] {
  if (points.length < 4) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  const distToSeg = (p: InkPoint, a: InkPoint, b: InkPoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSeg(points[i], points[s], points[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Snap angle to 15deg increments for Shift-straight segments. */
export function snapAngle15(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (!len) return to;
  const step = Math.PI / 12;
  const ang = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len };
}
