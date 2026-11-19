/* GIF encoding: median-cut palette, nearest-colour mapping and LZW. */

export type GifColor = { r: number; g: number; b: number };

export function gifEncode(
  width: number,
  height: number,
  palettes: GifColor[],
  frames: Uint8Array[],
  delays: number[],
): Uint8Array {
  const out: number[] = [];
  const push = (n: number) => out.push(n & 255);
  const push16 = (n: number) => {
    push(n);
    push(n >> 8);
  };
  const str = (s: string) => {
    for (let i = 0; i < s.length; i++) push(s.charCodeAt(i));
  };
  str("GIF89a");
  push16(width);
  push16(height);
  push(0xf7);
  push(0);
  push(0);
  for (let i = 0; i < 256; i++) {
    const c = palettes[i] || { r: 0, g: 0, b: 0 };
    push(c.r);
    push(c.g);
    push(c.b);
  }
  // loop forever
  push(0x21);
  push(0xff);
  push(0x0b);
  str("NETSCAPE2.0");
  push(0x03);
  push(0x01);
  push16(0);
  push(0);
  for (let f = 0; f < frames.length; f++) {
    const delay = Math.max(2, Math.round((delays[f] || 400) / 10));
    push(0x21);
    push(0xf9);
    push(0x04);
    push(0x04);
    push16(delay);
    push(0);
    push(0);
    push(0x2c);
    push16(0);
    push16(0);
    push16(width);
    push16(height);
    push(0);
    push(8);
    const data = lzw(frames[f]);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      push(n);
      for (let j = 0; j < n; j++) push(data[i + j]);
    }
    push(0);
  }
  push(0x3b);
  return new Uint8Array(out);
}

function lzw(indices: Uint8Array): number[] {
  const minCode = 8;
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let codeSize = minCode + 1;
  let next = eoi + 1;
  let dict = new Map<number, number>();
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  const emit = (code: number) => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      out.push(acc & 255);
      acc >>= 8;
      bits -= 8;
    }
  };
  emit(clear);
  if (!indices.length) {
    emit(eoi);
    if (bits) out.push(acc & 255);
    return out;
  }
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 4096 + k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      /* the decoder widens its code only after the code that fills the table,
         so widen here BEFORE handing out the next code. */
      if (next > (1 << codeSize) - 1 && codeSize < 12) codeSize++;
      dict.set(key, next++);
    } else {
      emit(clear);
      dict = new Map();
      codeSize = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) out.push(acc & 255);
  return out;
}

export function gifPalette(
  pixels: Uint8ClampedArray[],
  maxColors = 256,
): GifColor[] {
  const hist = new Map<number, GifColor & { n: number }>();
  for (const px of pixels) {
    for (let i = 0; i < px.length; i += 8) {
      const a = px[i + 3];
      if (a < 8) continue;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const e = hist.get(key);
      if (e) e.n++;
      else hist.set(key, { r, g, b, n: 1 });
    }
  }
  const colors = [...hist.values()];
  if (!colors.length) return [{ r: 0, g: 0, b: 0 }];
  if (colors.length <= maxColors)
    return colors.map((c) => ({ r: c.r, g: c.g, b: c.b }));

  let boxes: (GifColor & { n: number })[][] = [colors];
  const channelRange = (box: (GifColor & { n: number })[]) => {
    let rmin = 255;
    let rmax = 0;
    let gmin = 255;
    let gmax = 0;
    let bmin = 255;
    let bmax = 0;
    let n = 0;
    for (const c of box) {
      rmin = Math.min(rmin, c.r);
      rmax = Math.max(rmax, c.r);
      gmin = Math.min(gmin, c.g);
      gmax = Math.max(gmax, c.g);
      bmin = Math.min(bmin, c.b);
      bmax = Math.max(bmax, c.b);
      n += c.n;
    }
    const ranges = { r: rmax - rmin, g: gmax - gmin, b: bmax - bmin };
    const ch =
      ranges.r >= ranges.g && ranges.r >= ranges.b
        ? "r"
        : ranges.g >= ranges.b
          ? "g"
          : "b";
    return { ch, range: ranges[ch], n };
  };
  while (boxes.length < maxColors) {
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const r = channelRange(boxes[i]);
      const score = r.range * Math.log2(1 + r.n);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    const box = boxes[best];
    const { ch } = channelRange(box);
    box.sort((a, b) => a[ch] - b[ch]);
    const total = box.reduce((s, c) => s + c.n, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.length; i++) {
      acc += box[i].n;
      if (acc >= total / 2) {
        cut = Math.max(1, Math.min(box.length - 1, i + 1));
        break;
      }
    }
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
  }
  return boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (const c of box) {
      r += c.r * c.n;
      g += c.g * c.n;
      b += c.b * c.n;
      n += c.n;
    }
    return {
      r: Math.round(r / Math.max(1, n)),
      g: Math.round(g / Math.max(1, n)),
      b: Math.round(b / Math.max(1, n)),
    };
  });
}

export function mapToPalette(
  px: Uint8ClampedArray,
  palette: GifColor[],
): Uint8Array {
  const indices = new Uint8Array(px.length / 4);
  const cache = new Map<number, number>();
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let idx = cache.get(key);
    if (idx === undefined) {
      const rr = ((key >> 10) << 3) | 4;
      const gg = (((key >> 5) & 31) << 3) | 4;
      const bb = ((key & 31) << 3) | 4;
      let best = 0;
      let bestD = Infinity;
      for (let k = 0; k < palette.length; k++) {
        const c = palette[k];
        const d =
          (rr - c.r) * (rr - c.r) +
          (gg - c.g) * (gg - c.g) +
          (bb - c.b) * (bb - c.b);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      idx = best;
      cache.set(key, idx);
    }
    indices[j] = idx;
  }
  return indices;
}
