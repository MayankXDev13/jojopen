import type { CanvasPointerEvent, ToolContext, ToolController } from './types';
import { elementBounds } from '../lib/geometry';
import {
  S,
  elements,
  notify,
  persist,
  pushHistory,
  scheduleNotify,
  selectionElements,
  settings,
  sortedElements,
} from '../state/store';
import { beginEdit, present, setPanel, setTool } from '../state/actions';
import { textTool } from './TextToolController';

export const TEXT_EDITABLE = ['text', 'shape', 'sticky', 'container'];

export class SelectToolController implements ToolController {
  readonly id = 'select';

  startMarquee(e: CanvasPointerEvent, ctx: ToolContext): void {
    const r = ctx.container?.getBoundingClientRect() || { left: 0, top: 0 };
    if (!e.shiftKey) S.selection.clear();
    S.marquee = {
      x0: e.clientX - r.left,
      y0: e.clientY - r.top,
      x1: e.clientX - r.left,
      y1: e.clientY - r.top,
      additive: e.shiftKey,
    };
    ctx.capturePointer(e.pointerId);
    notify();
  }

  finishMarquee(ctx: ToolContext): void {
    const m = S.marquee;
    if (!m) return;
    S.marquee = null;
    if (Math.abs(m.x1 - m.x0) < 4 && Math.abs(m.y1 - m.y0) < 4) {
      if (!m.additive) S.selection.clear();
      notify();
      return;
    }
    const r = ctx.container?.getBoundingClientRect() || { left: 0, top: 0 };
    const a = ctx.toWorld(r.left + Math.min(m.x0, m.x1), r.top + Math.min(m.y0, m.y1));
    const b = ctx.toWorld(r.left + Math.max(m.x0, m.x1), r.top + Math.max(m.y0, m.y1));
    if (!m.additive) S.selection.clear();
    for (const el of elements()) {
      const bb = elementBounds(el);
      if (bb.maxX >= a.x && bb.minX <= b.x && bb.maxY >= a.y && bb.minY <= b.y) S.selection.add(el.id);
    }
    notify();
  }

  startMove(e: CanvasPointerEvent, ctx: ToolContext, editId: string | null = null): void {
    const list = selectionElements().filter((x) => !x.locked);
    if (!list.length) return;
    const positions = new Map<string, { x: number; y: number }>();
    for (const el of list) {
      positions.set(el.id, { x: el.x, y: el.y });
      if (el.type === 'slide') {
        for (const c of sortedElements().filter((x) => x.frameId === el.id)) {
          if (!positions.has(c.id)) positions.set(c.id, { x: c.x, y: c.y });
        }
      }
    }
    pushHistory('move');
    S.drag = { mode: 'move', start: { x: e.clientX, y: e.clientY }, positions, moved: false, editId };
    ctx.capturePointer(e.pointerId);
  }

  startResize(e: CanvasPointerEvent, handle: string, ctx: ToolContext): void {
    e.stopPropagation();
    const el = selectionElements()[0];
    if (!el) return;
    if (el.type === 'text' && (handle.includes('e') || handle.includes('w'))) {
      pushHistory('wrap text');
      el.autoSize = false;
      notify();
    }
    pushHistory('resize');
    S.drag = {
      mode: 'resize',
      handle,
      id: el.id,
      start: { x: e.clientX, y: e.clientY },
      rect: { x: el.x, y: el.y, w: el.width, h: el.height },
    };
    ctx.capturePointer(e.pointerId);
  }

  onNodeDown(e: CanvasPointerEvent, nodeEl: HTMLElement, ctx: ToolContext): void {
    const el = S.doc.elements[nodeEl.dataset.id!];
    if (!el) return;
    e.stopPropagation();

    if (S.tool !== 'select') setTool('select');
    const groupIds = el.groupIds || [];
    let ids = [el.id];
    if (groupIds.length) {
      ids = elements().filter((x) => x.groupIds?.some((g) => groupIds.includes(g))).map((x) => x.id);
    }
    const wasSelected = S.selection.has(el.id);
    if (e.shiftKey) {
      if (S.selection.has(el.id)) ids.forEach((i) => S.selection.delete(i));
      else ids.forEach((i) => S.selection.add(i));
    } else if (!S.selection.has(el.id)) {
      S.selection = new Set(ids);
    }
    notify();

    const editId =
      !e.shiftKey && wasSelected && ids.length === 1 && !el.locked && TEXT_EDITABLE.includes(el.type)
        ? el.id
        : null;
    if (!el.locked) this.startMove(e, ctx, editId);
  }

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    const target = e.target as HTMLElement;
    const nodeEl = target?.closest?.('.node') as HTMLElement | null;
    if (nodeEl) {
      this.onNodeDown(e, nodeEl, ctx);
      return;
    }
    const edgeEl = target?.closest?.('.edges [data-id]') as Element | null;
    if (edgeEl) {
      const id = (edgeEl as HTMLElement).dataset.id!;
      const el = S.doc.elements[id];
      if (el) {
        if (e.shiftKey) {
          if (S.selection.has(el.id)) S.selection.delete(el.id);
          else S.selection.add(el.id);
        } else {
          S.selection = new Set([el.id]);
        }
        notify();
        if (!el.locked) this.startMove(e, ctx);
        return;
      }
    }
    this.startMarquee(e, ctx);
  }

  onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    const z = S.camera.zoom;

    if (d && d.mode === 'move') {
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

    if (d && d.mode === 'resize') {
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

    if (S.marquee) {
      const r = ctx.container?.getBoundingClientRect() || { left: 0, top: 0 };
      S.marquee.x1 = e.clientX - r.left;
      S.marquee.y1 = e.clientY - r.top;
      notify();
    }
  }

  onPointerUp(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    if (S.marquee) this.finishMarquee(ctx);

    if (d && d.mode === 'move') {
      if (!d.moved && d.editId && S.doc.elements[d.editId] && !S.doc.elements[d.editId].locked) {
        const target = d.editId;
        S.drag = null;
        S.panning = false;
        beginEdit(target);
        notify();
        persist();
        return;
      }
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      return;
    }

    if (d && d.mode === 'resize') {
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      return;
    }

    if (!d) {
      S.panning = false;
      notify();
    }
  }

  onDoubleClick(e: CanvasPointerEvent, ctx: ToolContext): void {
    if (S.tool !== 'select') return;
    const target = e.target as HTMLElement;

    // Double-click a waypoint handle on a manual route removes the bend
    const hEl = target?.closest?.('[data-handle]') as HTMLElement | null;
    if (hEl) {
      const [kind, a] = (hEl.dataset.handle || '').split(':');
      const edgeEl = target?.closest?.('.edges [data-id]') as HTMLElement | null;
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

    const edgeEl = target?.closest?.('.edges [data-id]') as HTMLElement | null;
    if (edgeEl && !(target?.closest?.('.node') as HTMLElement | null)) {
      const el = S.doc.elements[edgeEl.dataset.id!];
      if (el && el.type === 'arrow' && !el.locked) {
        beginEdit(el.id);
        return;
      }
    }

    const nodeEl = target?.closest?.('.node') as HTMLElement | null;
    if (!nodeEl) {
      const w = ctx.toWorld(e.clientX, e.clientY);
      setTool('text');
      textTool.createTextAt(w, { autoSize: true });
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
      present(
        (S.doc.elements ? ([...Object.values(S.doc.elements)] as any[]) : [])
          .filter((x) => x.type === 'slide')
          .findIndex((s) => s.id === el.id)
      );
      return;
    }
    if (el.type === 'image') return;

    S.selection = new Set([el.id]);
    beginEdit(el.id);
  }

  getCursor(): string {
    return 'default';
  }
}

export const selectTool = new SelectToolController();
