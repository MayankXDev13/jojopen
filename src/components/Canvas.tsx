import { useEffect, useRef } from 'react';
import { MAKE } from '../lib/model';
import {
  arrowGeom,
  boundsOf,
  cleanupArrowPoints,
  distToElement,
  elementBounds,
  nextFrameElement,
  normalizedAnchorOf,
  pointInElement,
  suggestedBinding,
} from '../lib/geometry';
import { TEXT_AUTOWRAP_THRESHOLD } from '../lib/textMeasure';
import { pressureFromEvent, simulatePressure, simplify, snapAngle15, streamline } from '../lib/ink';
import {
  S,
  addElement,
  elements,
  notify,
  persist,
  pushHistory,
  removeElements,
  scheduleNotify,
  selectionElements,
  settings,
  sortedElements,
  theme,
  toWorld,
  zoomAt,
} from '../state/store';
import { beginEdit, placeImage, present, setPanel, setTool } from '../state/actions';
import { Edges } from './Edges';
import { NodeView } from './NodeView';
import { TextEditor } from './TextEditor';
import { useVersion } from '../state/boardStore';

const SHAPE_TOOLS = ['rectangle', 'ellipse', 'diamond', 'cylinder', 'frame'];
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
/* Element types whose label can be edited in place (see commitEdit). */
const TEXT_EDITABLE = ['text', 'shape', 'sticky', 'container'];

function capture(el: Element | null, id: number) {
  try {
    (el as HTMLElement | null)?.setPointerCapture?.(id);
  } catch {}
}

export function Canvas() {
  useVersion();
  const ref = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLCanvasElement>(null);
  const laserPoints = useRef<{ x: number; y: number; t: number; life: number }[]>([]);
  const laserRAF = useRef<number | null>(null);
  const laserTimer = useRef<number | undefined>(undefined);
  /* Hover position while the laser tool is active (button not held):
     renders the red dot cursor so no OS arrow is ever needed. */
  const laserHover = useRef<{ x: number; y: number } | null>(null);

  /* ---------- laser ---------- */
  const laserDraw = () => {
    const c = laserRef.current;
    if (!c) {
      laserRAF.current = null;
      return;
    }
    const ctx = c.getContext('2d')!;
    const dpr = devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    const pts = laserPoints.current;
    /* While held, refresh timestamps so the trail persists for the hold. */
    const held = (S.drag as any)?.mode === 'laser';
    for (let i = pts.length - 1; i >= 0; i--) {
      if (held) pts[i].t = now;
      else if (now - pts[i].t > pts[i].life) pts.splice(i, 1);
    }
    /* Red line trail: one segment per step so older parts fade out. */
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const k = Math.max(0, 1 - (now - b.t) / b.life);
      if (k <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(240,70,70,${0.9 * k})`;
      ctx.lineWidth = 1.5 + 3.5 * k;
      ctx.stroke();
    }
    const head = pts[pts.length - 1];
    if (head) {
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,70,70,.9)';
      ctx.fill();
    } else if (!held && laserHover.current) {
      /* Laser tool active, nothing held: red dot cursor in place of the
         hidden OS arrow. */
      const p = laserHover.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,70,70,.9)';
      ctx.fill();
    }
    laserRAF.current = pts.length ? requestAnimationFrame(laserDraw) : null;
  };

  const laserEnsure = () => {
    const c = laserRef.current;
    if (!c) return false;
    const dpr = devicePixelRatio;
    if (c.width !== innerWidth * dpr) {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      c.style.width = `${innerWidth}px`;
      c.style.height = `${innerHeight}px`;
    }
    return true;
  };

  const laserClear = () => {
    laserPoints.current = [];
    const c = laserRef.current;
    if (c) {
      const dpr = devicePixelRatio;
      c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.getContext('2d')!.clearRect(0, 0, innerWidth, innerHeight);
    }
    if (laserRAF.current) {
      cancelAnimationFrame(laserRAF.current);
      laserRAF.current = null;
    }
    clearTimeout(laserTimer.current);
  };

  const laserAdd = (x: number, y: number) => {
    if (!laserEnsure()) return;
    const c = laserRef.current!;
    laserPoints.current.push({ x, y, t: performance.now(), life: 650 });
    /* Generous cap: big laser drawings must persist whole while held
       (release clears everything anyway). */
    if (laserPoints.current.length > 2000) laserPoints.current.shift();
    if (!laserRAF.current) laserRAF.current = requestAnimationFrame(laserDraw);
    clearTimeout(laserTimer.current);
    laserTimer.current = window.setTimeout(() => {
      if (!laserPoints.current.length) {
        c.getContext('2d')!.clearRect(0, 0, innerWidth, innerHeight);
        laserRAF.current = null;
      }
    }, 900);
  };

  useEffect(
    () => () => {
      if (laserRAF.current) cancelAnimationFrame(laserRAF.current);
      clearTimeout(laserTimer.current);
    },
    [],
  );

  /* ---------- creation helpers ---------- */
  const createTextAt = (w: { x: number; y: number }, opts: { width?: number; autoSize?: boolean } = {}) => {
    pushHistory('add text');
    const autoSize = opts.autoSize ?? true;
    const width = opts.width ?? 260;
    const el = MAKE.text({
      x: Math.round(w.x),
      y: Math.round(w.y - 14),
      width: Math.max(60, Math.round(width)),
      height: 32,
      text: '',
      originalText: '',
      autoSize,
      fontSize: 22,
      align: 'left',
    });
    addElement(el);
    S.selection = new Set([el.id]);
    notify();
    beginEdit(el.id);
    setTool('select');
  };

  const createStickyAt = (w: { x: number; y: number }) => {
    pushHistory('add sticky');
    const el = MAKE.sticky({ x: Math.round(w.x - 100), y: Math.round(w.y - 100), width: 200, height: 200, text: '' });
    addElement(el);
    S.selection = new Set([el.id]);
    notify();
    beginEdit(el.id);
    setTool('select');
  };

  const startArrow = (e: React.PointerEvent, w: { x: number; y: number }, startEl: any = null) => {
    pushHistory('add arrow');
    const el = MAKE.arrow({
      x: 0,
      y: 0,
      points: [
        { x: w.x, y: w.y },
        { x: w.x, y: w.y },
      ],
      kind: S.tool === 'line' ? 'line' : 'sync',
      routeMode: S.tool === 'line' ? 'straight' : 'orthogonal',
      startHead: 'none',
      endHead: S.tool === 'line' ? 'none' : 'triangle',
    });
    if (startEl) {
      el.start = {
        elementId: startEl.id,
        anchor: 'auto',
        normalizedAnchor: normalizedAnchorOf(startEl, w),
        isExact: false,
        isPrecise: false,
        snap: 'edge',
      };
    }
    addElement(el);
    // Original selects nothing while connecting; selection lands on release.
    S.drag = { mode: 'arrow', id: el.id, startEl: startEl?.id || null };
    (S as any).suggestedBinding = null;
    capture(ref.current, e.pointerId);
    notify();
  };

  const startPen = (e: React.PointerEvent, w: { x: number; y: number }) => {
    pushHistory('draw');
    const { pressure, isPen } = pressureFromEvent(e as any, 0.5);
    const el = MAKE.freehand({
      x: w.x,
      y: w.y,
      points: [{ x: 0, y: 0 }],
      pressures: [pressure],
      isPen,
      strokeWidth: 2,
    });
    addElement(el);
    // Original selects nothing while drawing: no box, no handles follow the tip.
    S.drag = { mode: 'pen', id: el.id, lastT: performance.now(), lastW: w, straightFrom: null };
    capture(ref.current, e.pointerId);
    notify();
  };

  const startPan = (e: React.PointerEvent) => {
    S.drag = { mode: 'pan', start: { x: e.clientX, y: e.clientY }, cam: { ...S.camera } };
    S.panning = true;
    capture(ref.current, e.pointerId);
    notify();
  };

  const startMove = (e: React.PointerEvent, editId: string | null = null) => {
    const list = selectionElements().filter((x) => !x.locked);
    if (!list.length) return;
    const positions = new Map<string, { x: number; y: number }>();
    for (const el of list) {
      positions.set(el.id, { x: el.x, y: el.y });
      if (el.type === 'slide')
        for (const c of sortedElements().filter((x) => x.frameId === el.id)) if (!positions.has(c.id)) positions.set(c.id, { x: c.x, y: c.y });
    }
    pushHistory('move');
    S.drag = { mode: 'move', start: { x: e.clientX, y: e.clientY }, positions, moved: false, editId };
    capture(ref.current, e.pointerId);
  };

  const startMarquee = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    if (!e.shiftKey) S.selection.clear();
    S.marquee = {
      x0: e.clientX - r.left,
      y0: e.clientY - r.top,
      x1: e.clientX - r.left,
      y1: e.clientY - r.top,
      additive: e.shiftKey,
    };
    capture(ref.current, e.pointerId);
    notify();
  };

  const startCreate = (e: React.PointerEvent, w: { x: number; y: number }) => {
    pushHistory('add ' + S.tool);
    const kind = S.tool;
    const shape = kind === 'frame' ? null : kind;
    const el = shape
      ? MAKE.shape({ x: w.x, y: w.y, width: 1, height: 1, shape, label: '' })
      : MAKE.container({ x: w.x, y: w.y, width: 1, height: 1, label: 'Group' });
    addElement(el);
    S.selection = new Set([el.id]);
    S.drag = { mode: 'create', id: el.id, start: w, toolKind: kind };
    capture(ref.current, e.pointerId);
  };

  const eraseAt = (cx: number, cy: number) => {
    const w = toWorld(cx, cy);
    // Original tolerances: 6/zoom base, +strokeWidth on ink/arrows.
    const base = 6 / S.camera.zoom;
    const hit = sortedElements()
      .reverse()
      .find((x) => {
        if (x.locked) return false;
        const tol = x.type === 'freehand' || x.type === 'arrow' ? base + (x.strokeWidth || 2) : base;
        return distToElement(w, x) <= tol;
      });
    if (hit) {
      pushHistory('erase');
      const ids = [hit.id];
      if (hit.type === 'slide') {
        for (const c of sortedElements().filter((y) => y.frameId === hit.id)) ids.push(c.id);
      }
      // Detach bound text link (legacy boards may still carry one).
      if (hit.type === 'text' && (hit as any).boundId && S.doc.elements[(hit as any).boundId]) {
        const c = S.doc.elements[(hit as any).boundId];
        if (c.meta) delete c.meta.boundTextId;
      }
      removeElements(ids);
      S.selection.delete(hit.id);
      scheduleNotify();
    }
  };

  const startErase = (e: React.PointerEvent) => {
    pushHistory('erase');
    S.drag = { mode: 'erase' };
    eraseAt(e.clientX, e.clientY);
    capture(ref.current, e.pointerId);
  };

  const onNodeDown = (e: React.PointerEvent, nodeEl: HTMLElement) => {
    const el = S.doc.elements[nodeEl.dataset.id!];
    if (!el) return;
    e.stopPropagation();
    if (S.tool === 'eraser') return startErase(e);
    if (S.tool === 'pen') return startPen(e, toWorld(e.clientX, e.clientY));
    if (S.tool === 'arrow' || S.tool === 'line') {
      const w = toWorld(e.clientX, e.clientY);
      return startArrow(e, w, el);
    }
    if (S.tool !== 'select') setTool('select');
    const groupIds = el.groupIds || [];
    let ids = [el.id];
    if (groupIds.length) ids = elements().filter((x) => x.groupIds?.some((g) => groupIds.includes(g))).map((x) => x.id);
    const wasSelected = S.selection.has(el.id);
    if (e.shiftKey) {
      if (S.selection.has(el.id)) ids.forEach((i) => S.selection.delete(i));
      else ids.forEach((i) => S.selection.add(i));
    } else if (!S.selection.has(el.id)) {
      S.selection = new Set(ids);
    }
    notify();
    /* Click (no drag) on an already-selected text-capable element enters
       in-place edit; dragging still moves. Double-click also edits. */
    const editId = !e.shiftKey && wasSelected && ids.length === 1 && !el.locked && TEXT_EDITABLE.includes(el.type) ? el.id : null;
    if (!el.locked) startMove(e, editId);
  };

  const onEdgeDown = (e: React.PointerEvent, edgeEl: Element) => {
    const id = (edgeEl as HTMLElement).dataset.id!;
    const el = S.doc.elements[id];
    if (!el) return;
    e.stopPropagation();
    if (S.tool === 'eraser' || (e.ctrlKey || e.metaKey)) return startErase(e);
    if (S.tool === 'pen') return startPen(e, toWorld(e.clientX, e.clientY));
    if (S.tool !== 'select') setTool('select');
    const w = toWorld(e.clientX, e.clientY);
    // Arrow label drag: pointerdown on label pill moves label offset.
    const labelG = (e.target as HTMLElement).closest?.('g[data-label]');
    if (el.type === 'arrow' && labelG && !el.locked) {
      pushHistory('move label');
      S.selection = new Set([el.id]);
      S.drag = { mode: 'label', id: el.id, start: { x: e.clientX, y: e.clientY }, orig: (el as any).labelPoint || { dx: 0, dy: 0 } };
      capture(ref.current, e.pointerId);
      notify();
      return;
    }
    // Arrow handles (original board): endpoint / waypoint / insert (+) / segment.
    if (el.type === 'arrow' && S.selection.has(el.id) && !el.locked) {
      const t = e.target as HTMLElement;
      const h = (t.closest?.('[data-handle]') as HTMLElement | null)?.dataset.handle;
      if (h) {
        const [kind, a, b] = h.split(':');
        if (kind === 'endpoint') {
          pushHistory('edit arrow');
          S.drag = { mode: 'arrow-edit', id: el.id, pointIdx: Number(a) };
          (S as any).suggestedBinding = null;
          capture(ref.current, e.pointerId);
          notify();
          return;
        }
        if (kind === 'waypoint') {
          pushHistory('bend arrow');
          S.drag = { mode: 'arrow-edit', id: el.id, pointIdx: Number(a), manual: true };
          capture(ref.current, e.pointerId);
          notify();
          return;
        }
        if (kind === 'insert') {
          pushHistory('bend arrow');
          const idx = Number(a);
          const wpt = { x: w.x - el.x, y: w.y - el.y };
          // Insert into manual base (original inserts into [first,last] on auto).
          if (el.route !== 'manual') {
            const geom = arrowGeom(el, (id) => S.doc.elements[id], theme());
            const dp = geom.pts;
            const f = dp[0];
            const l = dp[dp.length - 1];
            el.points = [
              { x: f.x - el.x, y: f.y - el.y },
              wpt,
              { x: l.x - el.x, y: l.y - el.y },
            ];
            S.drag = { mode: 'arrow-edit', id: el.id, pointIdx: 1, manual: true };
          } else {
            el.points!.splice(idx + 1, 0, wpt);
            S.drag = { mode: 'arrow-edit', id: el.id, pointIdx: idx + 1, manual: true };
          }
          el.route = 'manual';
          capture(ref.current, e.pointerId);
          notify();
          return;
        }
        if (kind === 'segment') {
          pushHistory('move arrow segment');
          // Drag the displayed (routed for auto) path, like the original.
          const geom = arrowGeom(el, (id) => S.doc.elements[id], theme());
          S.drag = { mode: 'arrow-segment', id: el.id, index: Number(a), axis: b, base: geom.pts };
          capture(ref.current, e.pointerId);
          notify();
          return;
        }
      }
      // Fallback: endpoint proximity (10px like the original).
      const pts = (el.points || []).map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
      const z = S.camera.zoom;
      const hitIdx = pts.findIndex((p) => Math.hypot((p.x - w.x) * z, (p.y - w.y) * z) < 10);
      if (hitIdx >= 0) {
        pushHistory('edit arrow');
        S.drag = { mode: 'arrow-edit', id: el.id, pointIdx: hitIdx };
        (S as any).suggestedBinding = null;
        capture(ref.current, e.pointerId);
        notify();
        return;
      }
    }
    if (e.shiftKey) {
      if (S.selection.has(el.id)) S.selection.delete(el.id);
      else S.selection.add(el.id);
    } else S.selection = new Set([el.id]);
    notify();
    if (!el.locked) startMove(e);
  };

  /* ---------- pointer down ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    if (S.present || S.replay || S.sot.replay) return;
    if (S.editingId) return;
    const target = e.target as HTMLElement;
    const nodeEl = target.closest?.('.node') as HTMLElement | null;
    const edgeEl = target.closest?.('.edges [data-id]') as Element | null;
    if ((S as any).suggestedBinding && S.tool !== 'arrow' && S.tool !== 'line') (S as any).suggestedBinding = null;
    if (S.space || S.tool === 'hand' || e.button === 1) return startPan(e);
    // Ctrl-temp eraser from any tool (tldraw best).
    if (S.tool === 'eraser' || ((e.ctrlKey || e.metaKey) && (S.tool === 'pen' || S.tool === 'select'))) {
      if (S.tool !== 'eraser' && (e.ctrlKey || e.metaKey)) {
        S.drag = { mode: 'erase-temp', prevTool: S.tool };
      }
      return startErase(e);
    }
    if (S.tool === 'laser') {
      /* Press-and-hold activation: hover alone draws nothing. */
      if (e.button !== 0) return;
      S.drag = { mode: 'laser' };
      laserAdd(e.clientX, e.clientY);
      capture(ref.current, e.pointerId);
      notify();
      return;
    }
    if (nodeEl) return onNodeDown(e, nodeEl);
    if (edgeEl) return onEdgeDown(e, edgeEl);
    const w = toWorld(e.clientX, e.clientY);
    if (S.tool === 'select') return startMarquee(e);
    if (SHAPE_TOOLS.includes(S.tool)) return startCreate(e, w);
    if (S.tool === 'arrow' || S.tool === 'line') return startArrow(e, w);
    if (S.tool === 'pen') return startPen(e, w);
    if (S.tool === 'text') {
      /* Click = autoSize, drag>36px = fixed-width (tldraw/Excalidraw).
         Track drag first; create on pointerup so width is known. */
      e.preventDefault();
      S.drag = { mode: 'text', start: { x: e.clientX, y: e.clientY }, origin: w };
      capture(ref.current, e.pointerId);
      return;
    }
    if (S.tool === 'sticky') {
      e.preventDefault();
      return createStickyAt(w);
    }
    startMarquee(e);
  };

  /* ---------- pointer move ---------- */
  const onPointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (S.replay || S.present) return;
    if (S.tool === 'laser' && !S.drag) {
      /* Hover with the laser tool: track for the red-dot cursor. */
      laserHover.current = { x: e.clientX, y: e.clientY };
      if (laserEnsure() && !laserRAF.current) laserRAF.current = requestAnimationFrame(laserDraw);
      return;
    }
    if ((laserHover.current || laserPoints.current.length) && (S.tool !== 'laser' || S.drag)) {
      /* Left laser mode (or pressed): drop stale overlay state. */
      laserHover.current = null;
      if (S.tool !== 'laser') laserClear();
    }
    // Idle hover with arrow/line tool previews the bind target (original).
    if (!S.drag && (S.tool === 'arrow' || S.tool === 'line') && !(e as PointerEvent).buttons) {
      const w = toWorld(e.clientX, e.clientY);
      const sug = suggestedBinding(sortedElements(), w, null);
      const id = sug ? sug.el.id : null;
      if ((S as any).suggestedBinding !== id) {
        (S as any).suggestedBinding = id;
        scheduleNotify();
      }
      return;
    }
    if (S.drag) {
      const d: any = S.drag;
      if (d.mode === 'laser') {
        if ((e as PointerEvent).buttons) laserAdd(e.clientX, e.clientY);
        return;
      }
      const z = S.camera.zoom;
      if (d.mode === 'pan') {
        S.camera.x = d.cam.x + (e.clientX - d.start.x);
        S.camera.y = d.cam.y + (e.clientY - d.start.y);
        scheduleNotify();
        return;
      }
      if (d.mode === 'move') {
        let dx = (e.clientX - d.start.x) / z;
        let dy = (e.clientY - d.start.y) / z;
        const g = settings();
        if (g.snapToGrid && !e.altKey) {
          dx = Math.round(dx / g.gridSize) * g.gridSize;
          dy = Math.round(dy / g.gridSize) * g.gridSize;
        }
        d.moved = Math.abs(dx) + Math.abs(dy) > 0;
        for (const [id, pos] of d.positions) {
          const el = S.doc.elements[id];
          if (!el) continue;
          if (el.type === 'arrow' && (el.start?.elementId || el.end?.elementId)) continue;
          el.x = pos.x + dx;
          el.y = pos.y + dy;
        }
        scheduleNotify();
        return;
      }
      if (d.mode === 'resize') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        let dx = (e.clientX - d.start.x) / z;
        let dy = (e.clientY - d.start.y) / z;
        const g = settings();
        if (g.snapToGrid && !e.altKey) {
          dx = Math.round(dx / g.gridSize) * g.gridSize;
          dy = Math.round(dy / g.gridSize) * g.gridSize;
        }
        const r = d.rect;
        const h = d.handle as string;
        let x = r.x;
        let y = r.y;
        let w = r.w;
        let ht = r.h;
        if (h.includes('e')) w = r.w + dx;
        if (h.includes('s')) ht = r.h + dy;
        if (h.includes('w')) {
          x = r.x + dx;
          w = r.w - dx;
        }
        if (h.includes('n')) {
          y = r.y + dy;
          ht = r.h - dy;
        }
        if (w < 16) {
          w = 16;
          x = r.x + r.w - 16;
        }
        if (ht < 16) {
          ht = 16;
          y = r.y + r.h - 16;
        }
        el.x = x;
        el.y = y;
        el.width = w;
        el.height = ht;
        scheduleNotify();
        return;
      }
      if (d.mode === 'create') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        const w = toWorld(e.clientX, e.clientY);
        let x = Math.min(d.start.x, w.x);
        let y = Math.min(d.start.y, w.y);
        let ww = Math.abs(w.x - d.start.x);
        let hh = Math.abs(w.y - d.start.y);
        const g = settings();
        if (g.snapToGrid && !e.altKey) {
          x = Math.round(x / g.gridSize) * g.gridSize;
          y = Math.round(y / g.gridSize) * g.gridSize;
          ww = Math.round(ww / g.gridSize) * g.gridSize;
          hh = Math.round(hh / g.gridSize) * g.gridSize;
        }
        el.x = x;
        el.y = y;
        el.width = Math.max(1, ww);
        el.height = Math.max(1, hh);
        scheduleNotify();
        return;
      }
      if (d.mode === 'arrow') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        const w = toWorld(e.clientX, e.clientY);
        el.points![el.points!.length - 1] = { x: w.x, y: w.y };
        d.endWorld = w;
        const sug = suggestedBinding(sortedElements(), w, el.id);
        (S as any).suggestedBinding = sug ? sug.el.id : null;
        scheduleNotify();
        return;
      }
      if (d.mode === 'arrow-edit') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        const w = toWorld(e.clientX, e.clientY);
        el.points![d.pointIdx] = { x: w.x - el.x, y: w.y - el.y };
        if (d.manual) el.route = 'manual';
        const sug = suggestedBinding(sortedElements(), w, el.id);
        (S as any).suggestedBinding = sug ? sug.el.id : null;
        d.suggested = sug;
        scheduleNotify();
        return;
      }
      if (d.mode === 'arrow-segment') {
        // Axis-constrained segment drag (original orthogonal behavior).
        const el = S.doc.elements[d.id];
        if (!el || el.routeMode !== 'orthogonal') return;
        const w = toWorld(e.clientX, e.clientY);
        const g = settings();
        const snap = (v: number) => (g.snapToGrid && !(e as PointerEvent).altKey ? Math.round(v / g.gridSize) * g.gridSize : v);
        const base: { x: number; y: number }[] = d.base;
        const pts = base.map((p) => ({ ...p }));
        let idx = d.index;
        // Mirror original edge extension: dragging the first/last segment
        // extends the polyline so bends stay draggable.
        if (idx === 0) {
          pts.unshift({ ...pts[0] });
          idx++;
        }
        if (idx + 1 === pts.length - 1) pts.push({ ...pts[pts.length - 1] });
        if (d.axis === 'h') {
          const y = snap(w.y);
          pts[idx].y = y;
          pts[idx + 1].y = y;
        } else {
          const x = snap(w.x);
          pts[idx].x = x;
          pts[idx + 1].x = x;
        }
        el.points = pts.map((p) => ({ x: p.x - el.x, y: p.y - el.y }));
        el.route = 'manual';
        scheduleNotify();
        return;
      }
      if (d.mode === 'label') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        const dx = (e.clientX - d.start.x) / S.camera.zoom;
        const dy = (e.clientY - d.start.y) / S.camera.zoom;
        (el as any).labelPoint = { dx: d.orig.dx + dx, dy: d.orig.dy + dy };
        scheduleNotify();
        return;
      }
      if (d.mode === 'pen') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        const w = toWorld(e.clientX, e.clientY);
        const now = performance.now();
        const dt = Math.max(1, now - (d.lastT || now));
        const lastW = d.lastW || w;
        const dist = Math.hypot(w.x - lastW.x, w.y - lastW.y);
        const pe = pressureFromEvent(e as any, 0.5);
        const sim = pe.isPen ? pe.pressure : simulatePressure(dist, dt);
        let pt = { x: w.x - el.x, y: w.y - el.y, pressure: sim };
        // Shift = straight 15deg snap from last point.
        if ((e as PointerEvent).shiftKey) {
          const last = el.points![el.points!.length - 1];
          const base = { x: el.x + last.x, y: el.y + last.y };
          const snapped = snapAngle15(base, w);
          pt = { x: snapped.x - el.x, y: snapped.y - el.y, pressure: 0.6 };
        } else if (el.points!.length > 1) {
          // Streamline toward pointer.
          const last = el.points![el.points!.length - 1];
          const lp = (el.pressures || [])[el.pressures!.length - 1] ?? 0.5;
          const s = streamline(
            { x: last.x, y: last.y, pressure: lp },
            { x: pt.x, y: pt.y, pressure: pt.pressure },
          );
          pt = s;
        }
        const last = el.points![el.points!.length - 1];
        if (Math.hypot(pt.x - last.x, pt.y - last.y) > 0.8) {
          el.points!.push({ x: pt.x, y: pt.y });
          el.pressures!.push(pt.pressure);
          if (el.points!.length > 600) {
            el.points!.shift();
            el.pressures!.shift();
            el.x += 0; // origin stays; bbox recomputed on release
          }
        }
        d.lastT = now;
        d.lastW = w;
        scheduleNotify();
        return;
      }
      if (d.mode === 'erase' || d.mode === 'erase-temp') {
        eraseAt(e.clientX, e.clientY);
        return;
      }
    }
    if (S.marquee) {
      const r = ref.current!.getBoundingClientRect();
      S.marquee.x1 = e.clientX - r.left;
      S.marquee.y1 = e.clientY - r.top;
      scheduleNotify();
    }
  };

  /* ---------- pointer up ---------- */
  const finishMarquee = () => {
    const m = S.marquee;
    S.marquee = null;
    if (!m) return;
    if (Math.abs(m.x1 - m.x0) < 3 && Math.abs(m.y1 - m.y0) < 3) {
      S.selection.clear();
      notify();
      return;
    }
    const r = ref.current!.getBoundingClientRect();
    const a = toWorld(r.left + Math.min(m.x0, m.x1), r.top + Math.min(m.y0, m.y1));
    const b = toWorld(r.left + Math.max(m.x0, m.x1), r.top + Math.max(m.y0, m.y1));
    if (!m.additive) S.selection.clear();
    for (const el of elements()) {
      const bb = elementBounds(el);
      if (bb.maxX >= a.x && bb.minX <= b.x && bb.maxY >= a.y && bb.minY <= b.y) S.selection.add(el.id);
    }
    notify();
  };

  const onPointerUp = (_e: React.PointerEvent | PointerEvent) => {
    if (S.present || S.replay) return;
    const d: any = S.drag;
    if (S.marquee) finishMarquee();
    if (!d) {
      S.panning = false;
      notify();
      return;
    }
    if (d.mode === 'text') {
      const dragW = Math.abs((_e as PointerEvent).clientX - d.start.x);
      const origin = d.origin;
      S.drag = null;
      S.panning = false;
      if (dragW > TEXT_AUTOWRAP_THRESHOLD) {
        const cur = toWorld((_e as PointerEvent).clientX, (_e as PointerEvent).clientY);
        const width = Math.max(60, Math.abs(cur.x - origin.x));
        (_e as any).preventDefault?.();
        createTextAt({ x: Math.min(origin.x, cur.x), y: origin.y }, { width, autoSize: false });
      } else {
        (_e as any).preventDefault?.();
        createTextAt(origin, { autoSize: true });
      }
      notify();
      persist();
      return;
    }
    if (d.mode === 'move' && !d.moved && d.editId && S.doc.elements[d.editId] && !S.doc.elements[d.editId].locked) {
      const target = d.editId;
      S.drag = null;
      S.panning = false;
      beginEdit(target);
      notify();
      persist();
      return;
    }
    if (d.mode === 'laser') {
      /* Release: stop refreshing timestamps so the existing points age out
         and the trail fades gradually instead of vanishing instantly.
         No doc changes, so no persist. */
      S.drag = null;
      S.panning = false;
      notify();
      return;
    } else if (d.mode === 'create') {
      const el = S.doc.elements[d.id];
      if (el) {
        if (el.width < 8 && el.height < 8) {
          if (d.toolKind === 'frame') {
            el.width = 400;
            el.height = 240;
            el.x -= 200;
            el.y -= 120;
          } else {
            el.width = 160;
            el.height = 64;
            el.x -= 80;
            el.y -= 32;
          }
          if (!el.label) el.label = d.toolKind === 'frame' ? 'Group' : '';
        }
        el.width = Math.max(16, el.width);
        el.height = Math.max(16, el.height);
        S.selection = new Set([el.id]);
      }
      setTool('select');
    } else if (d.mode === 'arrow') {
      const el = S.doc.elements[d.id];
      if (el) {
        const p0 = el.points![0];
        const p1 = el.points![el.points!.length - 1];
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 8) {
          removeElements([el.id]);
          S.selection.clear();
        } else {
          if (!el.start) {
            const hit = nextFrameElement(sortedElements(), { x: p0.x, y: p0.y }, el.id);
            if (hit)
              el.start = {
                elementId: hit.id,
                anchor: 'auto',
                normalizedAnchor: normalizedAnchorOf(hit, { x: p0.x, y: p0.y }),
                isExact: false,
                isPrecise: false,
                snap: 'edge',
              };
          }
          const hit2 = nextFrameElement(sortedElements(), { x: p1.x, y: p1.y }, el.id);
          if (hit2)
            el.end = {
              elementId: hit2.id,
              anchor: 'auto',
              normalizedAnchor: normalizedAnchorOf(hit2, { x: p1.x, y: p1.y }),
              isExact: false,
              isPrecise: false,
              snap: 'edge',
            };
          S.selection = new Set([el.id]);
        }
      }
      (S as any).suggestedBinding = null;
      setTool('select');
    } else if (d.mode === 'arrow-edit') {
      const el = S.doc.elements[d.id];
      if (el) {
        const idx = d.pointIdx;
        const pt = el.points![idx];
        const world = { x: el.x + pt.x, y: el.y + pt.y };
        const sug = suggestedBinding(sortedElements(), world, el.id);
        const isEnd = idx === 0 || idx === el.points!.length - 1;
        if (sug && isEnd) {
          const binding = {
            elementId: sug.el.id,
            anchor: 'auto',
            normalizedAnchor: sug.anchor,
            isExact: false,
            isPrecise: true,
            snap: 'edge' as const,
          };
          if (idx === 0) el.start = binding;
          else el.end = binding;
        } else if (isEnd) {
          if (idx === 0) el.start = null;
          else el.end = null;
        }
        S.selection = new Set([el.id]);
      }
      (S as any).suggestedBinding = null;
    } else if (d.mode === 'arrow-segment') {
      // Drop collinear clutter after a segment move (original sA).
      const el = S.doc.elements[d.id];
      if (el) {
        const abs = (el.points || []).map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
        const clean = cleanupArrowPoints(abs);
        if (clean.length !== abs.length && clean.length >= 2) {
          el.points = clean.map((p) => ({ x: p.x - el.x, y: p.y - el.y }));
        }
        el.route = 'manual';
        S.selection = new Set([el.id]);
      }
    } else if (d.mode === 'label') {
      // label offset already live; just persist.
      S.selection = new Set([d.id]);
    } else if (d.mode === 'erase-temp') {
      eraseAt((_e as PointerEvent).clientX, (_e as PointerEvent).clientY);
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      return;
    } else if (d.mode === 'pen') {
      const el = S.doc.elements[d.id];
      if (el) {
        // Simplify + cap + bbox.
        try {
          const pts = el.points!.map((p, i) => ({
            x: p.x,
            y: p.y,
            pressure: (el.pressures || [])[i] ?? 0.5,
          }));
          const simple = simplify(pts, 1.2).slice(0, 600);
          el.points = simple.map((p) => ({ x: p.x, y: p.y }));
          el.pressures = simple.map((p) => p.pressure);
        } catch { /* keep */ }
        const pts = el.points!.map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        el.width = Math.max(...xs) - Math.min(...xs);
        el.height = Math.max(...ys) - Math.min(...ys);
        // Original keeps strokes open: no auto-close, no fill.
        el.isClosed = false;
        if (!el.points!.length || (el.width < 2 && el.height < 2)) {
          removeElements([el.id]);
          S.selection.clear();
        }
        // Original stays on the pen for continuous drawing (no tool switch).
      }
    }
    S.drag = null;
    S.panning = false;
    notify();
    persist();
  };

  /* ---------- resize handles ---------- */
  const startResize = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    const el = selectionElements()[0];
    if (!el) return;
    // Text edge-drag converts autoSize to fixed-width (tldraw best).
    if (el.type === 'text' && (handle.includes('e') || handle.includes('w'))) {
      pushHistory('wrap text');
      el.autoSize = false;
      notify();
    }
    pushHistory('resize');
    S.drag = { mode: 'resize', handle, id: el.id, start: { x: e.clientX, y: e.clientY }, rect: { x: el.x, y: el.y, w: el.width, h: el.height } };
    const move = (ev: PointerEvent) => onPointerMove(ev);
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onPointerUp(ev);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  /* ---------- wheel / drop / double click ---------- */
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      if (S.present || S.replay || S.sot.replay) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
      else {
        S.camera.x -= e.deltaX;
        S.camera.y -= e.deltaY;
        scheduleNotify();
      }
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    const onContext = (e: MouseEvent) => e.preventDefault();
    c.addEventListener('contextmenu', onContext);
    return () => {
      c.removeEventListener('wheel', onWheel);
      c.removeEventListener('contextmenu', onContext);
    };
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => placeImage(String(fr.result), img.naturalWidth, img.naturalHeight);
      img.src = String(fr.result);
    };
    fr.readAsDataURL(f);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    // Original only double-clicks with the select tool.
    if (S.tool !== 'select') return;
    // Double-click a waypoint handle on a manual route removes the bend (original).
    const hEl = (e.target as HTMLElement).closest?.('[data-handle]') as HTMLElement | null;
    if (hEl) {
      const [kind, a] = (hEl.dataset.handle || '').split(':');
      const edgeEl = (e.target as HTMLElement).closest?.('.edges [data-id]') as HTMLElement | null;
      const el = edgeEl ? S.doc.elements[edgeEl.dataset.id!] : null;
      if (el && el.type === 'arrow' && kind === 'waypoint' && el.route === 'manual' && (el.points || []).length > 3) {
        pushHistory('remove bend');
        el.points!.splice(Number(a), 1);
        S.selection = new Set([el.id]);
        notify();
        persist();
        return;
      }
    }
    const edgeEl = (e.target as HTMLElement).closest?.('.edges [data-id]') as HTMLElement | null;
    if (edgeEl && !((e.target as HTMLElement).closest?.('.node') as HTMLElement | null)) {
      const el = S.doc.elements[edgeEl.dataset.id!];
      if (el && el.type === 'arrow' && !el.locked) {
        beginEdit(el.id);
        return;
      }
    }
    const nodeEl = (e.target as HTMLElement).closest?.('.node') as HTMLElement | null;
    if (!nodeEl) {
      // Original: double-click empty canvas drops into the text tool here.
      const w = toWorld(e.clientX, e.clientY);
      setTool('text');
      createTextAt(w, { autoSize: true });
      return;
    }
    const el = S.doc.elements[nodeEl.dataset.id!];
    if (!el) return;
    if (el.type === 'diagram') {
      S.codeFor = el.id;
      S.codeDraft = el.dsl;
      setPanel('code');
      return;
    }
    if (el.type === 'slide') {
      present((S.doc.elements ? [...Object.values(S.doc.elements) as any[]].filter((x) => x.type === 'slide') : []).findIndex((s) => s.id === el.id));
      return;
    }
    if (el.type === 'image') return;
    // Original: double-click edits the element's own label/text directly.
    S.selection = new Set([el.id]);
    beginEdit(el.id);
  };

  /* ---------- render ---------- */
  const th = theme();
  const g = settings();
  const toolClass = SHAPE_TOOLS.includes(S.tool) ? 'shape' : S.tool;
  const panning = S.panning || S.drag?.mode === 'pan';
  const list = selectionElements();
  // No selection box while typing: the editor itself shows where text goes.
  const selBounds = S.editingId ? null : list.length ? boundsOf(list) : null;
  const single = list.length === 1 ? list[0] : null;
  const resizable = !!single && !single.locked && !['arrow', 'freehand'].includes(single.type);
  const sugId = (S as any).suggestedBinding as string | null;
  const sugEl = sugId ? S.doc.elements[sugId] : null;
  const sugBounds = sugEl ? elementBounds(sugEl) : null;

  return (
    <div
      className={`canvas tool-${S.space ? 'hand' : toolClass}${panning ? ' panning' : ''}`}
      id="canvas"
      ref={ref}
      style={{ background: th.board }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        laserHover.current = null;
        if (S.tool === 'laser' && !laserPoints.current.length) laserClear();
      }}
      onDoubleClick={onDoubleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className={`grid${g.showGrid ? ' on' : ''}`}
        id="grid"
        style={{
          backgroundImage: `radial-gradient(circle, ${th.dot} 1px, transparent 1.15px)`,
          backgroundSize: `${g.gridSize * S.camera.zoom}px ${g.gridSize * S.camera.zoom}px`,
          backgroundPosition: `${S.camera.x % (g.gridSize * S.camera.zoom)}px ${S.camera.y % (g.gridSize * S.camera.zoom)}px`,
        }}
      />
      <div className="world" id="world" style={{ transform: `translate(${S.camera.x}px,${S.camera.y}px) scale(${S.camera.zoom})` }}>
        <Edges />
        <div id="nodes">
          {sortedElements().map((el) => (
            <NodeView
              key={el.id}
              el={el}
              selected={S.selection.has(el.id)}
              slideNumber={el.type === 'slide' ? ([...Object.values(S.doc.elements)] as any[]).filter((x) => x.type === 'slide').sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).findIndex((s: any) => s.id === el.id) + 1 : undefined}
            />
          ))}
        </div>
      </div>
      {S.marquee ? (
        <div
          className="marquee on"
          id="marquee"
          style={{
            left: Math.min(S.marquee.x0, S.marquee.x1),
            top: Math.min(S.marquee.y0, S.marquee.y1),
            width: Math.abs(S.marquee.x1 - S.marquee.x0),
            height: Math.abs(S.marquee.y1 - S.marquee.y0),
          }}
        />
      ) : null}
      {selBounds ? (
        <div
          className="sel on"
          id="sel"
          style={{
            left: selBounds.minX * S.camera.zoom + S.camera.x,
            top: selBounds.minY * S.camera.zoom + S.camera.y,
            width: selBounds.width * S.camera.zoom,
            height: selBounds.height * S.camera.zoom,
          }}
        >
          {HANDLES.map((h) => (
            <i
              key={h}
              className="h"
              data-h={h}
              style={{ display: resizable ? undefined : 'none' }}
              onPointerDown={(e) => resizable && startResize(e, h)}
            />
          ))}
        </div>
      ) : null}
      {sugBounds ? (
        <div
          className="sel on sug"
          style={{
            left: sugBounds.minX * S.camera.zoom + S.camera.x - 4,
            top: sugBounds.minY * S.camera.zoom + S.camera.y - 4,
            width: (sugBounds.maxX - sugBounds.minX) * S.camera.zoom + 8,
            height: (sugBounds.maxY - sugBounds.minY) * S.camera.zoom + 8,
            borderColor: '#4d7cfe',
          }}
        />
      ) : null}
      <canvas className="laser" id="laser" ref={laserRef} />
      <TextEditor />
    </div>
  );
}
