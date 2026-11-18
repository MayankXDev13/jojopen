/* Zustand board store. Replaces the mutable singleton `S` plus
   `subscribe`/`notify` from the legacy `./store`.
   - Persistent slice (survives reload via `persist`): doc, camera, themePref, randomMode.
     The board document JSON shape is unchanged; existing load/persist flows
     (`loadDoc`, `persist`, `saveBoardCopy`) keep managing `localStorage` board
     keys and call into this store instead of mutating `S`.
   - Transient slice (never persisted): selection, editingId, drag/marquee,
     overlays, history/future/timeline, assistant, clipboard, key flags.
   Selection stays a `Set` (never persisted: `partialize` excludes it);
   use `useSelectionIds()` where an array is needed. */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { blankDoc, type BoardDoc } from '../lib/model';
import type { PanelName } from './store';

export type Camera = { x: number; y: number; zoom: number };

export type BoardState = {
  /* persistent */
  doc: BoardDoc;
  camera: Camera;
  themePref: 'system' | 'light' | 'dark';
  randomMode: boolean;

  /* reactivity version (bumped by notify; components subscribe via useVersion) */
  version: number;

  /* transient: selection + editing */
  selection: Set<string>;
  editingId: string | null;
  tool: string;
  panel: string;

  /* transient: view flags */
  zen: boolean;
  toast: string | null;
  toastTimer: number;
  drag: any;
  marquee: any;
  space: boolean;
  panning: boolean;

  /* transient: overlays */
  palette: boolean;
  help: boolean;
  shortcuts: boolean;
  exportOpen: boolean;
  connectOpen: boolean;
  iconSearch: boolean;
  boardsOpen: boolean;
  renameOpen: boolean;
  mermaidOpen: boolean;
  layerPop: boolean;
  startOpen: boolean;
  present: any;
  replay: any;
  rec: any;
  sot: { listOpen: boolean; replay: any };

  /* transient: history */
  history: { json: string; label: string }[];
  future: { json: string; label: string }[];
  timeline: { json: string; label: string; at: number }[];

  lastSaved: number | null;
  paletteIndex: number;
  paletteQ: string;
  iconQuery: string;
  iconCursor: number;
  boardQuery: string;
  layoutPicker: boolean;
  colorPop: boolean;

  codeFor: string | null;
  codeDraft: string | null;
  mermaidText: string;
  mermaidError: string;

  exportOpts: any;
  connectProvider: string | null;
  connectModel: string | null;

  assistant: {
    messages: any[];
    busy: boolean;
    provider: string;
    model: string;
    abort: AbortController | null;
  };
  clipboard: any;
  _shift: boolean;
  _space: boolean;

  /* generic mutators (components/actions use these, never direct assignment) */
  set: (patch: Partial<BoardState>) => void;
  setSelection: (ids: string[] | Set<string>) => void;
  /** Bump the reactivity version (called by notify in ./store). */
  bump: () => void;
};

const initialTransient = {
  selection: new Set<string>(),
  editingId: null as string | null,
  tool: 'select',
  panel: 'none' as string,
  zen: false,
  toast: null as string | null,
  toastTimer: 0,
  drag: null as any,
  marquee: null as any,
  space: false,
  panning: false,
  palette: false,
  help: false,
  shortcuts: false,
  exportOpen: false,
  connectOpen: false,
  iconSearch: false,
  boardsOpen: false,
  renameOpen: false,
  mermaidOpen: false,
  layerPop: false,
  startOpen: false,
  present: null as any,
  replay: null as any,
  rec: null as any,
  sot: { listOpen: false, replay: null },
  history: [] as { json: string; label: string }[],
  future: [] as { json: string; label: string }[],
  timeline: [] as { json: string; label: string; at: number }[],
  lastSaved: null as number | null,
  paletteIndex: 0,
  paletteQ: '',
  iconQuery: '',
  iconCursor: 0,
  boardQuery: '',
  layoutPicker: false,
  colorPop: false,
  codeFor: null as string | null,
  codeDraft: null as string | null,
  mermaidText: '',
  mermaidError: '',
  exportOpts: null as any,
  connectProvider: null as string | null,
  connectModel: null as string | null,
  assistant: {
    messages: [] as any[],
    busy: false,
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    abort: null as AbortController | null,
  },
  clipboard: null as any,
  _shift: false,
  _space: false,
};

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      doc: blankDoc(),
      camera: { x: 80, y: 80, zoom: 1 },
      themePref: 'system' as const,
      randomMode: false,
      version: 0,
      ...initialTransient,
      set: (patch) => set(patch),
      setSelection: (ids) => set({ selection: ids instanceof Set ? ids : new Set(ids) }),
      bump: () => set((s) => ({ version: s.version + 1 })),
    }),
    {
      name: 'jojopen.prefs.v1',
      storage: createJSONStorage(() => localStorage),
      /* Only UI prefs persist here; the board document keeps its existing
         multi-key storage flow (KEY_DOC / board copies / boards list). */
      partialize: (s) => ({ camera: s.camera, themePref: s.themePref, randomMode: s.randomMode }) as BoardState,
    },
  ),
);

/* ---------- narrow selectors (subscribe to slices, not the whole store) ---------- */

export const useDoc = () => useBoardStore((s) => s.doc);
export const useCamera = () => useBoardStore((s) => s.camera);
export const useTool = () => useBoardStore((s) => s.tool);
export const useSelectionIds = () => useBoardStore((s) => [...s.selection]);
export const useEditingId = () => useBoardStore((s) => s.editingId);
export const useThemePref = () => useBoardStore((s) => s.themePref);
export const useRandomMode = () => useBoardStore((s) => s.randomMode);
export const usePanel = () => useBoardStore((s) => s.panel);

/* Render subscription with the same granularity as the legacy version
   counter. Narrow selectors above are available for future optimization;
   imperative handlers keep reading the live `S` facade to avoid
   stale-closure regressions during gestures. */
export const useVersion = () => useBoardStore((s) => s.version);

/** Selection as a Set for call sites migrated from the legacy `S.selection`. */
export const selectionSet = (): Set<string> => useBoardStore.getState().selection;

/** Non-hook read of the whole state for actions/commands. */
export const getBoardState = () => useBoardStore.getState();

export type { PanelName };
