import type { CanvasPointerEvent, ToolContext, ToolController } from './types';
import { MAKE } from '../lib/model';
import { pressureFromEvent, simulatePressure, simplify, snapAngle15, streamline } from '../lib/ink';
import {
  S,
  addElement,
  notify,
  persist,
  pushHistory,
  removeElements,
  scheduleNotify,
} from '../state/store';

export class PenToolController implements ToolController {
  readonly id = 'pen';

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    pushHistory('draw');
    const { pressure, isPen } = pressureFromEvent(e.nativeEvent as any, 0.5);
    const w = { x: e.worldX, y: e.worldY };
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
    ctx.capturePointer(e.pointerId);
    notify();
  }

  onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    if (!d || d.mode !== 'pen') return;
    const el = S.doc.elements[d.id];
    if (!el) return;

    const w = { x: e.worldX, y: e.worldY };
    const now = performance.now();
    const dt = Math.max(1, now - (d.lastT || now));
    const lastW = d.lastW || w;
    const dist = Math.hypot(w.x - lastW.x, w.y - lastW.y);
    const pe = pressureFromEvent(e.nativeEvent as any, 0.5);
    const sim = pe.isPen ? pe.pressure : simulatePressure(dist, dt);
    let pt = { x: w.x - el.x, y: w.y - el.y, pressure: sim };

    // Shift = straight 15deg snap from last point.
    if (e.shiftKey) {
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
  }

  onPointerUp(): void {
    const d: any = S.drag;
    if (d && d.mode === 'pen') {
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
      }
      S.drag = null;
      S.panning = false;
      notify();
      persist();
    }
  }

  getCursor(): string {
    return 'crosshair';
  }
}

export const penTool = new PenToolController();
