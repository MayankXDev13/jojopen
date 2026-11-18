/* The board document: element factories, defaults and normalisation. */

import { uid } from './dom';

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

export type Point = { x: number; y: number };
export type Anchor = { elementId: string; anchor?: string } | null;

export type BoardSettings = {
  style: 'sketch' | 'clean' | 'chalkboard';
  colorMode: string;
  showLegend: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  palette: 'roles' | 'mono';
  handFont: 'excalifont' | 'kalam';
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
  fontSize?: number;
  align?: string;
  /* freehand */
  points?: Point[];
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
  routeMode?: 'orthogonal' | 'curved' | 'straight' | string;
  route?: string;
  startHead?: string;
  endHead?: string;
  dash?: string;
  kind?: string;

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
  settings: BoardSettings;
  elements: Record<string, BoardElement>;
  files: Record<string, string>;
  recordings: Recording[];
}

export const DEFAULT_SETTINGS: BoardSettings = {
  style: 'sketch',
  colorMode: 'soft',
  showLegend: false,
  showGrid: true,
  snapToGrid: true,
  gridSize: 16,
  palette: 'roles',
  handFont: 'excalifont',
};

export function baseElement(e: Partial<BoardElement>, d: { width: number; height: number }): BoardElement {
  return {
    id: e.id ?? uid(), index: e.index ?? 0, x: e.x ?? 0, y: e.y ?? 0,
    width: e.width ?? d.width, height: e.height ?? d.height, angle: e.angle ?? 0,
    version: 1, locked: e.locked ?? false, groupIds: e.groupIds ?? [], frameId: e.frameId ?? null,
    role: e.role ?? null, color: e.color ?? null, colorLocked: e.colorLocked ?? false, meta: e.meta ?? {},
    type: e.type ?? 'shape',
  };
}

export const MAKE = {
  slide: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: SLIDE_W, height: SLIDE_H }), type: 'slide',
    title: e.title ?? 'Slide', layout: e.layout ?? 'blank', order: e.order ?? 0,
    notes: e.notes ?? '', builds: e.builds ?? [],
  }),
  shape: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 160, height: 64 }), type: 'shape',
    shape: e.shape ?? 'rounded', label: e.label ?? '', icon: e.icon ?? null,
    iconEdge: !!e.iconEdge, noFill: !!e.noFill,
  }),
  text: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 240, height: 24 }), type: 'text',
    text: e.text ?? '', fontSize: e.fontSize ?? 18, align: e.align ?? 'left',
  }),
  sticky: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 200, height: 200 }), type: 'sticky', text: e.text ?? '',
  }),
  image: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 320, height: 240 }), type: 'image', fileId: e.fileId,
  }),
  freehand: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 0, height: 0 }), type: 'freehand',
    points: e.points ?? [], strokeWidth: e.strokeWidth ?? 2,
  }),
  container: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 400, height: 240 }), type: 'container', label: e.label ?? '',
  }),
  diagram: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 640, height: 400 }), type: 'diagram',
    title: e.title ?? 'Diagram', family: e.family ?? 'architecture', dsl: e.dsl ?? '',
    layoutHints: e.layoutHints ?? {},
  }),
  arrow: (e: Partial<BoardElement> = {}): BoardElement => ({
    ...baseElement(e, { width: 0, height: 0 }), type: 'arrow',
    points: e.points ?? [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    start: e.start ?? null, end: e.end ?? null,
    routeMode: e.routeMode ?? 'orthogonal', route: e.route ?? 'auto',
    startHead: e.startHead ?? 'none', endHead: e.endHead ?? 'triangle',
    dash: e.dash ?? 'solid', label: e.label ?? '', kind: e.kind ?? 'sync',
  }),
};

export function blankDoc(name = 'Scratch board'): BoardDoc {
  return {
    schemaVersion: 1,
    id: uid(),
    name,
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
    name: d.name || 'Untitled board',
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
    elements: {},
    files: d.files || {},
    recordings: Array.isArray(d.recordings) ? d.recordings : [],
  };
  for (const [id, e] of Object.entries<any>(d.elements || {})) {
    doc.elements[id] = { ...baseElement({ ...e, id }, { width: e.width ?? 0, height: e.height ?? 0 }), ...e, id };
  }
  return doc;
}
