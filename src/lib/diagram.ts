/* Diagram SVG rendering: nodes, groups, routed edges and the paint helpers.
   The engine renders to markup because the same output is used on the canvas,
   in slide thumbnails, in exports and inside generated SVG files. */

import { esc } from './dom';
import { ICONS } from './icons';
import { COLOR_TO_ROLE, ROLE_COLORS, type StyleKey, type Theme } from './palette';
import { inferRole } from './roles';
import { layoutDiagram, wrapText, type Layout } from './layout';
import { parseDSL, type ParsedDiagram, type ParsedNode } from './dsl';

export type DiagramEnv = {
  th: Theme;
  look: StyleKey;
  clean: boolean;
  palette: boolean;
};

export type Paint = { fill: string; stroke: string; text: string };

export function nodePaint(n: ParsedNode, env: DiagramEnv): Paint {
  if (!env.palette) return { fill: 'transparent', stroke: env.th.ink, text: env.th.ink };
  if (n.color && n.color.startsWith('#')) return { fill: n.color + '22', stroke: n.color, text: env.th.ink };
  const byColor = n.color ? ROLE_COLORS[env.look][COLOR_TO_ROLE[n.color]] : undefined;
  if (byColor) return byColor;
  const role = n.role || inferRole(n.label || n.key, n.icon, n.shape);
  return (ROLE_COLORS[env.look] || ROLE_COLORS.light)[role] || ROLE_COLORS[env.look].neutral;
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
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"${filter ? ` filter="url(#rough)"` : ''}`;
  switch (shape) {
    case 'rectangle':
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="2" ${common}/>`;
    case 'ellipse':
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" ${common}/>`;
    case 'diamond':
      return `<path d="M${w / 2} 1 L${w - 1} ${h / 2} L${w / 2} ${h - 1} L1 ${h / 2} Z" ${common}/>`;
    case 'cylinder':
      return `<path d="M1 ${12} V${h - 10} C1 ${h - 2} ${w - 1} ${h - 2} ${w - 1} ${h - 10} V12" ${common}/><ellipse cx="${w / 2}" cy="12" rx="${w / 2 - 1}" ry="10" ${common}/>`;
    case 'document':
      return `<path d="M1 1 H${w - 1} V${h - 14} C${w * 0.72} ${h - 2} ${w * 0.3} ${h - 26} 1 ${h - 12} Z" ${common}/>`;
    case 'person': {
      const r = Math.min(w, h) * 0.2;
      return `<circle cx="${w / 2}" cy="${18}" r="${r}" ${common}/><path d="M${w / 2 - r * 1.5} ${h - 3} C${w / 2 - r * 1.5} ${h - r * 2.6} ${w / 2 + r * 1.5} ${h - r * 2.6} ${w / 2 + r * 1.5} ${h - 3}" ${common}/>`;
    }
    default:
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${Math.min(13, h / 2 - 2)}" ${common}/>`;
  }
}

export function nodeIconMarkup(n: { icon?: string | null }, x: number, y: number, size: number, color: string): string {
  const p = ICONS[n.icon || ''];
  if (!p) return '';
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</g>`;
}

export function diagramSVG(p: ParsedDiagram, layout: Layout, env: DiagramEnv, opts: { width?: number; height?: number } = {}): string {
  const th = env.th;
  const clean = env.clean;
  const filter = clean ? '' : 'url(#rough)';
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${opts.width || layout.width}" height="${opts.height || layout.height}" style="overflow:visible">`,
  );
  out.push(
    `<defs><filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`,
  );

  for (const g of layout.groups) {
    out.push(
      `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14" fill="${clean ? 'rgba(127,127,127,0.035)' : 'rgba(127,127,127,0.05)'}" stroke="${th.frame}" stroke-width="1.4" stroke-dasharray="6 5"/>`,
    );
    out.push(
      `<text x="${g.x + 14}" y="${g.y + 20}" font-family="Inter,system-ui,sans-serif" font-size="11.5" font-weight="600" letter-spacing=".04em" fill="${th.frameText}">${esc(g.label)}</text>`,
    );
  }

  for (const n of p.nodes.values()) {
    const b = layout.nodes[n.key];
    if (!b) continue;
    const paint = nodePaint(n, env);
    const shape = n.shape || 'rounded';
    out.push(`<g data-node="${esc(n.key)}" transform="translate(${b.x} ${b.y})">`);
    out.push(shapeMarkup(shape, b.w, b.h, paint.fill === 'transparent' ? 'none' : paint.fill, paint.stroke, filter));
    const lines = wrapText(n.label || n.key, b.w - (n.icon ? 54 : 24), 13);
    const lh = 15;
    const total = lines.length * lh;
    const startY = b.h / 2 - total / 2 + 12;
    const cx = n.icon ? b.w / 2 + 10 : b.w / 2;
    const icon = nodeIconMarkup(n, 16, b.h / 2 - 9, 18, paint.text);
    if (icon) out.push(icon);
    lines.forEach((ln, i) => {
      out.push(
        `<text x="${cx}" y="${startY + i * lh + (lines.length === 1 ? -2 : 0)}" text-anchor="middle" font-family="${clean ? 'Inter,system-ui,sans-serif' : "Kalam,'Comic Neue',cursive"}" font-size="13" fill="${paint.text}">${esc(ln)}</text>`,
      );
    });
    if (n.link) out.push(`<title>${esc(n.link)}</title>`);
    out.push(`</g>`);
  }

  const labelBits: string[] = [];
  for (const e of layout.edges) {
    const dash = e.kind === 'async' ? '7 5' : e.kind === 'optional' ? '2 5' : e.dash === 'dashed' ? '7 5' : e.dash === 'dotted' ? '2 5' : '';
    const thick = e.dash === 'thick' ? 2.6 : 1.6;
    out.push(
      `<path d="${e.d}" fill="none" stroke="${th.arrow}" stroke-width="${thick}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="${e.kind === 'line' ? '' : 'url(#arrowhead)'}"/>`,
    );
    if (e.kind === 'bidirectional')
      out.push(`<path d="${e.d}" fill="none" stroke="${th.arrow}" stroke-width="${thick}" marker-start="url(#arrowhead)"/>`);
    if (e.label) {
      const lines = wrapText(e.label, 170, 11);
      const tw = Math.max(...lines.map((l) => l.length)) * 5.6 + 14;
      const thh = 16 + (lines.length - 1) * 12;
      labelBits.push(
        `<rect x="${e.labelAt.x - tw / 2}" y="${e.labelAt.y - thh / 2}" width="${tw}" height="${thh}" rx="5" fill="${th.labelPill}" stroke="${th.slideEdge}" stroke-width=".8"/>`,
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
  return out.filter(Boolean).join('');
}

export type DiagramRender = { parsed: ParsedDiagram; layout: Layout; svg: string };

const cache = new Map<string, DiagramRender>();

/** Parse + layout + render a diagram, cached by source and visual style. */
export function diagramFor(dsl: string, env: DiagramEnv): DiagramRender {
  const key = `${dsl}|${env.look}|${env.palette ? 'r' : 'm'}`;
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
