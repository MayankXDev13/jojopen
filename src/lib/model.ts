/* The board document: element factories, defaults and normalisation. */

import { uid } from "./dom";

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

export type Point = { x: number; y: number };
export type Anchor = {
  elementId: string;
  anchor?: string;
  normalizedAnchor?: { x: number; y: number };
  isExact?: boolean;
  isPrecise?: boolean;
  snap?: "center" | "edge" | "edge-point" | "none";
} | null;

export type BoardSettings = {
  style: "sketch" | "clean" | "chalkboard";
  colorMode: string;
  showLegend: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  palette: "roles" | "mono";
  handFont: "excalifont" | "kalam";
};

export interface BoardElement {
  id: string;
  type: string;
  version: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  angle: number;
  frameId: string | null;
  groupIds: string[];
  locked: boolean;
  role: string | null;
  color: string | null;
  colorLocked: boolean;
  meta: Record<string, any>;

  /* shape */
  shape?: string;
  label?: string;
  icon?: string | null;
  iconEdge?: boolean;
  noFill?: boolean;
  /* text */
  text?: string;
  originalText?: string;
  autoSize?: boolean;
  boundId?: string | null;
  fontSize?: number;
  align?: string;
  /* label text scale for shapes/stickies (A-/A+); box size untouched */
  textScale?: number;
  /* freehand */
  points?: Point[];
  pressures?: number[];
  isPen?: boolean;
  isClosed?: boolean;
  strokeWidth?: number;
  /* image */
  fileId?: string;
  /* container */
  /* slide */
  title?: string;
  layout?: string;
  order?: number;
  notes?: string;
  builds?: string[];
  /* diagram */
  family?: string;
  dsl?: string;
  layoutHints?: Record<string, unknown>;
  /* arrow */
  start?: Anchor;
  end?: Anchor;
  routeMode?: "orthogonal" | "curved" | "straight" | string;
  route?: string;
  startHead?: string;
  endHead?: string;
  dash?: string;
  kind?: string;
  labelT?: number;

  [key: string]: any;
}

export type RecordingFrame = { json: string; at: number; label: string };
export type Recording = {
  id: string;
  name: string;
  createdAt: number;
  steps: { label: string; at: number }[];
  frames: RecordingFrame[];
  duration: number;
};

export interface BoardDoc {
  schemaVersion: number;
  id: string;
  name: string;
  collectionId?: string;
  settings: BoardSettings;
  elements: Record<string, BoardElement>;
  files: Record<string, string>;
  recordings: Recording[];
}

export const DEFAULT_SETTINGS: BoardSettings = {
  style: "sketch",
  colorMode: "soft",
  showLegend: false,
  showGrid: true,
  snapToGrid: true,
  gridSize: 16,
  palette: "roles",
  handFont: "excalifont",
};

export function baseElement(
  e: Partial<BoardElement>,
  d: { width: number; height: number },
): BoardElement {
  return {
    id: e.id ?? uid(),
    index: e.index ?? 0,
    x: e.x ?? 0,
    y: e.y ?? 0,
    width: e.width ?? d.width,
    height: e.height ?? d.height,
    angle: e.angle ?? 0,
    version: 1,
    locked: e.locked ?? false,
    groupIds: e.groupIds ?? [],
    frameId: e.frameId ?? null,
    role: e.role ?? null,
    color: e.color ?? null,
    colorLocked: e.colorLocked ?? false,
    meta: e.meta ?? {},
    type: e.type ?? "shape",
  };
}

export const MAKE = {
  slide: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: SLIDE_W, height: SLIDE_H }),
    type: "slide",
    title: e.title ?? "Slide",
    layout: e.layout ?? "blank",
    order: e.order ?? 0,
    notes: e.notes ?? "",
    builds: e.builds ?? [],
  }),
  shape: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 160, height: 64 }),
    type: "shape",
    shape: e.shape ?? "rounded",
    label: e.label ?? "",
    icon: e.icon ?? null,
    iconEdge: !!e.iconEdge,
    noFill: !!e.noFill,
  }),
  text: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 240, height: 24 }),
    type: "text",
    text: e.text ?? "",
    originalText: e.originalText ?? e.text ?? "",
    autoSize: e.autoSize ?? true,
    boundId: e.boundId ?? null,
    fontSize: e.fontSize ?? 18,
    align: e.align ?? "left",
  }),
  sticky: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 200, height: 200 }),
    type: "sticky",
    text: e.text ?? "",
    originalText: e.originalText ?? e.text ?? "",
    align: e.align ?? "left",
  }),
  image: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 320, height: 240 }),
    type: "image",
    fileId: e.fileId,
  }),
  freehand: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 0, height: 0 }),
    type: "freehand",
    points: e.points ?? [],
    pressures: e.pressures ?? [],
    isPen: e.isPen ?? false,
    isClosed: e.isClosed ?? false,
    strokeWidth: e.strokeWidth ?? 2,
  }),
  container: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 400, height: 240 }),
    type: "container",
    label: e.label ?? "",
  }),
  diagram: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 640, height: 400 }),
    type: "diagram",
    title: e.title ?? "Diagram",
    family: e.family ?? "architecture",
    dsl: e.dsl ?? "",
    layoutHints: e.layoutHints ?? {},
  }),
  arrow: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 0, height: 0 }),
    type: "arrow",
    points: e.points ?? [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    start: e.start ?? null,
    end: e.end ?? null,
    routeMode: e.routeMode ?? "orthogonal",
    route: e.route ?? "auto",
    startHead: e.startHead ?? "none",
    endHead: e.endHead ?? "triangle",
    dash: e.dash ?? "solid",
    label: e.label ?? "",
    kind: e.kind ?? "sync",
    labelT: (e as any).labelT ?? (e as any).labelRatio ?? 0.5,
  }),
};

export function blankDoc(name = "Scratch board"): BoardDoc {
  return {
    schemaVersion: 1,
    id: uid(),
    name,
    collectionId: "col-jojo",
    settings: { ...DEFAULT_SETTINGS },
    elements: {},
    files: {},
    recordings: [],
  };
}

export function normalizeDoc(d: any): BoardDoc {
  const doc: BoardDoc = {
    schemaVersion: 1,
    id: d.id || uid(),
    name: d.name || "Untitled board",
    collectionId: d.collectionId || "col-jojo",
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
    elements: {},
    files: d.files || {},
    recordings: Array.isArray(d.recordings) ? d.recordings : [],
  };
  for (const [id, e] of Object.entries<any>(d.elements || {})) {
    const merged = {
      ...baseElement(
        { ...e, id },
        { width: e.width ?? 0, height: e.height ?? 0 },
      ),
      ...e,
      id,
    };
    // Backfill best-approach defaults for old boards.
    if (merged.type === "text") {
      if (merged.autoSize == null) merged.autoSize = true;
      if (merged.originalText == null) merged.originalText = merged.text ?? "";
      if (merged.boundId === undefined) merged.boundId = null;
      if (merged.align == null) merged.align = "left";
    }
    if (merged.type === "sticky" && merged.align == null) merged.align = "left";
    if (merged.type === "freehand") {
      if (Array.isArray(merged.points)) {
        merged.points = merged.points.filter(
          (p: any) => p && typeof p.x === "number" && typeof p.y === "number",
        );
      }
      if (!Array.isArray(merged.pressures))
        merged.pressures = (merged.points || []).map(() => 0.5);
      if (merged.isPen == null) merged.isPen = false;
      if (merged.isClosed == null) merged.isClosed = false;
    }
    if (merged.type === "arrow") {
      if (Array.isArray(merged.points)) {
        merged.points = merged.points.filter(
          (p: any) => p && typeof p.x === "number" && typeof p.y === "number",
        );
      }
      if (!merged.points || merged.points.length < 2) {
        merged.points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ];
      }
      if ((merged as any).route == null) (merged as any).route = "auto";
      for (const k of ["start", "end"] as const) {
        const a = (merged as any)[k];
        if (a && a.elementId && !a.normalizedAnchor) {
          a.normalizedAnchor = { x: 0.5, y: 0.5 };
          a.isExact = false;
          a.isPrecise = false;
          a.snap = "edge";
          if (!a.anchor) a.anchor = "auto";
        }
      }
    }
    doc.elements[id] = merged;
  }
  return doc;
}
