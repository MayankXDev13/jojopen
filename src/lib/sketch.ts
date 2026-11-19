import rough from "roughjs";

const generator = rough.generator();

/**
 * Deterministic FNV-1a hash from an element ID to produce a stable seed for RoughJS.
 */
export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 2147483646) + 1;
}

export function roughnessForStyle(style?: string): number {
  if (style === "clean") return 0;
  if (style === "chalkboard") return 1.1;
  return 1.7; // default sketch
}

/**
 * Generate standard geometric SVG path for a shape.
 */
export function shapePath(
  shape: string | undefined,
  w: number,
  h: number,
): string {
  w = Math.max(2, w);
  h = Math.max(2, h);
  const r = Math.min(8, w / 4, h / 4);
  switch (shape) {
    case "rectangle":
      return `M0 0 H${w} V${h} H0 Z`;
    case "ellipse":
      return `M${w / 2} 0 A${w / 2} ${h / 2} 0 1 1 ${w / 2} ${h} A${w / 2} ${h / 2} 0 1 1 ${w / 2} 0 Z`;
    case "diamond":
      return `M${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} L0 ${h / 2} Z`;
    case "person": {
      const c = h / 2;
      return `M${c} 0 H${w - c} A${c} ${c} 0 0 1 ${w - c} ${h} H${c} A${c} ${c} 0 0 1 ${c} 0 Z`;
    }
    case "cylinder": {
      const c = Math.min(14, h / 6);
      return `M0 ${c} C0 ${-c / 3} ${w} ${-c / 3} ${w} ${c} V${h - c} C${w} ${h + c / 3} 0 ${h + c / 3} 0 ${h - c} Z`;
    }
    case "document": {
      const c = Math.min(10, h / 6);
      return `M0 0 H${w} V${h - c} C${w * 0.75} ${h - c * 2.2} ${w * 0.25} ${h + c * 0.6} 0 ${h - c} Z`;
    }
    case "container":
      return `M14 0 H${w - 14} Q${w} 0 ${w} 14 V${h - 14} Q${w} ${h} ${w - 14} ${h} H14 Q0 ${h} 0 ${h - 14} V14 Q0 0 14 0 Z`;
    case "sticky":
      return `M0 0 H${w} V${h} H0 Z`;
    default:
      // default rounded rectangle
      return `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0 Z`;
  }
}

/**
 * Returns secondary internal curve for shapes (e.g. cylinder top arc).
 */
export function cylinderSecondaryPath(
  shape: string | undefined,
  w: number,
  h: number,
): string | null {
  if (shape === "cylinder") {
    const c = Math.min(14, h / 6);
    return `M0 ${c} C0 ${c + c * 1.33} ${w} ${c + c * 1.33} ${w} ${c}`;
  }
  return null;
}

function arcToPoints(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  _angle: number,
  largeArc: number,
  sweep: number,
  x2: number,
  y2: number,
  segments: number = 10,
): { x: number; y: number }[] {
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  let prx = rx;
  let pry = ry;
  let p = (dx * dx) / (prx * prx) + (dy * dy) / (pry * pry);
  if (p > 1) {
    prx *= Math.sqrt(p);
    pry *= Math.sqrt(p);
    p = 1;
  }
  const sign = largeArc === sweep ? -1 : 1;
  const num = prx * prx * pry * pry - prx * prx * dy * dy - pry * pry * dx * dx;
  const den = prx * prx * dy * dy + pry * pry * dx * dx;
  const coef = sign * Math.sqrt(Math.max(0, num / den));
  const cx = coef * ((prx * dy) / pry) + (x1 + x2) / 2;
  const cy = coef * (-(pry * dx) / prx) + (y1 + y2) / 2;
  const startAngle = Math.atan2((y1 - cy) / pry, (x1 - cx) / prx);
  let dAngle = Math.atan2((y2 - cy) / pry, (x2 - cx) / prx) - startAngle;
  if (sweep && dAngle < 0) dAngle += 2 * Math.PI;
  if (!sweep && dAngle > 0) dAngle -= 2 * Math.PI;
  const pts: { x: number; y: number }[] = [];
  for (let j = 1; j <= segments; j++) {
    const theta = startAngle + (dAngle * j) / segments;
    pts.push({
      x: cx + prx * Math.cos(theta),
      y: cy + pry * Math.sin(theta),
    });
  }
  return pts;
}

/**
 * Normalizes SVG path commands to approximate line segments for RoughJS generator.
 */
export function normalizePath(d: string): string {
  const tokens = d.match(/[MHVLQCAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let idx = 0;
  const nextNum = () => parseFloat(tokens[idx++]);
  let curX = 0,
    curY = 0,
    startX = 0,
    startY = 0;
  const out: string[] = [];
  const lineTo = (x: number, y: number) => {
    out.push(`L${x.toFixed(2)} ${y.toFixed(2)}`);
    curX = x;
    curY = y;
  };

  while (idx < tokens.length) {
    const cmd = tokens[idx++].toUpperCase();
    switch (cmd) {
      case "M":
        curX = nextNum();
        curY = nextNum();
        startX = curX;
        startY = curY;
        out.push(`M${curX.toFixed(2)} ${curY.toFixed(2)}`);
        break;
      case "L":
        lineTo(nextNum(), nextNum());
        break;
      case "H":
        lineTo(nextNum(), curY);
        break;
      case "V":
        lineTo(curX, nextNum());
        break;
      case "Q": {
        const cpx = nextNum(),
          cpy = nextNum(),
          ex = nextNum(),
          ey = nextNum();
        const x0 = curX,
          y0 = curY;
        for (let s = 1; s <= 3; s++) {
          const t = s / 3,
            it = 1 - t;
          lineTo(
            it * it * x0 + 2 * it * t * cpx + t * t * ex,
            it * it * y0 + 2 * it * t * cpy + t * t * ey,
          );
        }
        break;
      }
      case "C": {
        const cp1x = nextNum(),
          cp1y = nextNum();
        const cp2x = nextNum(),
          cp2y = nextNum();
        const ex = nextNum(),
          ey = nextNum();
        const x0 = curX,
          y0 = curY;
        for (let s = 1; s <= 8; s++) {
          const t = s / 8,
            it = 1 - t;
          lineTo(
            it * it * it * x0 +
              3 * it * it * t * cp1x +
              3 * it * t * t * cp2x +
              t * t * t * ex,
            it * it * it * y0 +
              3 * it * it * t * cp1y +
              3 * it * t * t * cp2y +
              t * t * t * ey,
          );
        }
        break;
      }
      case "A": {
        const rx = nextNum(),
          ry = nextNum(),
          angle = nextNum();
        const largeArc = nextNum(),
          sweep = nextNum();
        const ex = nextNum(),
          ey = nextNum();
        arcToPoints(
          curX,
          curY,
          rx,
          ry,
          angle,
          largeArc,
          sweep,
          ex,
          ey,
          10,
        ).forEach((pt) => lineTo(pt.x, pt.y));
        break;
      }
      case "Z":
        out.push("Z");
        curX = startX;
        curY = startY;
        break;
    }
  }
  return out.join(" ");
}

/**
 * Builds rough path for open/triangle arrow head.
 */
export function arrowHeadRoughPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
): string {
  const len = (width * 1.4 + 10) * 1.35;
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  const hyp = Math.hypot(dx, dy) || 1;
  dx /= hyp;
  dy /= hyp;
  const nx = -dy;
  const ny = dx;
  const spread = len * 0.42;
  const pt = (dist: number, side: number) =>
    `${(to.x - dx * dist + nx * side).toFixed(2)} ${(to.y - dy * dist + ny * side).toFixed(2)}`;
  return `M${pt(len, spread)} L${to.x.toFixed(2)} ${to.y.toFixed(2)} L${pt(len, -spread)}`;
}

export type RoughPathItem = {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

const pathCache = new Map<string, RoughPathItem[]>();
const fillCache = new Map<string, string>();

/**
 * Generates rough sketchy stroke paths with multi-stroke hand-drawn effect.
 */
export function getRoughPaths(
  id: string,
  d: string,
  options: {
    stroke: string;
    strokeWidth: number;
    roughness: number;
    dashed?: boolean;
    preserveVertices?: boolean;
    marker?: boolean;
    seed?: number;
  },
): RoughPathItem[] {
  const preserveVertices = options.preserveVertices ?? false;
  const key = `${id}|${d}|${options.stroke}|${options.strokeWidth}|${options.roughness}|${options.dashed ? 1 : 0}|${preserveVertices ? 1 : 0}|${options.marker ? 1 : 0}`;
  const cached = pathCache.get(key);
  if (cached) return cached;

  const seed = options.seed ?? seedFromId(id);

  if (options.marker) {
    const drawable = generator.path(d, {
      seed,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      roughness: 0.6,
      bowing: 0.6,
      maxRandomnessOffset: 1.1,
      preserveVertices: true,
      disableMultiStroke: true,
      strokeLineDash: options.dashed ? [7, 7] : undefined,
    });
    const paths: RoughPathItem[] = generator.toPaths(drawable).map((p) => ({
      d: p.d,
      stroke: p.stroke,
      strokeWidth: p.strokeWidth,
      fill: "none",
    }));
    if (pathCache.size > 5000) pathCache.clear();
    pathCache.set(key, paths);
    return paths;
  }

  const hasCurves = /[CA]/i.test(d);
  const processedD = preserveVertices || hasCurves ? d : normalizePath(d);
  const drawable = generator.path(processedD, {
    seed,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    roughness: hasCurves
      ? Math.min(options.roughness, 1.35)
      : options.roughness,
    bowing: hasCurves ? 1 : 2,
    maxRandomnessOffset: hasCurves ? 2.6 : 2.2,
    fill: undefined,
    preserveVertices,
    disableMultiStroke: options.roughness < 0.6,
    strokeLineDash: options.dashed ? [7, 7] : undefined,
  });

  const paths: RoughPathItem[] = generator.toPaths(drawable).map((p) => ({
    d: p.d,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    fill: "none",
  }));

  if (pathCache.size > 5000) pathCache.clear();
  pathCache.set(key, paths);
  return paths;
}

/**
 * Generates an organic wobbly fill path for sketch mode.
 */
export function getRoughFillPath(
  id: string,
  d: string,
  seed: number,
  roughness: number,
): string {
  const key = `${id}|${d}|${roughness}`;
  const cached = fillCache.get(key);
  if (cached) return cached;

  const drawable = generator.path(d, {
    seed: seed + 7,
    fill: "#000",
    fillStyle: "solid",
    stroke: "none",
    roughness: roughness * 0.7,
    bowing: 1.2,
  });
  const fillPath =
    generator.toPaths(drawable).find((p) => p.fill && p.fill !== "none")?.d ??
    d;
  if (fillCache.size > 4000) fillCache.clear();
  fillCache.set(key, fillPath);
  return fillPath;
}
