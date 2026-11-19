/* Auto-layout for the diagram language: ranked layers + orthogonal routing. */

import { clamp } from "./dom";
import type { ParsedDiagram, ParsedEdge, ParsedNode } from "./dsl";

export type LayoutBox = { x: number; y: number; w: number; h: number };
export type GroupBox = LayoutBox & {
  key: string;
  label: string;
  depth: number;
};
export type LayoutEdge = ParsedEdge & {
  d: string;
  pts: { x: number; y: number }[];
  labelAt: { x: number; y: number };
};
export type Layout = {
  nodes: Record<string, LayoutBox>;
  groups: GroupBox[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  direction: string;
  parsed: ParsedDiagram;
};

export function wrapText(
  text: string,
  maxW: number,
  fontSize: number,
): string[] {
  const cw = fontSize * 0.56;
  const maxChars = Math.max(4, Math.floor(maxW / cw));
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export function nodeSize(n: ParsedNode): { w: number; h: number } {
  const label = n.label || n.key;
  const lines = wrapText(label, 190, 13);
  const longest = Math.max(...lines.map((l) => l.length), 4);
  let w = clamp(longest * 7.2 + 46, 104, 250);
  if (n.icon) w += 6;
  let h = 64;
  if (n.shape === "person") h = 78;
  if (n.shape === "ellipse") h = 76;
  if (n.shape === "cylinder") h = 78;
  if (lines.length > 1) h += 16;
  return { w: Math.round(w), h: Math.round(h) };
}

const center = (b: LayoutBox) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function layoutDiagram(p: ParsedDiagram): Layout {
  const nodes = [...p.nodes.values()];
  if (!nodes.length && !p.groups.size) {
    return {
      nodes: {},
      groups: [],
      edges: [],
      width: 240,
      height: 120,
      direction: p.direction,
      parsed: p,
    };
  }
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.key, []]));
  const indeg = new Map<string, number>(nodes.map((n) => [n.key, 0]));
  for (const e of p.edges) {
    if (e.from === e.to) continue;
    if (!byKey.has(e.from) || !byKey.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }
  const rank = new Map<string, number>(nodes.map((n) => [n.key, 0]));
  const q = nodes
    .filter((n) => (indeg.get(n.key) || 0) === 0)
    .map((n) => n.key);
  const seen = new Set<string>();
  while (q.length) {
    const u = q.shift()!;
    seen.add(u);
    for (const v of adj.get(u) || []) {
      rank.set(v, Math.max(rank.get(v) || 0, (rank.get(u) || 0) + 1));
      indeg.set(v, (indeg.get(v) || 0) - 1);
      if (indeg.get(v) === 0 && !seen.has(v)) q.push(v);
    }
  }
  let maxR = Math.max(0, ...[...rank.values()]);
  for (const n of nodes) {
    if (!seen.has(n.key)) {
      maxR += 1;
      rank.set(n.key, maxR);
    }
  }

  const dir = p.direction || "right";
  const horizontal = dir === "right" || dir === "left";
  const ranks = new Map<number, ParsedNode[]>();
  for (const n of nodes) {
    const r = rank.get(n.key) || 0;
    if (!ranks.has(r)) ranks.set(r, []);
    ranks.get(r)!.push(n);
  }
  const sortedRanks = [...ranks.keys()].sort((a, b) => a - b);
  const gapPrimary = 106;
  const gapCross = 26;
  const boxes = new Map<string, LayoutBox>();
  const sizes = new Map<string, { w: number; h: number }>();
  let cursor = 0;
  for (const r of sortedRanks) {
    const list = ranks.get(r)!.sort((a, b) => a.order - b.order);
    list.forEach((n) => sizes.set(n.key, nodeSize(n)));
    const size = (n: ParsedNode) => sizes.get(n.key)!;
    const primary = Math.max(
      ...list.map((n) => (horizontal ? size(n).w : size(n).h)),
    );
    const crossTotal = list.reduce(
      (s, n) => s + (horizontal ? size(n).h : size(n).w) + gapCross,
      -gapCross,
    );
    let cross = -crossTotal / 2;
    for (const n of list) {
      if (horizontal) {
        boxes.set(n.key, { x: cursor, y: cross, w: size(n).w, h: size(n).h });
        cross += size(n).h + gapCross;
      } else {
        boxes.set(n.key, { x: cross, y: cursor, w: size(n).w, h: size(n).h });
        cross += size(n).w + gapCross;
      }
    }
    cursor += primary + gapPrimary;
  }
  /* mirror for left/up */
  if (dir === "left" || dir === "up") {
    let minP = Infinity;
    let maxP = -Infinity;
    for (const b of boxes.values()) {
      const a = horizontal ? b.x : b.y;
      const z = horizontal ? b.x + b.w : b.y + b.h;
      minP = Math.min(minP, a);
      maxP = Math.max(maxP, z);
    }
    for (const b of boxes.values()) {
      if (horizontal) b.x = minP + maxP - (b.x + b.w);
      else b.y = minP + maxP - (b.y + b.h);
    }
  }
  /* group boxes */
  const depth = (k: string) => {
    let d = 0;
    let g = p.groups.get(k);
    while (g && g.parent) {
      d++;
      g = p.groups.get(g.parent);
    }
    return d;
  };
  const gBoxes: GroupBox[] = [];
  const groupBox = (k: string): GroupBox | null => {
    const exist = gBoxes.find((b) => b.key === k);
    if (exist) return exist;
    const g = p.groups.get(k)!;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      if (n.group !== k) continue;
      const b = boxes.get(n.key);
      if (!b) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    for (const c of g.children) {
      const b = groupBox(c);
      if (!b) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    if (!Number.isFinite(minX)) return null;
    const pad = 26;
    const top = 30;
    const box = {
      key: k,
      label: g.label,
      depth: depth(k),
      x: minX - pad,
      y: minY - pad - top,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2 + top,
    };
    gBoxes.push(box);
    return box;
  };
  for (const k of [...p.groups.keys()].sort((a, b) => depth(b) - depth(a)))
    groupBox(k);

  /* normalize */
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  let first = true;
  const eat = (b: LayoutBox) => {
    if (first) {
      minX = b.x;
      minY = b.y;
      maxX = b.x + b.w;
      maxY = b.y + b.h;
      first = false;
    } else {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
  };
  for (const b of boxes.values()) eat(b);
  for (const b of gBoxes) eat(b);
  const padOuter = 26;
  const dx = padOuter - minX;
  const dy = padOuter - minY;
  for (const b of boxes.values()) {
    b.x += dx;
    b.y += dy;
  }
  for (const b of gBoxes) {
    b.x += dx;
    b.y += dy;
  }
  const width = Math.max(120, maxX - minX + padOuter * 2);
  const height = Math.max(80, maxY - minY + padOuter * 2);

  /* edge routes */
  const groupByKey = new Map(gBoxes.map((b) => [b.key, b]));
  const outEdges: LayoutEdge[] = [];
  let skipN = 0;
  for (const e of p.edges) {
    const a = boxes.get(e.from) || groupByKey.get(e.from);
    const b = boxes.get(e.to) || groupByKey.get(e.to);
    if (!a || !b || e.from === e.to) continue;
    const r0 = rank.get(e.from) ?? 0;
    const r1 = rank.get(e.to) ?? 0;
    const lo = Math.min(r0, r1);
    const hi = Math.max(r0, r1);
    const between =
      lo + 1 < hi
        ? (nodes
            .filter((n) => {
              const r = rank.get(n.key) ?? 0;
              return r > lo && r < hi;
            })
            .map((n) => boxes.get(n.key))
            .filter(Boolean) as LayoutBox[])
        : [];
    const geom = routeDiagramEdge(
      a,
      b,
      dir,
      e,
      between.length ? { between, offset: 22 + (skipN++ % 3) * 14 } : null,
    );
    outEdges.push({ ...e, ...geom });
  }
  let width2 = width;
  let height2 = height;
  for (const e of outEdges) {
    for (const pt of e.pts || []) {
      width2 = Math.max(width2, pt.x + 26);
      height2 = Math.max(height2, pt.y + 26);
    }
    if (e.labelAt) {
      width2 = Math.max(width2, e.labelAt.x + 26);
      height2 = Math.max(height2, e.labelAt.y + 26);
    }
  }
  return {
    nodes: Object.fromEntries(boxes),
    groups: gBoxes.sort((a, b) => a.depth - b.depth),
    edges: outEdges,
    width: width2,
    height: height2,
    direction: dir,
    parsed: p,
  };
}

export function routeDiagramEdge(
  a: LayoutBox,
  b: LayoutBox,
  dir: string,
  e: ParsedEdge,
  skipInfo: { between: LayoutBox[]; offset: number } | null,
): {
  d: string;
  pts: { x: number; y: number }[];
  labelAt: { x: number; y: number };
} {
  const horizontal = dir === "right" || dir === "left";

  /* A long edge that jumps over intermediate ranks routes around them instead of
     slicing through the nodes and their labels. */
  if (skipInfo) {
    const { between, offset } = skipInfo;
    if (horizontal) {
      const minY = Math.min(...between.map((n) => n.y));
      const maxY = Math.max(...between.map((n) => n.y + n.h));
      const p0 = { x: dir === "right" ? a.x + a.w : a.x, y: center(a).y };
      const p1 = { x: dir === "right" ? b.x : b.x + b.w, y: center(b).y };
      const y = Math.max(maxY, p0.y, p1.y) + offset;
      const turn = p1.x - (dir === "right" ? 14 : -14);
      const pts = [
        p0,
        { x: p0.x, y },
        { x: turn, y },
        { x: turn, y: p1.y },
        p1,
      ];
      const d = `M${p0.x} ${p0.y} V${y} H${turn} V${p1.y} H${p1.x}`;
      return { d, pts, labelAt: { x: (p0.x + p1.x) / 2, y } };
    }
    const maxX = Math.max(...between.map((n) => n.x + n.w));
    const p0 = { x: center(a).x, y: dir === "down" ? a.y + a.h : a.y };
    const p1 = { x: center(b).x, y: dir === "down" ? b.y : b.y + b.h };
    const x = maxX + offset;
    const pts = [p0, { x, y: p0.y }, { x, y: p1.y }, p1];
    const d = `M${p0.x} ${p0.y} H${x} V${p1.y} H${p1.x}`;
    return { d, pts, labelAt: { x: x + 10, y: (p0.y + p1.y) / 2 } };
  }

  const ac = center(a);
  const bc = center(b);
  let p0: { x: number; y: number };
  let p1: { x: number; y: number };
  if (horizontal) {
    const rightward = dir === "right";
    const forward = rightward ? bc.x >= ac.x : bc.x <= ac.x;
    if (forward) {
      p0 = { x: rightward ? a.x + a.w : a.x, y: ac.y };
      p1 = { x: rightward ? b.x : b.x + b.w, y: bc.y };
    } else {
      p0 = { x: ac.x, y: a.y + a.h };
      p1 = { x: bc.x, y: b.y };
    }
  } else {
    const downward = dir === "down";
    const forward = downward ? bc.y >= ac.y : bc.y <= ac.y;
    if (forward) {
      p0 = { x: ac.x, y: downward ? a.y + a.h : a.y };
      p1 = { x: bc.x, y: downward ? b.y : b.y + b.h };
    } else {
      p0 = { x: a.x + a.w, y: ac.y };
      p1 = { x: b.x, y: bc.y };
    }
  }
  const route = e.route || "orthogonal";
  let d = "";
  let pts = [p0, p1];
  let labelAt = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  if (route === "straight" || route === "line") {
    d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
  } else if (route === "curved") {
    if (horizontal) {
      const mx = (p0.x + p1.x) / 2;
      d = `M${p0.x} ${p0.y} C${mx} ${p0.y} ${mx} ${p1.y} ${p1.x} ${p1.y}`;
      labelAt = { x: mx, y: (p0.y + p1.y) / 2 };
    } else {
      const my = (p0.y + p1.y) / 2;
      d = `M${p0.x} ${p0.y} C${p0.x} ${my} ${p1.x} ${my} ${p1.x} ${p1.y}`;
      labelAt = { x: (p0.x + p1.x) / 2, y: my };
    }
  } else if (Math.abs(p0.x - p1.x) < 1 || Math.abs(p0.y - p1.y) < 1) {
    d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
  } else if (horizontal && p0.y !== p1.y && Math.abs(p1.x - p0.x) > 24) {
    const mx = (p0.x + p1.x) / 2;
    d = `M${p0.x} ${p0.y} H${mx} V${p1.y} H${p1.x}`;
    pts = [p0, { x: mx, y: p0.y }, { x: mx, y: p1.y }, p1];
    labelAt = { x: mx, y: (p0.y + p1.y) / 2 };
  } else if (!horizontal) {
    const my = (p0.y + p1.y) / 2;
    d = `M${p0.x} ${p0.y} V${my} H${p1.x} V${p1.y}`;
    pts = [p0, { x: p0.x, y: my }, { x: p1.x, y: my }, p1];
    labelAt = { x: (p0.x + p1.x) / 2, y: my };
  } else {
    const my = Math.max(p0.y, p1.y) + 34;
    d = `M${p0.x} ${p0.y} V${my} H${p1.x} V${p1.y}`;
    pts = [p0, { x: p0.x, y: my }, { x: p1.x, y: my }, p1];
    labelAt = { x: (p0.x + p1.x) / 2, y: my };
  }
  return { d, pts, labelAt };
}
