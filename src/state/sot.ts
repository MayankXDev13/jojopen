/* Sands of Time: record document snapshots, replay them and encode GIF/MP4.
   This module deliberately depends only on the store and pure libs so that
   `actions.ts` can import it without a cycle. */

import { clamp, download } from '../lib/dom';
import { normalizeDoc, type BoardDoc, type Recording } from '../lib/model';
import { boundsOf } from '../lib/geometry';
import { elementSVG, svgToDataURL, type ExportEnv } from '../lib/exportSvg';
import { gifEncode, gifPalette, mapToPalette } from '../lib/gif';
import { arrowGeom } from '../lib/geometry';
import {
  S,
  colorFor,
  diagram,
  elements,
  notify,
  persist,
  settings,
  slides,
  snapshot,
  sortedElements,
  theme,
  toast,
} from './store';

const sotWait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sotRecList(): Recording[] {
  if (!Array.isArray(S.doc.recordings)) S.doc.recordings = [];
  return S.doc.recordings;
}

export function sotFmtMs(ms: number): string {
  const s = Math.max(0, ms || 0) / 1000;
  if (s < 1) return '0s';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m${r ? ' ' + r + 's' : ''}`;
}

export const sotStepWord = (n: number) => `${n} step${n === 1 ? '' : 's'}`;

/* ---------- recording ---------- */

export function sotToggle() {
  if (S.rec) return sotStop();
  if (S.sot.replay) return sotCloseReplay();
  if (sotRecList().length) {
    S.sot.listOpen = !S.sot.listOpen;
    notify();
    return;
  }
  return sotStart();
}

export function sotStart() {
  if (S.sot.replay) sotCloseReplay();
  S.sot.listOpen = false;
  S.rec = {
    startedAt: Date.now(),
    steps: 0,
    frames: [{ json: snapshot(), at: 0, label: 'Start' }],
    pendingLabel: '',
    timer: null,
  };
  toast('Sands of Time: recording — click the hourglass again to stop');
}

/** Called after any settled edit: capture the new frame once writes stop. */
export function recWatch() {
  const r = S.rec;
  if (!r) return;
  const json = snapshot();
  const last = r.frames[r.frames.length - 1];
  if (last && last.json === json) return;
  clearTimeout(r.timer);
  r.timer = setTimeout(() => {
    if (S.rec === r) recFlush();
  }, 260) as unknown as number;
}

export function recFlush() {
  const r = S.rec;
  if (!r) return;
  clearTimeout(r.timer);
  r.timer = null;
  const json = snapshot();
  const last = r.frames[r.frames.length - 1];
  if (last && last.json === json) return;
  r.frames.push({ json, at: Date.now() - r.startedAt, label: r.pendingLabel || 'Edit' });
  r.steps++;
  r.pendingLabel = '';
  notify();
}

export function sotStop() {
  const r = S.rec;
  if (!r) return;
  recFlush();
  S.rec = null;
  if (r.frames.length <= 1) {
    notify();
    toast('Nothing was drawn while recording');
    return;
  }
  const list = sotRecList();
  const n = list.reduce((m, x) => Math.max(m, Number(/^Sands (\d+)$/.exec(x.name || '')?.[1] || 0)), 0) + 1;
  const rec: Recording = {
    id: 'sot-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    name: `Sands ${n}`,
    createdAt: Date.now(),
    steps: r.frames.slice(1).map((f: any) => ({ label: f.label, at: f.at })),
    frames: r.frames,
    duration: r.frames[r.frames.length - 1].at,
  };
  list.push(rec);
  S.sot.listOpen = true;
  persist(true);
  notify();
  toast(`Saved ${rec.name} · ${sotStepWord(rec.steps.length)} · ${sotFmtMs(rec.duration)}`);
}

/* ---------- replay ---------- */

export function sotOpenReplay(id: string) {
  const rec = sotRecList().find((r) => r.id === id);
  if (!rec) return toast('Recording not found');
  S.sot.listOpen = false;
  S.sot.replay = { id, index: 0, speed: 1, playing: false, timer: null, exportOpen: false, exporting: 0, union: null };
  S.selection.clear();
  notify();
}

export function sotCloseReplay() {
  const rp = S.sot.replay;
  if (rp?.timer) clearInterval(rp.timer);
  S.sot.replay = null;
  notify();
}

export function sotReplayRec(): Recording | null {
  const rp = S.sot.replay;
  return rp ? sotRecList().find((r) => r.id === rp.id) || null : null;
}

export function sotSetIndex(i: number) {
  const rp = S.sot.replay;
  const rec = sotReplayRec();
  if (!rp || !rec) return;
  rp.index = clamp(i, 0, rec.frames.length - 1);
  notify();
}

export function sotPlayToggle() {
  const rp = S.sot.replay;
  const rec = sotReplayRec();
  if (!rp || !rec) return;
  if (rp.playing) {
    clearInterval(rp.timer);
    rp.playing = false;
    rp.timer = null;
    notify();
    return;
  }
  const last = rec.frames.length - 1;
  if (rp.index >= last) rp.index = 0;
  rp.playing = true;
  const tick = Math.max(140, Math.round(680 / rp.speed));
  rp.timer = setInterval(() => {
    if (!S.sot.replay) return;
    if (S.sot.replay.index >= last) {
      clearInterval(rp.timer);
      rp.playing = false;
      rp.timer = null;
      notify();
      return;
    }
    S.sot.replay.index++;
    notify();
  }, tick) as unknown as number;
  notify();
}

export function sotCycleSpeed() {
  const rp = S.sot.replay;
  if (!rp) return;
  rp.speed = rp.speed === 1 ? 2 : rp.speed === 2 ? 4 : 1;
  if (rp.playing) {
    sotPlayToggle();
    sotPlayToggle();
  } else notify();
}

export type SotScene = { doc: BoardDoc; w: number; h: number; union: { minX: number; minY: number; width: number; height: number } };

/** Normalise a frame without touching the live document. */
export function sotSceneFrom(json: string, union?: any): SotScene {
  const u = union || sotFrameUnion({ frames: [{ json, at: 0, label: '' }] } as Recording);
  const doc = normalizeDoc({ ...JSON.parse(json), id: S.doc.id });
  return { doc, w: u.width + 80, h: u.height + 80, union: u };
}

export function sotDelete(id: string) {
  const list = sotRecList();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  const name = list[i].name;
  list.splice(i, 1);
  if (S.sot.replay?.id === id) sotCloseReplay();
  persist(true);
  notify();
  toast(`Deleted ${name}`);
}

/* ---------- export: shared frame rendering ---------- */

export function sotFrameUnion(rec: Recording) {
  const cur = S.doc;
  let u: any = null;
  try {
    for (const f of rec.frames) {
      S.doc = normalizeDoc({ ...JSON.parse(f.json), id: cur.id });
      const b = boundsOf(elements());
      if (!b) continue;
      u = u
        ? {
            minX: Math.min(u.minX, b.minX),
            minY: Math.min(u.minY, b.minY),
            maxX: Math.max(u.maxX, b.maxX),
            maxY: Math.max(u.maxY, b.maxY),
          }
        : { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
    }
  } finally {
    S.doc = cur;
  }
  if (!u) return { minX: 0, minY: 0, maxX: 960, maxY: 600, width: 960, height: 600 };
  return { ...u, width: u.maxX - u.minX, height: u.maxY - u.minY };
}

function env(): ExportEnv {
  return {
    th: theme(),
    clean: settings().style === 'clean',
    colorFor,
    files: S.doc.files,
    slides: slides(),
    diagramFor: diagram,
    arrowGeom: (el) => arrowGeom(el, (id) => S.doc.elements[id], theme()),
  };
}

export function sotFrameSVG(json: string, b: any, pad: number, W: number, H: number) {
  const cur = S.doc;
  try {
    S.doc = normalizeDoc({ ...JSON.parse(json), id: cur.id });
    const x = b.minX - pad;
    const y = b.minY - pad;
    const w = Math.max(1, b.width + pad * 2);
    const h = Math.max(1, b.height + pad * 2);
    const th = theme();
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet">`,
      `<defs><filter id="rough" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.021" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter></defs>`,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${th.board}"/>`,
    ];
    const e2 = env();
    for (const e of sortedElements()) parts.push(elementSVG(e, e2));
    parts.push('</svg>');
    return parts.join('');
  } finally {
    S.doc = cur;
  }
}

export function sotSceneSVG(json: string, b: any, pad: number, W: number, H: number) {
  return sotFrameSVG(json, b, pad, W, H);
}

function sotLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not rasterise frame'));
    img.src = url;
  });
}

function sotSizes(rec: Recording, maxSide: number) {
  const b = sotFrameUnion(rec);
  const pad = 40;
  const aspect = Math.max(1, b.width + pad * 2) / Math.max(1, b.height + pad * 2);
  let w = maxSide;
  let h = Math.round(maxSide / aspect);
  if (aspect < 1) {
    h = maxSide;
    w = Math.round(maxSide * aspect);
  }
  w = Math.max(2, Math.round(w / 2) * 2);
  h = Math.max(2, Math.round(h / 2) * 2);
  return { b, pad, w, h };
}

function sotDelays(rec: Recording, minMs = 220, maxMs = 1600) {
  const out: number[] = [];
  for (let i = 0; i < rec.frames.length; i++) {
    if (i === 0) {
      out.push(500);
      continue;
    }
    const d = (rec.frames[i].at || 0) - (rec.frames[i - 1].at || 0);
    out.push(clamp(d, minMs, maxMs));
  }
  if (out.length) out[out.length - 1] = Math.max(out[out.length - 1], 900);
  return out;
}

function sotExportProgress(p: number) {
  const rp = S.sot.replay;
  if (rp) rp.exporting = p;
  notify();
}

export async function sotExport(kind: 'gif' | 'mp4') {
  const rp = S.sot.replay;
  const rec = sotReplayRec();
  if (!rp || !rec) return;
  if (rp.exporting) return;
  rp.exportOpen = false;
  rp.exporting = 0.001;
  notify();
  try {
    if (kind === 'mp4') {
      if (!sotCanMp4()) throw new Error("This browser can't encode MP4 at this size. Try GIF.");
      const blob = await sotEncodeMp4(rec);
      download(rec.name.replace(/\s+/g, '-').toLowerCase() + '.mp4', blob);
      toast('MP4 saved');
    } else {
      const blob = await sotEncodeGif(rec);
      download(rec.name.replace(/\s+/g, '-').toLowerCase() + '.gif', blob);
      toast('GIF saved');
    }
  } catch (e: any) {
    console.warn(e);
    toast(e?.message || 'Export failed — try GIF');
  } finally {
    if (S.sot.replay) S.sot.replay.exporting = 0;
    notify();
  }
}

/* ---------- GIF ---------- */

export async function sotEncodeGif(rec: Recording): Promise<Blob> {
  const { b, pad, w, h } = sotSizes(rec, 720);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const images: Uint8ClampedArray[] = [];
  for (let i = 0; i < rec.frames.length; i++) {
    const svg = sotFrameSVG(rec.frames[i].json, b, pad, w, h);
    const img = await sotLoadImage(svgToDataURL(svg));
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme().board;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    images.push(ctx.getImageData(0, 0, w, h).data);
    sotExportProgress((i + 1) / (rec.frames.length + 2));
  }
  const palette = gifPalette(images);
  const indexed = images.map((px) => mapToPalette(px, palette));
  sotExportProgress(0.94);
  const bytes = gifEncode(w, h, palette, indexed, sotDelays(rec));
  return new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });
}

/* ---------- MP4 (MediaRecorder, H.264) ---------- */

export function sotCanMp4(): boolean {
  try {
    return (
      typeof MediaRecorder !== 'undefined' &&
      (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') || MediaRecorder.isTypeSupported('video/mp4'))
    );
  } catch {
    return false;
  }
}

export async function sotEncodeMp4(rec: Recording): Promise<Blob> {
  const { b, pad, w, h } = sotSizes(rec, 1080);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const stream = canvas.captureStream(0);
  const track: any = stream.getVideoTracks()[0];
  const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4;codecs=avc1' : 'video/mp4';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise((res, rej) => {
    recorder.onstop = res;
    recorder.onerror = rej;
  });
  recorder.start();
  const delays = sotDelays(rec, 350, 1600);
  const draw = async (i: number) => {
    const svg = sotFrameSVG(rec.frames[i].json, b, pad, w, h);
    const img = await sotLoadImage(svgToDataURL(svg));
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme().board;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  };
  for (let i = 0; i < rec.frames.length; i++) {
    await draw(i);
    if (track.requestFrame) track.requestFrame();
    sotExportProgress((i + 1) / (rec.frames.length + 1));
    await sotWait(delays[i]);
  }
  await sotWait(300);
  recorder.stop();
  await stopped;
  try {
    track.stop();
  } catch {}
  return new Blob(chunks, { type: 'video/mp4' });
}
