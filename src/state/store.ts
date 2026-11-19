/* The app store. A mutable singleton `S` plus a subscription channel: every
   mutation marks the store dirty and React re-renders from the same object.
   Keeping the document mutable made the port from the single-file app direct
   and keeps pointer interactions allocation-free. */

import { uid, clamp } from "../lib/dom";
import { importLive, seedDemo } from "../lib/firstRun";
import {
  blankDoc,
  MAKE,
  normalizeDoc,
  type BoardDoc,
  type BoardElement,
} from "../lib/model";
import {
  COLOR_KEYS,
  COLOR_TO_ROLE,
  ROLE_COLORS,
  THEME,
  type Palette,
  type StyleKey,
  type Theme,
} from "../lib/palette";
import { inferRole } from "../lib/roles";
import {
  diagramFor,
  type DiagramEnv,
  type DiagramRender,
} from "../lib/diagram";
import { loadAIConfig } from "../lib/ai";
import { boundsOf, elementBounds, pointInElement } from "../lib/geometry";
import { useBoardStore } from "./boardStore";

export const KEY_DOC = "jojopen.doc.v1";
export const KEY_BOARDS = "jojopen.boards.v1";
export const KEY_BOARD = "jojopen.current.v1";
export const KEY_AI = "jojopen.ai.v1";

export type PanelName = "none" | "slides" | "code" | "assistant" | "boards";

/* ---------- Zustand-backed state + legacy facade ----------
   The Zustand store in `./boardStore` is the single source of truth.
   `S` remains as a compatibility facade so existing readers keep working
   while call sites migrate to hooks and explicit `setState` updates:
   - reads forward to the store snapshot,
   - top-level writes forward to `setState` (and notify),
   - nested mutations (e.g. `S.doc.name = …`, `S.selection.add(…)`) act on
     the live state object exactly as before; every legacy flow calls
     `notify()` afterwards, which wakes both legacy and Zustand subscribers. */

export const S: any = new Proxy({} as any, {
  get: (_t, prop) => (useBoardStore.getState() as any)[prop],
  set: (_t, prop, value) => {
    useBoardStore.setState({ [prop]: value } as any);
    return true;
  },
  has: (_t, prop) => prop in useBoardStore.getState(),
  ownKeys: () => Reflect.ownKeys(useBoardStore.getState()),
  getOwnPropertyDescriptor: (_t, prop) => {
    const v = (useBoardStore.getState() as any)[prop];
    return v === undefined
      ? undefined
      : { configurable: true, enumerable: true, value: v };
  },
});

/* ---------- subscription ---------- */

let version = 0;
const listeners = new Set<() => void>();
let frame = 0;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getVersion = () => version;

export function notify() {
  version++;
  /* Wake Zustand subscribers via the store version (shallow merge keeps refs). */
  useBoardStore.getState().bump();
  for (const fn of [...listeners]) fn();
}

/** Coalesce high-frequency canvas updates into one render per frame. */
export function scheduleNotify() {
  if (frame) return;
  if (typeof requestAnimationFrame === "undefined") {
    notify();
    return;
  }
  frame = requestAnimationFrame(() => {
    frame = 0;
    notify();
  });
}

/* ---------- derived views ---------- */

export const settings = () => S.doc.settings;
export const resolvedTheme = (): "light" | "dark" =>
  S.themePref === "dark" ||
  (S.themePref === "system" &&
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light";
export const styleKey = (): StyleKey =>
  settings().style === "chalkboard" ? "chalk" : resolvedTheme();
export const theme = (): Theme => THEME[styleKey()];
export const roleColor = (role: string) =>
  ((ROLE_COLORS[styleKey()] || ROLE_COLORS.light) as Palette)[role] ||
  ROLE_COLORS[styleKey()].neutral;
export const paletteOn = () => (settings().palette ?? "roles") !== "mono";
export const handFont = () =>
  settings().handFont === "excalifont"
    ? "'Excalifont','Kalam','Comic Neue',cursive"
    : "'Kalam','Comic Neue',cursive";

export function fontFor(el: BoardElement): string {
  if (el.type === "diagram") return "var(--sans)";
  if (el.type === "sticky") return handFont();
  if (el.type === "text")
    return settings().style === "clean" ? "var(--sans)" : handFont();
  return settings().style === "clean" ? "var(--sans)" : handFont();
}

export function diagramEnv(): DiagramEnv {
  return {
    th: theme(),
    look: styleKey(),
    clean: settings().style === "clean",
    palette: paletteOn(),
  };
}

export function diagram(dsl: string): DiagramRender {
  return diagramFor(dsl, diagramEnv());
}

export function roleOf(el: BoardElement): string {
  if (el.colorLocked && el.color) {
    if (el.color.startsWith("#")) return "custom";
    return COLOR_TO_ROLE[el.color] || "neutral";
  }
  if (el.role) return el.role;
  const label = (el.label || el.title || el.text || "").toLowerCase();
  return inferRole(label, el.icon, el.shape);
}

/** A painter for a raw hex colour chosen with the context-bar colour dot. */
export function hexPaint(hex: string) {
  return {
    fill: `color-mix(in srgb, ${hex} 14%, transparent)`,
    stroke: hex,
    text: theme().ink,
  };
}

export function hashIdToColor(id: string): string {
  let n = 2166136261;
  for (let a = 0; a < id.length; a++)
    n = Math.imul(n ^ id.charCodeAt(a), 16777619);
  return COLOR_KEYS[(n >>> 0) % COLOR_KEYS.length];
}

export function randomColorsMap(): Record<string, string> {
  const els = elements().filter(
    (k) =>
      k.type === "shape" ||
      k.type === "container" ||
      k.type === "arrow" ||
      k.type === "freehand",
  );
  const n: Record<string, string> = {};
  const a: string[] = [];
  for (const el of els) {
    let c = COLOR_KEYS.indexOf(hashIdToColor(el.id));
    if (c === -1) c = 0;
    for (let r = 0; r < COLOR_KEYS.length && a.includes(COLOR_KEYS[c]); r++)
      c = (c + 3) % COLOR_KEYS.length;
    const o = COLOR_KEYS[c];
    n[el.id] = o;
    a.push(o);
    if (a.length > 2) a.shift();
  }
  return n;
}

export function colorFor(el: BoardElement) {
  const palette = settings().palette ?? "roles";
  if (palette === "mono")
    return { fill: "transparent", stroke: theme().ink, text: theme().ink };
  if (el.colorLocked && el.color) {
    if (el.color.startsWith("#")) return hexPaint(el.color);
    if (el.color === "ink") return roleColor("ink");
    return roleColor(COLOR_TO_ROLE[el.color] || "neutral");
  }
  if (palette === "random") {
    if (el.type === "text")
      return { fill: "transparent", stroke: theme().ink, text: theme().ink };
    const randMap = randomColorsMap();
    const colorKey = randMap[el.id] || hashIdToColor(el.id);
    const role = COLOR_TO_ROLE[colorKey] || "neutral";
    const paint = roleColor(role);
    if (el.type === "arrow" || el.type === "freehand") {
      return { fill: "transparent", stroke: paint.stroke, text: theme().muted };
    }
    return paint;
  }
  if (el.type === "sticky") {
    const th = theme();
    return {
      fill: th.sticky,
      stroke: (th as any).stickyFold || "#c8ac3f",
      text: th.stickyInk,
    };
  }
  if (el.type === "arrow") {
    return { fill: "transparent", stroke: theme().arrow, text: theme().muted };
  }
  return roleColor(roleOf(el));
}

export const elements = (): BoardElement[] => Object.values(S.doc.elements);
export const sortedElements = (): BoardElement[] =>
  elements().sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0) || (a.id < b.id ? -1 : 1),
  );
export const nextIndex = () =>
  elements().reduce((m, e) => Math.max(m, e.index ?? 0), 0) + 1;
export const slides = () =>
  elements()
    .filter((e) => e.type === "slide")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id < b.id ? -1 : 1));
export const slideChildren = (slide: BoardElement) =>
  sortedElements().filter((e) => e.frameId === slide.id);
export const nextSlideOrder = () =>
  slides().reduce((m, s) => Math.max(m, s.order ?? 0), 0) + 1;
export const selectionElements = () =>
  [...S.selection]
    .map((id) => S.doc.elements[id])
    .filter(Boolean) as BoardElement[];

export function toast(msg: string, ms = 1900) {
  S.toast = msg;
  clearTimeout(S.toastTimer);
  S.toastTimer = window.setTimeout(() => {
    S.toast = null;
    notify();
  }, ms);
  notify();
}

/* ---------- history ---------- */

export function snapshot(): string {
  return JSON.stringify({
    name: S.doc.name,
    settings: S.doc.settings,
    elements: S.doc.elements,
    files: S.doc.files,
  });
}

export function restore(json: string) {
  const d = JSON.parse(json);
  S.doc.name = d.name;
  S.doc.settings = d.settings;
  S.doc.elements = d.elements;
  S.doc.files = d.files;
}

export function pushHistory(label = "edit") {
  const s = snapshot();
  if (S.history[S.history.length - 1]?.json === s) return;
  S.history.push({ json: s, label });
  if (S.history.length > 120) S.history.shift();
  S.timeline.push({ json: s, label, at: Date.now() });
  if (S.timeline.length > 200) S.timeline.shift();
  S.future = [];
  if (S.rec) recCapture(label);
  notify();
}

/** Remember the intent behind an edit; the recording flush captures the frame. */
export function recCapture(label?: string) {
  if (!S.rec) return;
  if (label && !S.rec.pendingLabel) S.rec.pendingLabel = label;
}

export function undo() {
  if (!S.history.length) return toast("Nothing to undo");
  S.future.push({ json: snapshot(), label: "redo" });
  const h = S.history.pop();
  restore(h.json);
  S.selection.clear();
  S.editingId = null;
  notify();
  persist();
  toast("Undo");
}

export function redo() {
  if (!S.future.length) return toast("Nothing to redo");
  S.history.push({ json: snapshot(), label: "undo" });
  const h = S.future.pop();
  restore(h.json);
  S.selection.clear();
  S.editingId = null;
  notify();
  persist();
}

/* ---------- persistence ---------- */

let saveTimer = 0;
let saveCopyTimer = 0;

export function persist(now = false) {
  clearTimeout(saveTimer);
  const run = () => {
    try {
      localStorage.setItem(KEY_DOC, JSON.stringify(S.doc));
      localStorage.setItem(KEY_BOARD, S.doc.id);
      const boards = boardsList();
      const ex = boards.find((b: any) => b.id === S.doc.id);
      const rec = {
        id: S.doc.id,
        name: S.doc.name,
        updatedAt: Date.now(),
        kind: slides().length ? "deck" : "board",
      };
      if (ex) Object.assign(ex, rec);
      else boards.unshift(rec);
      localStorage.setItem(KEY_BOARDS, JSON.stringify(boards.slice(0, 60)));
      S.lastSaved = Date.now();
    } catch (err) {
      console.warn("save failed", err);
    }
  };
  if (now) run();
  else saveTimer = setTimeout(run, 350) as any;
}

export function boardsList(): any[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_BOARDS) || "[]");
  } catch {
    return [];
  }
}

export function loadDoc(): BoardDoc {
  try {
    const hash = location.hash.match(/#\/b\/([A-Za-z0-9_-]+)/);
    if (hash) {
      const saved = localStorage.getItem("jojopen.board." + hash[1]);
      if (saved) return normalizeDoc(JSON.parse(saved));
    }
    const cur = localStorage.getItem(KEY_DOC);
    if (cur) return normalizeDoc(JSON.parse(cur));
  } catch (e) {
    console.warn(e);
  }
  return blankDoc();
}

/** True when the port already has its own board (hash link or saved doc).
   An existing-but-empty board counts: emptying the board is respected and the
   demo is never seeded over it. */
export function hasPortBoard(): boolean {
  try {
    const hash = location.hash.match(/#\/b\/([A-Za-z0-9_-]+)/);
    if (hash && localStorage.getItem("jojopen.board." + hash[1])) return true;
    return localStorage.getItem(KEY_DOC) != null;
  } catch {
    return false;
  }
}

export function saveBoardCopy() {
  try {
    localStorage.setItem("jojopen.board." + S.doc.id, JSON.stringify(S.doc));
  } catch {}
}

/** Load state and start the background snapshot loop. */
export function bootStore() {
  S.doc = loadDoc();
  if (!hasPortBoard()) {
    /* First run: prefer the live site's board when it exists, otherwise seed
       the URL-shortener demo. Persist immediately so a reload keeps the board
       and the demo is never seeded twice. The live key is only read. */
    S.doc = importLive() ?? seedDemo();
    persist(true);
  }
  S.startOpen = false;
  S.timeline.push({ json: snapshot(), label: "Start", at: Date.now() });
  try {
    const cfg = loadAIConfig();
    if (cfg.provider) {
      S.assistant.provider = cfg.provider;
      S.assistant.model = cfg.model || "claude-sonnet-4-20250514";
    }
  } catch {}
  clearInterval(saveCopyTimer);
  saveCopyTimer = window.setInterval(saveBoardCopy, 2500);
  notify();
}

/* ---------- camera ---------- */

export const canvasEl = (): HTMLElement | null =>
  document.getElementById("canvas");

export function toWorld(cx: number, cy: number) {
  const r = canvasEl()?.getBoundingClientRect();
  if (!r) return { x: cx, y: cy };
  return {
    x: (cx - r.left - S.camera.x) / S.camera.zoom,
    y: (cy - r.top - S.camera.y) / S.camera.zoom,
  };
}

export function toScreen(x: number, y: number) {
  return {
    x: x * S.camera.zoom + S.camera.x,
    y: y * S.camera.zoom + S.camera.y,
  };
}

export function viewportCenter() {
  const r = canvasEl()?.getBoundingClientRect();
  if (!r) return { x: 0, y: 0 };
  return toWorld(r.left + r.width / 2, r.top + r.height / 2);
}

export function zoomAt(cx: number, cy: number, factor: number) {
  const r = canvasEl()?.getBoundingClientRect();
  if (!r) return;
  const px = cx - r.left;
  const py = cy - r.top;
  const before = toWorld(cx, cy);
  S.camera.zoom = clamp(S.camera.zoom * factor, 0.08, 4);
  S.camera.x = px - before.x * S.camera.zoom;
  S.camera.y = py - before.y * S.camera.zoom;
  notify();
}

export function setZoom(z: number) {
  const r = canvasEl()?.getBoundingClientRect();
  if (!r) return;
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, z / S.camera.zoom);
}

export function fitAll() {
  const list = elements();
  if (!list.length) {
    S.camera = { x: 0, y: 0, zoom: 1 };
    notify();
    return;
  }
  const b = boundsOf(list)!;
  const r = canvasEl()?.getBoundingClientRect();
  if (!r) return;
  const pad = 120;
  const z = clamp(
    Math.min(
      (r.width - pad) / Math.max(1, b.width),
      (r.height - pad) / Math.max(1, b.height),
    ),
    0.08,
    2,
  );
  S.camera.zoom = z;
  S.camera.x = (r.width - b.width * z) / 2 - b.minX * z;
  S.camera.y = (r.height - b.height * z) / 2 - b.minY * z;
  notify();
}

export function fitSelection() {
  const list = selectionElements();
  if (!list.length) return fitAll();
  const b = boundsOf(list)!;
  const r = canvasEl()?.getBoundingClientRect();
  if (!r) return;
  const pad = 180;
  const z = clamp(
    Math.min(
      (r.width - pad) / Math.max(1, b.width),
      (r.height - pad) / Math.max(1, b.height),
    ),
    0.1,
    2.5,
  );
  S.camera.zoom = z;
  S.camera.x = (r.width - b.width * z) / 2 - b.minX * z;
  S.camera.y = (r.height - b.height * z) / 2 - b.minY * z;
  notify();
}

/* ---------- element helpers ---------- */

export function addElement(el: BoardElement, opts: { noClamp?: boolean } = {}) {
  /* Persistent random-color mode: new shapes/arrows without an explicit
     color auto-receive a palette color (pasted/duplicated elements keep
     their locked colors). */
  if (
    useBoardStore.getState().randomMode &&
    (el.type === "shape" ||
      el.type === "container" ||
      el.type === "arrow" ||
      el.type === "freehand") &&
    !el.colorLocked
  ) {
    el.color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    el.colorLocked = true;
  }
  const max = nextIndex();
  el.index = el.index ?? max;
  S.doc.elements[el.id] = el;
  if (el.frameId && !opts.noClamp) {
    const s = S.doc.elements[el.frameId];
    if (s) {
      el.x = clamp(el.x, s.x, s.x + s.width - 20);
      el.y = clamp(el.y, s.y, s.y + s.height - 20);
    }
  }
  return el;
}

export function removeElements(ids: string[]) {
  for (const id of ids) delete S.doc.elements[id];
  for (const e of elements()) {
    if (e.type === "arrow") {
      if (e.start?.elementId && ids.includes(e.start.elementId)) e.start = null;
      if (e.end?.elementId && ids.includes(e.end.elementId)) e.end = null;
      if (e.end?.elementId && !S.doc.elements[e.end.elementId]) e.end = null;
      if (e.start?.elementId && !S.doc.elements[e.start.elementId])
        e.start = null;
    }
  }
}

export function selectOnly(id: string | null) {
  S.selection = new Set(id ? [id] : []);
  notify();
}

export function nextFrameElement(
  point: { x: number; y: number },
  excludeId?: string,
): BoardElement | null {
  const hit = sortedElements()
    .reverse()
    .find(
      (e) =>
        e.id !== excludeId &&
        e.type !== "arrow" &&
        e.type !== "freehand" &&
        pointInElement(point.x, point.y, e),
    );
  return hit || null;
}

export { MAKE, uid, elementBounds };
