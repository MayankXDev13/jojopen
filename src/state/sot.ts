/* Sands of Time: record document snapshots, replay them and encode GIF/MP4.
   This module deliberately depends only on the store and pure libs so that
   `actions.ts` can import it without a cycle. */

import { clamp, download } from "../lib/dom";
import {
  blankDoc,
  normalizeDoc,
  type BoardDoc,
  type BoardElement,
  type Recording,
} from "../lib/model";
import { arrowGeom, boundsOf, elementBounds } from "../lib/geometry";
import { elementSVG, svgToDataURL, type ExportEnv } from "../lib/exportSvg";
import { gifEncode, gifPalette, mapToPalette } from "../lib/gif";
import {
  S,
  colorFor,
  diagram,
  notify,
  persist,
  saveBoardCopy,
  settings,
  snapshot,
  theme,
  toast,
} from "./store";

const sotWait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseFrameDoc(json: string, fallbackId = S.doc?.id): BoardDoc {
  try {
    return normalizeDoc({ ...JSON.parse(json), id: fallbackId });
  } catch {
    const doc = blankDoc();
    if (fallbackId) doc.id = fallbackId;
    return doc;
  }
}

function docElements(doc: BoardDoc): BoardElement[] {
  return Object.values(doc.elements || {});
}

function docSortedElements(doc: BoardDoc): BoardElement[] {
  return docElements(doc).sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0) || (a.id < b.id ? -1 : 1),
  );
}

function docSlides(doc: BoardDoc): BoardElement[] {
  return docElements(doc)
    .filter((e) => e.type === "slide")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id < b.id ? -1 : 1));
}

export function sotRecList(): Recording[] {
  if (!Array.isArray(S.doc.recordings)) S.doc.recordings = [];
  return S.doc.recordings;
}

export function sotFmtMs(ms: number): string {
  const s = Math.max(0, ms || 0) / 1000;
  if (s < 1) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m${r ? " " + r + "s" : ""}`;
}

export const sotStepWord = (n: number) => `${n} step${n === 1 ? "" : "s"}`;

/* ---------- board switch cleanup ---------- */

export function sotResetForBoardSwitch() {
  if (S.rec) {
    clearTimeout(S.rec.timer);
    S.rec = null;
  }
  if (S.sot.replay) {
    if (S.sot.replay.timer) clearInterval(S.sot.replay.timer);
    S.sot.replay = null;
  }
  S.sot.listOpen = false;
}

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
  if (S.replay?.timer) clearInterval(S.replay.timer);
  if (S.replay) S.replay = null;
  if (S.rec?.timer) clearTimeout(S.rec.timer);
  S.sot.listOpen = false;
  S.rec = {
    startedAt: Date.now(),
    steps: 0,
    frames: [{ json: snapshot(), at: 0, label: "Start" }],
    pendingLabel: "",
    timer: null,
  };
  toast("Sands of Time: recording — click the hourglass again to stop");
}

/** Called after any settled edit: capture the new frame once writes stop. */
export function recWatch() {
  const r = S.rec;
  if (!r) return;
  /* Defer frame capture while an active drag or inline text edit is in flight
     so half-drawn shapes or partial keystrokes aren't recorded as steps. */
  if (S.drag || S.editingId) {
    clearTimeout(r.timer);
    r.timer = null;
    return;
  }
  const json = snapshot();
  const last = r.frames[r.frames.length - 1];
  if (last && last.json === json) return;
  clearTimeout(r.timer);
  r.timer = setTimeout(() => {
    if (S.rec === r && !S.drag && !S.editingId) recFlush();
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
  r.frames.push({
    json,
    at: Date.now() - r.startedAt,
    label: r.pendingLabel || "Edit",
  });
  r.steps++;
  r.pendingLabel = "";
  notify();
}

export function sotStop() {
  const r = S.rec;
  if (!r) return;
  recFlush();
  S.rec = null;
  if (r.frames.length <= 1) {
    notify();
    toast("Nothing was drawn while recording");
    return;
  }
  const list = sotRecList();
  const n =
    list.reduce(
      (m, x) =>
        Math.max(m, Number(/^Sands (\d+)$/.exec(x.name || "")?.[1] || 0)),
      0,
    ) + 1;
  const rec: Recording = {
    id:
      "sot-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 6),
    name: `Sands ${n}`,
    createdAt: Date.now(),
    steps: r.frames.slice(1).map((f: any) => ({ label: f.label, at: f.at })),
    frames: r.frames,
    duration: r.frames[r.frames.length - 1].at,
  };
  list.push(rec);
  S.sot.listOpen = true;
  persist(true);
  saveBoardCopy();
  notify();
  toast(
    `Saved ${rec.name} · ${sotStepWord(rec.steps.length)} · ${sotFmtMs(rec.duration)}`,
  );
}

/* ---------- replay ---------- */

function sotPauseReplay(rp: any) {
  if (!rp) return;
  if (rp.timer) {
    clearInterval(rp.timer);
    rp.timer = null;
  }
  rp.playing = false;
}

function sotStartReplayInterval(rp: any, last: number) {
  if (rp.timer) clearInterval(rp.timer);
  const tick = Math.max(140, Math.round(680 / rp.speed));
  const timer = setInterval(() => {
    if (S.sot.replay !== rp) {
      clearInterval(timer);
      return;
    }
    if (rp.index >= last) {
      sotPauseReplay(rp);
      notify();
      return;
    }
    rp.index++;
    notify();
  }, tick) as unknown as number;
  rp.timer = timer;
  rp.playing = true;
}

export function sotOpenReplay(id: string) {
  const rec = sotRecList().find((r) => r.id === id);
  if (!rec) return toast("Recording not found");
  if (S.sot.replay?.timer) clearInterval(S.sot.replay.timer);
  S.sot.listOpen = false;
  S.sot.replay = {
    id,
    index: 0,
    speed: 1,
    playing: false,
    timer: null,
    exportOpen: false,
    exporting: 0,
    union: sotFrameUnion(rec),
  };
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
  const maxIdx = Math.max(0, rec.frames.length - 1);
  if (rp.playing) sotPauseReplay(rp);
  rp.exportOpen = false;
  rp.index = clamp(i, 0, maxIdx);
  notify();
}

export function sotPlayToggle() {
  const rp = S.sot.replay;
  const rec = sotReplayRec();
  if (!rp || !rec) return;
  rp.exportOpen = false;
  if (rp.playing) {
    sotPauseReplay(rp);
    notify();
    return;
  }
  const last = rec.frames.length - 1;
  if (last <= 0) return;
  if (rp.index >= last) rp.index = 0;
  sotStartReplayInterval(rp, last);
  notify();
}

export function sotCycleSpeed() {
  const rp = S.sot.replay;
  const rec = sotReplayRec();
  if (!rp) return;
  rp.speed = rp.speed === 1 ? 2 : rp.speed === 2 ? 4 : 1;
  if (rp.playing && rec && rec.frames.length > 1) {
    sotStartReplayInterval(rp, rec.frames.length - 1);
  }
  notify();
}

export type SotScene = {
  doc: BoardDoc;
  w: number;
  h: number;
  union: { minX: number; minY: number; width: number; height: number };
};

/** Normalise a frame without touching the live document. */
export function sotSceneFrom(json: string, union?: any): SotScene {
  const u =
    union ||
    sotFrameUnion({ frames: [{ json, at: 0, label: "" }] } as Recording);
  const doc = parseFrameDoc(json);
  return { doc, w: Math.max(1, u.width) + 80, h: Math.max(1, u.height) + 80, union: u };
}

export function sotDelete(id: string) {
  const list = sotRecList();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  const name = list[i].name;
  list.splice(i, 1);
  if (S.sot.replay?.id === id) sotCloseReplay();
  persist(true);
  saveBoardCopy();
  notify();
  toast(`Deleted ${name}`);
}

/* ---------- export: shared frame rendering ---------- */

export function sotFrameUnion(rec: Recording) {
  let u: any = null;
  for (const f of rec.frames || []) {
    const doc = parseFrameDoc(f.json);
    const b = boundsOf(docElements(doc));
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
  if (!u)
    return { minX: 0, minY: 0, maxX: 960, maxY: 600, width: 960, height: 600 };
  return {
    ...u,
    width: Math.max(1, u.maxX - u.minX),
    height: Math.max(1, u.maxY - u.minY),
  };
}

function envForDoc(doc: BoardDoc): ExportEnv {
  const th = theme(doc);
  const all = docElements(doc);
  const st = settings(doc);
  return {
    th,
    clean: st?.style === "clean",
    style: st?.style || "sketch",
    colorFor: (el) => colorFor(el, doc),
    files: doc.files || {},
    slides: docSlides(doc),
    elements: all,
    diagramFor: (dsl) => diagram(dsl, doc),
    arrowGeom: (el) => {
      const sId = el.start?.elementId;
      const tId = el.end?.elementId;
      const obstacles = all
        .filter(
          (o) =>
            o.id !== el.id &&
            o.id !== sId &&
            o.id !== tId &&
            (o.type === "shape" || o.type === "sticky" || o.type === "image"),
        )
        .map(elementBounds);
      return arrowGeom(el, (id) => doc.elements[id], th, obstacles);
    },
  };
}

export function sotFrameSVG(
  json: string,
  b: any,
  pad: number,
  W: number,
  H: number,
) {
  const doc = parseFrameDoc(json);
  const x = b.minX - pad;
  const y = b.minY - pad;
  const w = Math.max(1, b.width + pad * 2);
  const h = Math.max(1, b.height + pad * 2);
  const th = theme(doc);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet">`,
    `<defs><filter id="rough" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.021" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter></defs>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${th.board}"/>`,
  ];
  const e2 = envForDoc(doc);
  for (const e of docSortedElements(doc)) parts.push(elementSVG(e, e2));
  parts.push("</svg>");
  return parts.join("");
}

export function sotSceneSVG(
  json: string,
  b: any,
  pad: number,
  W: number,
  H: number,
) {
  return sotFrameSVG(json, b, pad, W, H);
}

function sotLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Could not rasterise frame"));
    img.src = url;
  });
}

function sotSizes(rec: Recording, maxSide: number) {
  const b = sotFrameUnion(rec);
  const pad = 40;
  const aspect =
    Math.max(1, b.width + pad * 2) / Math.max(1, b.height + pad * 2);
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

function sotDelays(rec: Recording, stepMs = 800, endMs = 2500) {
  const out = rec.frames.map(() => stepMs);
  if (out.length) out[out.length - 1] = endMs;
  return out;
}

function sotExportProgress(rp: any, p: number) {
  if (S.sot.replay === rp) rp.exporting = p;
  notify();
}

export async function sotExport(kind: "gif" | "mp4") {
  const rp = S.sot.replay;
  const rec = sotReplayRec();
  if (!rp || !rec || !rec.frames.length) return;
  if (rp.exporting) return;
  rp.exportOpen = false;
  rp.exporting = 0.001;
  notify();
  const isCancelled = () => S.sot.replay !== rp;
  try {
    if (kind === "mp4") {
      if (!sotCanMp4())
        throw new Error("This browser can't encode MP4 at this size. Try GIF.");
      const blob = await sotEncodeMp4(rec, rp, isCancelled);
      if (!blob || isCancelled()) return;
      download(rec.name.replace(/\s+/g, "-").toLowerCase() + ".mp4", blob);
      toast("MP4 saved");
    } else {
      const blob = await sotEncodeGif(rec, rp, isCancelled);
      if (!blob || isCancelled()) return;
      download(rec.name.replace(/\s+/g, "-").toLowerCase() + ".gif", blob);
      toast("GIF saved");
    }
  } catch (e: any) {
    if (!isCancelled()) {
      console.warn(e);
      toast(e?.message || "Export failed — try GIF");
    }
  } finally {
    if (S.sot.replay === rp) rp.exporting = 0;
    notify();
  }
}

/* ---------- GIF ---------- */

export async function sotEncodeGif(
  rec: Recording,
  rp: any = S.sot.replay,
  isCancelled: () => boolean = () => false,
): Promise<Blob | null> {
  const { b, pad, w, h } = sotSizes(rec, 1280);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const images: Uint8ClampedArray[] = [];
  for (let i = 0; i < rec.frames.length; i++) {
    if (isCancelled()) return null;
    const frameDoc = parseFrameDoc(rec.frames[i].json);
    const svg = sotFrameSVG(rec.frames[i].json, b, pad, w, h);
    const img = await sotLoadImage(svgToDataURL(svg));
    if (isCancelled()) return null;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme(frameDoc).board;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    images.push(ctx.getImageData(0, 0, w, h).data);
    sotExportProgress(rp, (i + 1) / (rec.frames.length + 2));
  }
  if (isCancelled()) return null;
  const palette = gifPalette(images);
  const indexed = images.map((px) => mapToPalette(px, palette));
  sotExportProgress(rp, 0.94);
  const bytes = gifEncode(w, h, palette, indexed, sotDelays(rec));
  return new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
}

/* ---------- MP4 (MediaRecorder, H.264) ---------- */

export function sotCanMp4(): boolean {
  try {
    return (
      typeof MediaRecorder !== "undefined" &&
      (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1") ||
        MediaRecorder.isTypeSupported("video/mp4"))
    );
  } catch {
    return false;
  }
}

export async function sotEncodeMp4(
  rec: Recording,
  rp: any = S.sot.replay,
  isCancelled: () => boolean = () => false,
): Promise<Blob | null> {
  const { b, pad, w, h } = sotSizes(rec, 1080);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const probeStream = canvas.captureStream(0);
  const probeTrack: any = probeStream.getVideoTracks()[0];
  const hasRequestFrame = typeof probeTrack?.requestFrame === "function";
  let stream = probeStream;
  let track = probeTrack;
  if (!hasRequestFrame) {
    try {
      probeTrack?.stop();
    } catch {}
    stream = canvas.captureStream(30);
    track = stream.getVideoTracks()[0];
  }
  const mime = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
    ? "video/mp4;codecs=avc1"
    : "video/mp4";
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise((res, rej) => {
    recorder.onstop = res;
    recorder.onerror = rej;
  });
  try {
    recorder.start();
    const delays = sotDelays(rec, 800, 2500);
    const draw = async (i: number) => {
      const frameDoc = parseFrameDoc(rec.frames[i].json);
      const svg = sotFrameSVG(rec.frames[i].json, b, pad, w, h);
      const img = await sotLoadImage(svgToDataURL(svg));
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = theme(frameDoc).board;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    };
    for (let i = 0; i < rec.frames.length; i++) {
      if (isCancelled()) return null;
      await draw(i);
      if (hasRequestFrame) track.requestFrame();
      sotExportProgress(rp, (i + 1) / (rec.frames.length + 1));
      await sotWait(delays[i]);
    }
    if (isCancelled()) return null;
    await sotWait(300);
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    return new Blob(chunks, { type: "video/mp4" });
  } finally {
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {}
    try {
      track?.stop();
    } catch {}
  }
}
