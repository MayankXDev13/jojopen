/* Board and slide SVG generation used by every export path. */

import { esc } from "./dom";
import type { BoardElement } from "./model";
import type { ArrowGeom } from "./geometry";
import { arrowHead } from "./geometry";
import { iconInner, resolveIcon } from "./iconLibrary";
import {
  nodeIconMarkup,
  shapeMarkup,
  type DiagramRender,
  type Paint,
} from "./diagram";
import { SLIDE_H, SLIDE_W } from "./model";
import type { Theme } from "./palette";
import { wrapText } from "./layout";

export type ExportEnv = {
  th: Theme;
  clean: boolean;
  colorFor: (el: BoardElement) => Paint;
  files: Record<string, string>;
  slides: BoardElement[];
  diagramFor: (dsl: string) => DiagramRender;
  arrowGeom: (el: BoardElement) => ArrowGeom;
};

const roughDefs = `<defs><filter id="rough" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.021" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter></defs>`;

export function elementSVG(e: BoardElement, env: ExportEnv): string {
  const th = env.th;
  const clean = env.clean;
  const filter = clean ? "" : "url(#rough)";
  const c = env.colorFor(e);
  switch (e.type) {
    case "shape": {
      const edge = !!e.icon && !!e.iconEdge && !!resolveIcon(e.icon || "");
      const lines = wrapText(
        e.label || "",
        e.width - (e.icon && !edge ? 54 : 24),
        13,
      );
      const lh = 15;
      const total = lines.length * lh;
      const startY = e.height / 2 - total / 2 + 12;
      const cx = e.icon && !edge ? e.width / 2 + 10 : e.width / 2;
      const ink = e.noFill ? c.stroke : c.text;
      const fs = 13 * (e.textScale ?? 1);
      let defs = "";
      let shapeStr = shapeMarkup(
        e.shape,
        e.width,
        e.height,
        e.noFill ? "none" : c.fill,
        c.stroke,
        filter,
      );
      let edgeGlyph = "";
      if (edge) {
        const def = resolveIcon(e.icon!)!;
        const esize = clean ? 24 : 31;
        const gap = Math.round(esize * 0.3);
        const ex = Math.round(esize * 1.3);
        const ey = -esize / 2;
        defs = `<mask id="edge-${e.id}" maskUnits="userSpaceOnUse" x="-40" y="${-40 - esize}" width="${e.width + 80}" height="${e.height + 80 + esize}"><rect x="-40" y="${-40 - esize}" width="${e.width + 80}" height="${e.height + 80 + esize}" fill="#fff"/><rect x="${ex - gap}" y="${-esize}" width="${esize + gap * 2}" height="${esize * 2}" fill="#000"/></mask>`;
        shapeStr = `<g mask="url(#edge-${e.id})">${shapeStr}</g>`;
        const inner = def.brand
          ? iconInner(e.icon!, { brandFill: c.stroke })
          : iconInner(e.icon!);
        edgeGlyph = `<g transform="translate(${ex} ${ey}) scale(${esize / 24})" fill="none" stroke="${c.stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
      }
      let s = `<g transform="translate(${e.x} ${e.y})">`;
      if (defs) s += `<defs>${defs}</defs>`;
      s += shapeStr;
      if (e.icon && !edge)
        s += nodeIconMarkup({ icon: e.icon }, 16, e.height / 2 - 9, 18, ink);
      s += edgeGlyph;
      lines.forEach((ln, i) => {
        s += `<text x="${cx}" y="${startY + i * lh + (lines.length === 1 ? -2 : 0)}" text-anchor="middle" font-family="${clean ? "Inter,system-ui,sans-serif" : "Kalam,'Comic Neue',cursive"}" font-size="${fs}" fill="${ink}">${esc(ln)}</text>`;
      });
      return s + "</g>";
    }
    case "text": {
      const fs = e.fontSize || 18;
      const lines = wrapText(e.text || "", e.width, fs);
      const anchor = e.align === "center" ? "middle" : "start";
      const tx = e.align === "center" ? e.x + e.width / 2 : e.x;
      return lines
        .map(
          (ln, i) =>
            `<text x="${tx}" y="${e.y + fs * 0.98 + i * fs * 1.28}" text-anchor="${anchor}" font-family="${clean ? "Inter,system-ui,sans-serif" : "Kalam,'Comic Neue',cursive"}" font-size="${fs}" fill="${th.ink}">${esc(ln)}</text>`,
        )
        .join("");
    }
    case "sticky": {
      const w = e.width || 200;
      const h = e.height || 200;
      const fold = Math.min(26, Math.max(0, Math.min(w, h) / 2));
      const stripH = Math.min(24, h);
      const flapInset = Math.max(0, fold - 2);
      const sfs = 19 * (e.textScale ?? 1);
      const lines = wrapText(e.text || "", w - 32, sfs);
      const stickyFold = (th as any).stickyFold || "#c8ac3f";
      let s = `<g filter="drop-shadow(0 2px 2px rgba(0,0,0,0.35)) drop-shadow(0 10px 16px rgba(0,0,0,0.35))">`;
      s += `<path d="M${e.x} ${e.y} H${e.x + w} V${e.y + h - fold} L${e.x + w - fold} ${e.y + h} H${e.x} Z" fill="${th.sticky}"/>`;
      s += `<path d="M${e.x} ${e.y} H${e.x + w} V${e.y + stripH} H${e.x} Z" fill="rgba(0,0,0,0.05)"/>`;
      s += `<path d="M${e.x + w - fold} ${e.y + h} L${e.x + w} ${e.y + h - fold} L${e.x + w - flapInset} ${e.y + h - flapInset} Z" fill="${stickyFold}"/>`;
      const fontFam = clean
        ? "Inter,system-ui,sans-serif"
        : "'Excalifont','Kalam','Comic Neue',cursive";
      lines.forEach((ln, i) => {
        s += `<text x="${e.x + 16}" y="${e.y + 18 + sfs * 0.9 + i * sfs * 1.3}" font-family="${fontFam}" font-size="${sfs}" fill="${th.stickyInk}">${esc(ln)}</text>`;
      });
      return s + "</g>";
    }
    case "container":
      return `<g><rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="12" fill="none" stroke="${th.frame}" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${e.x + 14}" y="${e.y + 12}" font-family="Inter,system-ui,sans-serif" font-size="12" font-weight="500" fill="${th.frameText}">${esc(e.label)}</text></g>`;
    case "slide": {
      const n = env.slides.findIndex((s) => s.id === e.id) + 1;
      return `<g><rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="3" fill="${th.slide}" stroke="${th.slideEdge}"/><text x="${e.x}" y="${e.y - 9}" font-family="Inter,system-ui,sans-serif" font-size="12" fill="${th.muted}">${n} · ${esc(e.title)}</text></g>`;
    }
    case "diagram": {
      const r = env.diagramFor(e.dsl || "");
      return `<g transform="translate(${e.x} ${e.y})"><svg width="${e.width}" height="${e.height}" viewBox="0 0 ${r.layout.width} ${r.layout.height}" preserveAspectRatio="xMidYMid meet">${r.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg></g>`;
    }
    case "image": {
      const src = env.files[e.fileId || ""] || "";
      return `<image x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" href="${src}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    case "freehand": {
      const pts = (e.points || [])
        .map((p) => `${e.x + p.x},${e.y + p.y}`)
        .join(" ");
      return `<polyline points="${pts}" fill="none" stroke="${env.colorFor(e).stroke}" stroke-width="${e.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    case "arrow": {
      const g = env.arrowGeom(e);
      const paint = env.colorFor(e);
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
      let s = `<path d="${g.d}" fill="none" stroke="${paint.stroke}" stroke-width="${e.dash === "thick" ? 2.6 : 1.7}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
      if (e.kind !== "line") s += arrowHead(g, "end", paint.stroke);
      if (e.kind === "bidirectional") s += arrowHead(g, "start", paint.stroke);
      if (e.label) {
        const w = Math.max(28, e.label.length * 6.4 + 14);
        s += `<g><rect x="${g.labelPoint.x - w / 2}" y="${g.labelPoint.y - 10}" width="${w}" height="20" rx="5" fill="${th.labelPill}" stroke="${th.slideEdge}" stroke-width=".8"/><text x="${g.labelPoint.x}" y="${g.labelPoint.y + 4}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="11" fill="${th.muted}">${esc(e.label)}</text></g>`;
      }
      return s;
    }
    default:
      return "";
  }
}

export function exportSVG(
  list: BoardElement[],
  bounds: { minX: number; minY: number; width: number; height: number } | null,
  env: ExportEnv,
  opts: { bg?: boolean } = {},
) {
  const th = env.th;
  if (!bounds) return null;
  const pad = 40;
  const x = bounds.minX - pad;
  const y = bounds.minY - pad;
  const w = Math.max(1, bounds.width + pad * 2);
  const h = Math.max(1, bounds.height + pad * 2);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="${x} ${y} ${w} ${h}">`,
  );
  parts.push(roughDefs);
  if (opts.bg !== false)
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${th.board}"/>`,
    );
  for (const e of list) parts.push(elementSVG(e, env));
  parts.push("</svg>");
  return { svg: parts.join(""), width: Math.round(w), height: Math.round(h) };
}

export function renderSlideSVG(
  sl: BoardElement,
  children: BoardElement[],
  env: ExportEnv,
): string {
  const th = env.th;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_W}" height="${SLIDE_H}" viewBox="${sl.x} ${sl.y} ${SLIDE_W} ${SLIDE_H}">`,
  );
  parts.push(
    `${roughDefs.replace("</defs>", "")}<clipPath id="clip"><rect x="${sl.x}" y="${sl.y}" width="${SLIDE_W}" height="${SLIDE_H}"/></clipPath></defs>`,
  );
  parts.push(
    `<rect x="${sl.x}" y="${sl.y}" width="${SLIDE_W}" height="${SLIDE_H}" fill="${th.slide}"/>`,
  );
  parts.push(`<g clip-path="url(#clip)">`);
  for (const e of children) parts.push(elementSVG(e, env));
  parts.push("</g></svg>");
  return parts.join("");
}

export const svgToDataURL = (svg: string) =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export async function rasterize(
  svg: string,
  w: number,
  h: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const url = svgToDataURL(svg);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res as () => void;
    img.onerror = rej;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
