/* Shared canvas text measurement: single source for editor sizing + commit fit.
   Replaces the 0.56 estimate with real canvas metrics. */

export const TEXT_AUTOWRAP_THRESHOLD = 36;
export const TEXT_VIEWPORT_PADDING = 20;
export const TEXT_MAX_WRAP_WIDTH = 800;
export const TEXT_MAX_WRAP_WIDTH_ZOOMED_OUT = 2000;

let ctx: CanvasRenderingContext2D | null = null;
function measureCtx(): CanvasRenderingContext2D | null {
  try {
    if (!ctx) ctx = document.createElement("canvas").getContext("2d");
    return ctx;
  } catch {
    return null;
  }
}

export function fontString(fontSize: number, fontFamily: string): string {
  return `${fontSize}px ${fontFamily}`;
}

export function maxWrapForZoom(zoom: number): number {
  if (zoom >= 1) return TEXT_MAX_WRAP_WIDTH;
  return Math.min(
    TEXT_MAX_WRAP_WIDTH_ZOOMED_OUT,
    Math.round(TEXT_MAX_WRAP_WIDTH / Math.max(0.2, zoom)),
  );
}

/** Wrap originalText at maxW using real widths; preserves explicit newlines. */
export function wrapMeasured(
  text: string,
  maxW: number,
  font: string,
): string[] {
  const c = measureCtx();
  const paras = String(text ?? "").split("\n");
  if (!c) return paras.flatMap((p) => (p ? [p] : [""]));
  const out: string[] = [];
  for (const para of paras) {
    if (!para) {
      out.push("");
      continue;
    }
    const words = para.split(/(\s+)/);
    let cur = "";
    for (const w of words) {
      const trial = cur + w;
      if (!cur || c.measureText(trial).width <= maxW) cur = trial;
      else {
        if (cur.trim()) out.push(cur.trimEnd());
        // Break very long words.
        if (c.measureText(w).width > maxW && w.trim()) {
          let chunk = "";
          for (const ch of w) {
            if (c.measureText(chunk + ch).width <= maxW) chunk += ch;
            else {
              out.push(chunk);
              chunk = ch;
            }
          }
          cur = chunk;
        } else cur = w.trimStart();
      }
    }
    out.push(cur.trimEnd() || "");
  }
  return out.length ? out : [""];
}

export function measureLines(
  lines: string[],
  font: string,
  lineHeight: number,
): { width: number; height: number } {
  const c = measureCtx();
  if (!c) {
    const longest = Math.max(...lines.map((l) => l.length), 1);
    return { width: longest * 9, height: lines.length * 14 * lineHeight };
  }
  c.font = font;
  let w = 0;
  for (const l of lines) w = Math.max(w, c.measureText(l).width);
  const m = c.measureText("Mg");
  const lh =
    (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 14) * lineHeight;
  return { width: Math.ceil(w), height: Math.ceil(lh * lines.length) };
}

/** Fit box for board text: autoSize grows width, fixed wraps at width. */
export function fitTextBox(opts: {
  text: string;
  fontSize: number;
  fontFamily: string;
  lineHeight?: number;
  autoSize: boolean;
  fixedWidth?: number;
  zoom?: number;
  padX?: number;
  padY?: number;
}): { width: number; height: number; lines: string[] } {
  const lh = opts.lineHeight ?? 1.28;
  const font = fontString(opts.fontSize, opts.fontFamily);
  const maxWrap = opts.autoSize
    ? maxWrapForZoom(opts.zoom ?? 1)
    : Math.max(60, opts.fixedWidth ?? 200);
  const lines = wrapMeasured(opts.text || "", maxWrap, font);
  const m = measureLines(lines, font, lh);
  const width = opts.autoSize
    ? Math.max(60, Math.ceil(m.width + (opts.padX ?? 16)))
    : Math.max(60, Math.round(opts.fixedWidth ?? 200));
  // For fixed width re-wrap at exact width so commit matches editor.
  const finalLines = opts.autoSize
    ? lines
    : wrapMeasured(opts.text || "", width - (opts.padX ?? 16), font);
  const finalM = opts.autoSize ? m : measureLines(finalLines, font, lh);
  return {
    width,
    height: Math.max(28, Math.ceil(finalM.height + (opts.padY ?? 12))),
    lines: finalLines,
  };
}
