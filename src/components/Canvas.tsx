import { useEffect, useRef } from 'react';
import { MAKE } from '../lib/model';
import { boundsOf, elementBounds, nextFrameElement, pointInElement } from '../lib/geometry';
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

const SHAPE_TOOLS = ['rectangle', 'ellipse', 'diamond', 'cylinder', 'frame'];
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function capture(el: Element | null, id: number) {
  try {
    (el as HTMLElement | null)?.setPointerCapture?.(id);
  } catch {}
}

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLCanvasElement>(null);
  const laserPoints = useRef<{ x: number; y: number; t: number; life: number }[]>([]);
  const laserRAF = useRef<number | null>(null);
  const laserTimer = useRef<number | undefined>(undefined);

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
    for (let i = pts.length - 1; i >= 0; i--) if (now - pts[i].t > pts[i].life) pts.splice(i, 1);
    for (const p of pts) {
      const k = 1 - (now - p.t) / p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 * k + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,86,86,${0.55 * k})`;
      ctx.fill();
    }
    laserRAF.current = pts.length ? requestAnimationFrame(laserDraw) : null;
  };

  const laserAdd = (x: number, y: number) => {
    const c = laserRef.current;
    if (!c) return;
    const dpr = devicePixelRatio;
    if (c.width !== innerWidth * dpr) {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
    }
    laserPoints.current.push({ x, y, t: performance.now(), life: 650 });
    if (laserPoints.current.length > 90) laserPoints.current.shift();
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
  const createTextAt = (w: { x: number; y: number }) => {
    pushHistory('add text');
    const el = MAKE.text({ x: Math.round(w.x), y: Math.round(w.y - 14), width: 260, height: 32, text: '', fontSize: 22, align: 'left' });
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
    if (startEl) el.start = { elementId: startEl.id, anchor: 'auto' };
    addElement(el);
    S.selection = new Set([el.id]);
    S.drag = { mode: 'arrow', id: el.id, startEl: startEl?.id || null };
    capture(ref.current, e.pointerId);
    notify();
  };

  const startPen = (e: React.PointerEvent, w: { x: number; y: number }) => {
    pushHistory('draw');
    const el = MAKE.freehand({ x: w.x, y: w.y, points: [{ x: 0, y: 0 }], strokeWidth: 2 });
    addElement(el);
    S.selection = new Set([el.id]);
    S.drag = { mode: 'pen', id: el.id };
    capture(ref.current, e.pointerId);
    notify();
  };

  const startPan = (e: React.PointerEvent) => {
    S.drag = { mode: 'pan', start: { x: e.clientX, y: e.clientY }, cam: { ...S.camera } };
    S.panning = true;
    capture(ref.current, e.pointerId);
    notify();
  };

  const startMove = (e: React.PointerEvent) => {
    const list = selectionElements().filter((x) => !x.locked);
    if (!list.length) return;
    const positions = new Map<string, { x: number; y: number }>();
    for (const el of list) {
      positions.set(el.id, { x: el.x, y: el.y });
      if (el.type === 'slide')
        for (const c of sortedElements().filter((x) => x.frameId === el.id)) if (!positions.has(c.id)) positions.set(c.id, { x: c.x, y: c.y });
    }
    pushHistory('move');
    S.drag = { mode: 'move', start: { x: e.clientX, y: e.clientY }, positions, moved: false };
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
    const hit = sortedElements()
      .reverse()
      .find((x) => x.type !== 'arrow' && x.type !== 'freehand' && !x.locked && pointInElement(w.x, w.y, x));
    if (hit) {
      removeElements([hit.id]);
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
    if (S.tool === 'arrow' || S.tool === 'line') {
      const w = toWorld(e.clientX, e.clientY);
      return startArrow(e, w, el);
    }
    if (S.tool !== 'select') setTool('select');
    const groupIds = el.groupIds || [];
    let ids = [el.id];
    if (groupIds.length) ids = elements().filter((x) => x.groupIds?.some((g) => groupIds.includes(g))).map((x) => x.id);
    if (e.shiftKey) {
      if (S.selection.has(el.id)) ids.forEach((i) => S.selection.delete(i));
      else ids.forEach((i) => S.selection.add(i));
    } else if (!S.selection.has(el.id)) {
      S.selection = new Set(ids);
    }
    notify();
    if (!el.locked) startMove(e);
  };

  const onEdgeDown = (e: React.PointerEvent, edgeEl: Element) => {
    const id = (edgeEl as HTMLElement).dataset.id!;
    const el = S.doc.elements[id];
    if (!el) return;
    e.stopPropagation();
    if (S.tool === 'eraser') return startErase(e);
    if (S.tool !== 'select') setTool('select');
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
    if (S.space || S.tool === 'hand' || e.button === 1) return startPan(e);
    if (S.tool === 'eraser') return startErase(e);
    if (S.tool === 'laser') return laserAdd(e.clientX, e.clientY);
    if (nodeEl) return onNodeDown(e, nodeEl);
    if (edgeEl) return onEdgeDown(e, edgeEl);
    const w = toWorld(e.clientX, e.clientY);
    if (S.tool === 'select') return startMarquee(e);
    if (SHAPE_TOOLS.includes(S.tool)) return startCreate(e, w);
    if (S.tool === 'arrow' || S.tool === 'line') return startArrow(e, w);
    if (S.tool === 'pen') return startPen(e, w);
    if (S.tool === 'text') {
      /* The editor mounts and focuses during this pointerdown. Cancelling the
         default action keeps the following mousedown from moving focus to the
         canvas and immediately blurring (and so discarding) the new editor. */
      e.preventDefault();
      return createTextAt(w);
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
      laserAdd(e.clientX, e.clientY);
      return;
    }
    if (S.drag) {
      const d: any = S.drag;
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
        scheduleNotify();
        return;
      }
      if (d.mode === 'pen') {
        const el = S.doc.elements[d.id];
        if (!el) return;
        const w = toWorld(e.clientX, e.clientY);
        const last = el.points![el.points!.length - 1];
        if (Math.hypot(w.x - el.x - last.x, w.y - el.y - last.y) > 1.2) {
          el.points!.push({ x: w.x - el.x, y: w.y - el.y });
        }
        scheduleNotify();
        return;
      }
      if (d.mode === 'erase') {
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
    if (d.mode === 'create') {
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
            if (hit) el.start = { elementId: hit.id, anchor: 'auto' };
          }
          const hit2 = nextFrameElement(sortedElements(), { x: p1.x, y: p1.y }, el.id);
          if (hit2) el.end = { elementId: hit2.id, anchor: 'auto' };
          S.selection = new Set([el.id]);
        }
      }
      setTool('select');
    } else if (d.mode === 'pen') {
      const el = S.doc.elements[d.id];
      if (el) {
        el.points = el.points!.filter((p, i) => {
          const prev = el.points![i - 1];
          return !prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.9;
        });
        const pts = el.points!.map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        el.width = Math.max(...xs) - Math.min(...xs);
        el.height = Math.max(...ys) - Math.min(...ys);
      }
      setTool('select');
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
    const nodeEl = (e.target as HTMLElement).closest?.('.node') as HTMLElement | null;
    if (!nodeEl) return;
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
    beginEdit(el.id);
  };

  /* ---------- render ---------- */
  const th = theme();
  const g = settings();
  const toolClass = SHAPE_TOOLS.includes(S.tool) ? 'shape' : S.tool;
  const panning = S.panning || S.drag?.mode === 'pan';
  const list = selectionElements();
  const selBounds = list.length ? boundsOf(list) : null;
  const single = list.length === 1 ? list[0] : null;
  const resizable = !!single && !single.locked && !['arrow', 'freehand'].includes(single.type);

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
      <canvas className="laser" id="laser" ref={laserRef} />
      <TextEditor />
    </div>
  );
}
