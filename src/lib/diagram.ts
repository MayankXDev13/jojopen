/* Diagram SVG rendering: nodes, groups, routed edges and the paint helpers.
   The engine renders to markup because the same output is used on the canvas,
   in slide thumbnails, in exports and inside generated SVG files. */

import { esc } from "./dom";
import { ICONS } from "./icons";
import { brandFill, iconInner, resolveIcon } from "./iconLibrary";
import {
  COLOR_TO_ROLE,
  ROLE_COLORS,
  type StyleKey,
  type Theme,
} from "./palette";
import { inferRole } from "./roles";
import { layoutDiagram, wrapText, type Layout } from "./layout";
import { parseDSL, type ParsedDiagram, type ParsedNode } from "./dsl";
import { MAKE, type BoardDoc, type BoardElement } from "./model";

export type DiagramEnv = {
  th: Theme;
  look: StyleKey;
  clean: boolean;
  palette: boolean;
};

export type Paint = { fill: string; stroke: string; text: string };

export function nodePaint(n: ParsedNode, env: DiagramEnv): Paint {
  if (!env.palette)
    return { fill: "transparent", stroke: env.th.ink, text: env.th.ink };
  if (n.color && n.color.startsWith("#"))
    return { fill: n.color + "22", stroke: n.color, text: env.th.ink };
  const byColor = n.color
    ? ROLE_COLORS[env.look][COLOR_TO_ROLE[n.color]]
    : undefined;
  if (byColor) return byColor;
  const role = n.role || inferRole(n.label || n.key, n.icon, n.shape);
  return (
    (ROLE_COLORS[env.look] || ROLE_COLORS.light)[role] ||
    ROLE_COLORS[env.look].neutral
  );
}

export function shapeMarkup(
  shape: string | undefined,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  filter: string,
): string {
  w = Math.max(2, w);
  h = Math.max(2, h);
  const sw = 1.6;
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${filter ? ` filter="url(#rough)"` : ""}`;
  switch (shape) {
    case "rectangle":
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="2" ${common}/>`;
    case "ellipse":
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" ${common}/>`;
    case "diamond":
      return `<path d="M${w / 2} 1 L${w - 1} ${h / 2} L${w / 2} ${h - 1} L1 ${h / 2} Z" ${common}/>`;
    case "cylinder":
      return `<path d="M1 ${12} V${h - 10} C1 ${h - 2} ${w - 1} ${h - 2} ${w - 1} ${h - 10} V12" ${common}/><ellipse cx="${w / 2}" cy="12" rx="${w / 2 - 1}" ry="10" ${common}/>`;
    case "document":
      return `<path d="M1 1 H${w - 1} V${h - 14} C${w * 0.72} ${h - 2} ${w * 0.3} ${h - 26} 1 ${h - 12} Z" ${common}/>`;
    case "person": {
      const c = (h - 2) / 2;
      return `<path d="M${c + 1} 1 H${w - 1 - c} A${c} ${c} 0 0 1 ${w - 1 - c} ${h - 1} H${c + 1} A${c} ${c} 0 0 1 ${c + 1} 1 Z" ${common}/>`;
    }
    default:
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${Math.min(13, h / 2 - 2)}" ${common}/>`;
  }
}

export function nodeIconMarkup(
  n: { icon?: string | null },
  x: number,
  y: number,
  size: number,
  color: string,
): string {
  const lib = resolveIcon(n.icon || "");
  if (lib) {
    if (lib.brand) {
      const inner = iconInner(lib.id, { brandFill: brandFill(lib, false) });
      return `<g transform="translate(${x} ${y}) scale(${size / 24})">${inner}</g>`;
    }
    const inner = iconInner(lib.id);
    return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  }
  const p = ICONS[n.icon || ""];
  if (!p) return "";
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</g>`;
}

export function diagramSVG(
  p: ParsedDiagram,
  layout: Layout,
  env: DiagramEnv,
  opts: { width?: number; height?: number } = {},
): string {
  const th = env.th;
  const clean = env.clean;
  const filter = clean ? "" : "url(#rough)";
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${opts.width || layout.width}" height="${opts.height || layout.height}" style="overflow:visible">`,
  );
  out.push(
    `<defs><filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`,
  );

  for (const g of layout.groups) {
    out.push(
      `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14" fill="${clean ? "rgba(127,127,127,0.035)" : "rgba(127,127,127,0.05)"}" stroke="${th.frame}" stroke-width="1.4" stroke-dasharray="6 5"/>`,
    );
    out.push(
      `<text x="${g.x + 14}" y="${g.y + 20}" font-family="Inter,system-ui,sans-serif" font-size="11.5" font-weight="600" letter-spacing=".04em" fill="${th.frameText}">${esc(g.label)}</text>`,
    );
  }

  for (const n of p.nodes.values()) {
    const b = layout.nodes[n.key];
    if (!b) continue;
    const paint = nodePaint(n, env);
    const shape = n.shape || "rounded";
    out.push(
      `<g data-node="${esc(n.key)}" transform="translate(${b.x} ${b.y})">`,
    );
    out.push(
      shapeMarkup(
        shape,
        b.w,
        b.h,
        paint.fill === "transparent" ? "none" : paint.fill,
        paint.stroke,
        filter,
      ),
    );
    const lines = wrapText(n.label || n.key, b.w - (n.icon ? 54 : 24), 13);
    const lh = 15;
    const total = lines.length * lh;
    const startY = b.h / 2 - total / 2 + 12;
    const cx = n.icon ? b.w / 2 + 10 : b.w / 2;
    const icon = nodeIconMarkup(n, 16, b.h / 2 - 9, 18, paint.text);
    if (icon) out.push(icon);
    lines.forEach((ln, i) => {
      out.push(
        `<text x="${cx}" y="${startY + i * lh + (lines.length === 1 ? -2 : 0)}" text-anchor="middle" font-family="${clean ? "Inter,system-ui,sans-serif" : "Kalam,'Comic Neue',cursive"}" font-size="13" fill="${paint.text}">${esc(ln)}</text>`,
      );
    });
    if (n.link) out.push(`<title>${esc(n.link)}</title>`);
    out.push(`</g>`);
  }

  const labelBits: string[] = [];
  for (const e of layout.edges) {
    const dash =
      e.kind === "async"
        ? "7 5"
        : e.kind === "optional"
          ? "2 5"
          : e.dash === "dashed"
            ? "7 5"
            : e.dash === "dotted"
              ? "2 5"
              : "";
    const thick = e.dash === "thick" ? 2.6 : 1.6;
    out.push(
      `<path d="${e.d}" fill="none" stroke="${th.arrow}" stroke-width="${thick}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ""} marker-end="${e.kind === "line" ? "" : "url(#arrowhead)"}"/>`,
    );
    if (e.kind === "bidirectional")
      out.push(
        `<path d="${e.d}" fill="none" stroke="${th.arrow}" stroke-width="${thick}" marker-start="url(#arrowhead)"/>`,
      );
    if (e.label) {
      const lines = wrapText(e.label, 170, 11);
      const tw = Math.max(...lines.map((l) => l.length)) * 5.6 + 14;
      const thh = 16 + (lines.length - 1) * 12;
      labelBits.push(
        `<rect x="${e.labelAt.x - tw / 2}" y="${e.labelAt.y - thh / 2}" width="${tw}" height="${thh}" rx="6" fill="${th.labelPill}"/>`,
      );
      lines.forEach((ln, i) =>
        labelBits.push(
          `<text x="${e.labelAt.x}" y="${e.labelAt.y + 3.5 - (lines.length - 1) * 6 + i * 12}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="10.5" fill="${th.muted}">${esc(ln)}</text>`,
        ),
      );
    }
  }
  out.push(...labelBits);
  out.push(
    `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${th.arrow}"/></marker></defs>`,
  );
  out.push(`</svg>`);
  return out.filter(Boolean).join("");
}

export type DiagramRender = {
  parsed: ParsedDiagram;
  layout: Layout;
  svg: string;
};

const cache = new Map<string, DiagramRender>();

/** Parse + layout + render a diagram, cached by source and visual style. */
export function diagramFor(dsl: string, env: DiagramEnv): DiagramRender {
  const key = `${dsl}|${env.look}|${env.palette ? "r" : "m"}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const parsed = parseDSL(dsl);
  const layout = layoutDiagram(parsed);
  const svg = diagramSVG(parsed, layout, env);
  const res = { parsed, layout, svg };
  if (cache.size > 60) cache.clear();
  cache.set(key, res);
  return res;
}

export function clearDiagramCache() {
  cache.clear();
}

/**
 * Compiles a DSL diagram into interactive board elements inside a diagram frame.
 * Shapes, containers, and arrows are created with `frameId: diagramId` so they
 * are interactive, selectable, and deletable on the canvas.
 */
export function compileDiagramDoc(
  doc: BoardDoc,
  diagramId: string,
  dsl?: string,
): { ast: ParsedDiagram; success: boolean } | null {
  const d = doc.elements[diagramId];
  if (!d || d.type !== "diagram") return null;

  const src = dsl !== undefined ? dsl : d.dsl || "";
  const ast = parseDSL(src);
  if (ast.diagnostics.some((x) => x.severity === "error")) {
    return { ast, success: false };
  }

  const layout = layoutDiagram(ast);
  const Dt = 48; // Frame internal padding

  d.dsl = src;
  if (ast.title) d.title = ast.title;
  d.width = Math.round(layout.width + Dt * 2);
  d.height = Math.round(layout.height + Dt * 2);

  const f = d.x + Dt;
  const g = d.y + Dt;

  // Existing children belonging to this diagram frame
  const existingMap = new Map<string, BoardElement>();
  for (const el of Object.values(doc.elements)) {
    if (el.frameId !== diagramId) continue;
    const meta = el.meta || {};
    const key = meta.dslKey
      ? `n:${meta.dslKey}`
      : meta.dslGroup
        ? `g:${meta.dslGroup}`
        : meta.dslEdge
          ? `e:${meta.dslEdge}`
          : null;
    if (key) existingMap.set(key, el);
  }

  const upserts = new Map<string, BoardElement>();

  // 1. Groups -> Containers
  for (const grp of layout.groups) {
    const key = `g:${grp.key}`;
    const prev = existingMap.get(key) || MAKE.container({ frameId: diagramId });
    upserts.set(key, {
      ...prev,
      label: grp.label,
      x: Math.round(f + grp.x),
      y: Math.round(g + grp.y),
      width: Math.round(grp.w),
      height: Math.round(grp.h),
      frameId: diagramId,
      meta: { ...prev.meta, dslGroup: grp.key },
    });
  }

  // 2. Nodes -> Shapes
  for (const node of ast.nodes.values()) {
    const b = layout.nodes[node.key];
    if (!b) continue;
    const key = `n:${node.key}`;
    const prev = existingMap.get(key) || MAKE.shape({ frameId: diagramId });
    upserts.set(key, {
      ...prev,
      label: node.label || node.key,
      shape: node.shape || "rounded",
      icon: node.icon || null,
      color: node.color || null,
      role: node.role || null,
      colorLocked: !!(node.color || node.role),
      x: Math.round(f + b.x),
      y: Math.round(g + b.y),
      width: Math.round(b.w),
      height: Math.round(b.h),
      frameId: diagramId,
      meta: { ...prev.meta, dslKey: node.key },
    });
  }

  // 3. Edges -> Arrows
  const resolveTarget = (k: string) =>
    upserts.get(`n:${k}`) ?? upserts.get(`g:${k}`);

  ast.edges.forEach((edge, idx) => {
    const fromEl = resolveTarget(edge.from);
    const toEl = resolveTarget(edge.to);
    if (!fromEl || !toEl) return;
    const edgeKey = (edge as any).id || `${edge.from}->${edge.to}:${idx}`;
    const key = `e:${edgeKey}`;
    const prev = existingMap.get(key) || MAKE.arrow({ frameId: diagramId });
    const dash =
      edge.kind === "async"
        ? "dashed"
        : edge.kind === "optional"
          ? "dotted"
          : "solid";
    const startHead = edge.kind === "bidirectional" ? "triangle" : "none";
    const endHead = edge.kind === "line" ? "none" : "triangle";
    const routeMode =
      edge.route === "curved" || edge.route === "straight"
        ? edge.route
        : "orthogonal";

    const ax = Math.round(fromEl.x + fromEl.width / 2);
    const ay = Math.round(fromEl.y + fromEl.height / 2);
    const bx = Math.round(toEl.x + toEl.width / 2);
    const by = Math.round(toEl.y + toEl.height / 2);

    const dir = ast.direction || "right";
    const forward =
      dir === "right"
        ? toEl.x >= fromEl.x
        : dir === "down"
          ? toEl.y >= fromEl.y
          : dir === "left"
            ? toEl.x <= fromEl.x
            : toEl.y <= fromEl.y;

    const startAnchor = forward
      ? dir === "down"
        ? { x: 0.5, y: 1 }
        : dir === "up"
          ? { x: 0.5, y: 0 }
          : dir === "left"
            ? { x: 0, y: 0.5 }
            : { x: 1, y: 0.5 }
      : null;

    const endAnchor = forward
      ? dir === "down"
        ? { x: 0.5, y: 0 }
        : dir === "up"
          ? { x: 0.5, y: 1 }
          : dir === "left"
            ? { x: 1, y: 0.5 }
            : { x: 0, y: 0.5 }
      : null;

    upserts.set(key, {
      ...prev,
      kind: edge.kind,
      dash,
      startHead,
      endHead,
      routeMode: prev.route === "manual" ? prev.routeMode : routeMode,
      label: edge.label || "",
      start: {
        elementId: fromEl.id,
        anchor: prev.start?.elementId === fromEl.id ? prev.start.anchor : null,
        isPrecise: prev.start?.isPrecise ?? !!startAnchor,
        normalizedAnchor:
          prev.start?.elementId === fromEl.id && prev.start.normalizedAnchor
            ? prev.start.normalizedAnchor
            : startAnchor || undefined,
      },
      end: {
        elementId: toEl.id,
        anchor: prev.end?.elementId === toEl.id ? prev.end.anchor : null,
        isPrecise: prev.end?.isPrecise ?? !!endAnchor,
        normalizedAnchor:
          prev.end?.elementId === toEl.id && prev.end.normalizedAnchor
            ? prev.end.normalizedAnchor
            : endAnchor || undefined,
      },
      route: prev.route === "manual" ? "manual" : "auto",
      x: ax,
      y: ay,
      points: [
        { x: 0, y: 0 },
        { x: bx - ax, y: by - ay },
      ],
      frameId: diagramId,
      meta: { ...prev.meta, dslEdge: edgeKey },
    });
  });

  // Assign indices: containers < shapes < arrows
  const baseIdx = d.index ?? 0;
  let counter = 1;
  for (const c of upserts.values()) {
    if (c.type === "container") c.index = baseIdx + 0.001 * counter++;
  }
  for (const s of upserts.values()) {
    if (s.type === "shape") s.index = baseIdx + 0.001 * counter++;
  }
  for (const a of upserts.values()) {
    if (a.type === "arrow") a.index = baseIdx + 0.001 * counter++;
  }

  // Delete removed child elements
  const keepIds = new Set([...upserts.values()].map((e) => e.id));
  for (const el of existingMap.values()) {
    if (!keepIds.has(el.id)) {
      delete doc.elements[el.id];
    }
  }

  // Store upserted elements in doc
  for (const el of upserts.values()) {
    doc.elements[el.id] = el;
  }

  return { ast, success: true };
}
