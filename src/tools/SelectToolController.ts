import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { elementBounds, pointInElement } from "../lib/geometry";
import {
  S,
  elements,
  nextIndex,
  notify,
  persist,
  pushHistory,
  scheduleNotify,
  selectionElements,
  settings,
  slideChildren,
  slides,
  sortedElements,
  theme,
} from "../state/store";
import {
  beginEdit,
  present,
  setPanel,
  setTool,
  syncEnclosedShapes,
} from "../state/actions";
import { textTool } from "./TextToolController";
import { deep, uid } from "../lib/dom";
import { hitTestArrow } from "../lib/geometry";

export const TEXT_EDITABLE = ["text", "shape", "sticky", "container", "arrow"];

function cloneElementsForDrag(
  originalPositions: Map<string, { x: number; y: number }>,
): {
  clonedPositions: Map<string, { x: number; y: number }>;
  clonedIds: string[];
} {
  const origElements = Array.from(originalPositions.keys())
    .map((id) => S.doc.elements[id])
    .filter(Boolean);

  const idMap = new Map<string, string>();
  for (const el of origElements) {
    idMap.set(el.id, uid());
  }

  const groupMap = new Map<string, string>();
  for (const el of origElements) {
    if (el.groupIds) {
      for (const gid of el.groupIds) {
        if (!groupMap.has(gid)) groupMap.set(gid, uid());
      }
    }
  }

  const clonedPositions = new Map<string, { x: number; y: number }>();
  const clonedIds: string[] = [];

  for (const orig of origElements) {
    const clone = deep(orig);
    const newId = idMap.get(orig.id)!;
    clone.id = newId;
    clone.index = nextIndex();

    if (clone.frameId && idMap.has(clone.frameId)) {
      clone.frameId = idMap.get(clone.frameId)!;
    }
    if (clone.groupIds) {
      clone.groupIds = clone.groupIds.map(
        (gid: string) => groupMap.get(gid) || gid,
      );
    }
    if (clone.type === "arrow") {
      if (clone.start?.elementId && idMap.has(clone.start.elementId)) {
        clone.start = {
          ...clone.start,
          elementId: idMap.get(clone.start.elementId)!,
        };
      }
      if (clone.end?.elementId && idMap.has(clone.end.elementId)) {
        clone.end = {
          ...clone.end,
          elementId: idMap.get(clone.end.elementId)!,
        };
      }
    }

    S.doc.elements[newId] = clone;
    clonedIds.push(newId);
    const origPos = originalPositions.get(orig.id)!;
    clonedPositions.set(newId, { ...origPos });
  }

  return { clonedPositions, clonedIds };
}

export class SelectToolController implements ToolController {
  readonly id = "select";

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
    const a = ctx.toWorld(
      r.left + Math.min(m.x0, m.x1),
      r.top + Math.min(m.y0, m.y1),
    );
    const b = ctx.toWorld(
      r.left + Math.max(m.x0, m.x1),
      r.top + Math.max(m.y0, m.y1),
    );
    if (!m.additive) S.selection.clear();
    const all = elements();
    const enclosed = all.filter((el) => {
      const bb = elementBounds(el);
      return (
        bb.minX >= a.x && bb.maxX <= b.x && bb.minY >= a.y && bb.maxY <= b.y
      );
    });
    const targets = enclosed.length
      ? enclosed
      : all.filter((el) => {
          const bb = elementBounds(el);
          return (
            bb.maxX >= a.x && bb.minX <= b.x && bb.maxY >= a.y && bb.minY <= b.y
          );
        });
    for (const el of targets) {
      S.selection.add(el.id);
    }
    notify();
  }

  private keyCleanup: (() => void) | null = null;

  startMove(
    e: CanvasPointerEvent,
    ctx: ToolContext,
    editId: string | null = null,
  ): void {
    const list = selectionElements().filter((x) => !x.locked);
    if (!list.length) return;
    const positions = new Map<string, { x: number; y: number }>();
    for (const el of list) {
      positions.set(el.id, { x: el.x, y: el.y });
      if (el.type === "slide") {
        for (const c of slideChildren(el)) {
          if (!positions.has(c.id)) positions.set(c.id, { x: c.x, y: c.y });
        }
      }
    }
    pushHistory("move");

    if (this.keyCleanup) {
      this.keyCleanup();
      this.keyCleanup = null;
    }
    if (typeof window !== "undefined") {
      const onKey = (ke: KeyboardEvent) => {
        if (ke.key === "Alt") {
          if (S.drag) ke.preventDefault();
          this.syncAltDuplicate(ke.type === "keydown");
        }
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      this.keyCleanup = () => {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
      };
    }

    S.drag = {
      mode: "move",
      start: { x: e.clientX, y: e.clientY },
      positions,
      originalPositions: new Map(positions),
      originalIds: Array.from(positions.keys()),
      clonedIds: null,
      isDuplicate: false,
      moved: false,
      editId,
      lastClient: { x: e.clientX, y: e.clientY },
      lastCtrl: e.ctrlKey || e.metaKey,
    };
    ctx.capturePointer(e.pointerId);
  }

  startResize(e: CanvasPointerEvent, handle: string, ctx: ToolContext): void {
    e.stopPropagation();
    const el = selectionElements()[0];
    if (!el || el.type === "slide") return;
    if (el.type === "text" && (handle.includes("e") || handle.includes("w"))) {
      pushHistory("wrap text");
      el.autoSize = false;
      notify();
    }
    pushHistory("resize");
    S.drag = {
      mode: "resize",
      handle,
      id: el.id,
      start: { x: e.clientX, y: e.clientY },
      rect: { x: el.x, y: el.y, w: el.width, h: el.height },
    };
    ctx.capturePointer(e.pointerId);
  }

  onNodeDown(
    e: CanvasPointerEvent,
    nodeEl: HTMLElement,
    ctx: ToolContext,
  ): void {
    const el = S.doc.elements[nodeEl.dataset.id!];
    if (!el) return;
    e.stopPropagation();

    if (S.tool !== "select") setTool("select");
    const groupIds = el.groupIds || [];
    let ids = [el.id];
    if (groupIds.length) {
      ids = elements()
        .filter((x) => x.groupIds?.some((g) => groupIds.includes(g)))
        .map((x) => x.id);
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
      !e.shiftKey &&
      wasSelected &&
      ids.length === 1 &&
      !el.locked &&
      TEXT_EDITABLE.includes(el.type)
        ? el.id
        : null;
    if (!el.locked) this.startMove(e, ctx, editId);
  }

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    const target = e.target as HTMLElement;
    const nodeEl = target?.closest?.(".node") as HTMLElement | null;
    if (nodeEl) {
      this.onNodeDown(e, nodeEl, ctx);
      return;
    }
    const edgeEl = target?.closest?.(".edges [data-id]") as Element | null;
    if (edgeEl) {
      const id = (edgeEl as HTMLElement).dataset.id!;
      const el = S.doc.elements[id];
      if (el) {
        const wasSelected = S.selection.has(el.id);
        const editId =
          !e.shiftKey && wasSelected && S.selection.size === 1 && !el.locked
            ? el.id
            : null;
        if (e.shiftKey) {
          if (S.selection.has(el.id)) S.selection.delete(el.id);
          else S.selection.add(el.id);
        } else {
          S.selection = new Set([el.id]);
        }
        notify();
        if (!el.locked) this.startMove(e, ctx, editId);
        return;
      }
    }
    this.startMarquee(e, ctx);
  }

  syncAltDuplicate(isAlt: boolean): void {
    const d: any = S.drag;
    if (!d || d.mode !== "move" || !d.moved) return;
    if (isAlt && !d.isDuplicate) {
      for (const [id, pos] of d.originalPositions) {
        const el = S.doc.elements[id];
        if (el) {
          el.x = pos.x;
          el.y = pos.y;
        }
      }
      const { clonedPositions, clonedIds } = cloneElementsForDrag(
        d.originalPositions,
      );
      d.clonedIds = clonedIds;
      d.positions = clonedPositions;
      d.isDuplicate = true;
      S.selection = new Set(clonedIds);
      if (d.lastClient) {
        this.applyMoveDelta(d.lastClient, isAlt, d.lastCtrl);
      } else {
        notify();
      }
    } else if (!isAlt && d.isDuplicate) {
      if (d.clonedIds) {
        for (const id of d.clonedIds) {
          delete S.doc.elements[id];
        }
        d.clonedIds = null;
      }
      d.positions = d.originalPositions;
      d.isDuplicate = false;
      S.selection = new Set(d.originalIds);
      if (d.lastClient) {
        this.applyMoveDelta(d.lastClient, isAlt, d.lastCtrl);
      } else {
        notify();
      }
    }
  }

  applyMoveDelta(
    clientPos: { x: number; y: number },
    altKey: boolean,
    ctrlKey: boolean = false,
  ): void {
    const d: any = S.drag;
    if (!d || d.mode !== "move") return;
    const z = S.camera.zoom;
    let dx = (clientPos.x - d.start.x) / z;
    let dy = (clientPos.y - d.start.y) / z;
    const g = settings();
    if (g.snapToGrid && !ctrlKey) {
      dx = Math.round(dx / g.gridSize) * g.gridSize;
      dy = Math.round(dy / g.gridSize) * g.gridSize;
    }
    for (const [id, pos] of d.positions) {
      const el = S.doc.elements[id];
      if (!el) continue;
      if (el.type === "arrow" && (el.start?.elementId || el.end?.elementId))
        continue;
      el.x = pos.x + dx;
      el.y = pos.y + dy;
    }
    scheduleNotify();
  }

  onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    const z = S.camera.zoom;

    if (d && d.mode === "move") {
      d.lastClient = { x: e.clientX, y: e.clientY };
      d.lastCtrl = e.ctrlKey || e.metaKey;

      let dx = (e.clientX - d.start.x) / z;
      let dy = (e.clientY - d.start.y) / z;
      const g = settings();
      const bypassSnap = e.ctrlKey || e.metaKey;
      if (g.snapToGrid && !bypassSnap) {
        dx = Math.round(dx / g.gridSize) * g.gridSize;
        dy = Math.round(dy / g.gridSize) * g.gridSize;
      }
      if (Math.abs(dx) + Math.abs(dy) > 0) d.moved = true;

      if (d.moved) {
        this.syncAltDuplicate(e.altKey);
      }

      for (const [id, pos] of d.positions) {
        const el = S.doc.elements[id];
        if (!el) continue;
        if (
          el.type === "arrow" &&
          ((el.start?.elementId && !d.positions.has(el.start.elementId)) ||
            (el.end?.elementId && !d.positions.has(el.end.elementId)))
        ) {
          continue;
        }
        el.x = pos.x + dx;
        el.y = pos.y + dy;
      }
      scheduleNotify();
      return;
    }

    if (d && d.mode === "resize") {
      const el = S.doc.elements[d.id];
      if (!el) return;
      let dx = (e.clientX - d.start.x) / z;
      let dy = (e.clientY - d.start.y) / z;
      const g = settings();
      if (g.snapToGrid && !e.altKey && !e.ctrlKey && !e.metaKey) {
        dx = Math.round(dx / g.gridSize) * g.gridSize;
        dy = Math.round(dy / g.gridSize) * g.gridSize;
      }
      const r = d.rect;
      const h = d.handle as string;
      let x = r.x;
      let y = r.y;
      let w = r.w;
      let ht = r.h;
      if (h.includes("e")) w = r.w + dx;
      if (h.includes("s")) ht = r.h + dy;
      if (h.includes("w")) {
        x = r.x + dx;
        w = r.w - dx;
      }
      if (h.includes("n")) {
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
    if (this.keyCleanup) {
      this.keyCleanup();
      this.keyCleanup = null;
    }

    const d: any = S.drag;
    if (S.marquee) this.finishMarquee(ctx);

    if (d && d.mode === "move") {
      if (
        !d.moved &&
        !e.altKey &&
        d.editId &&
        S.doc.elements[d.editId] &&
        !S.doc.elements[d.editId].locked
      ) {
        const target = d.editId;
        S.drag = null;
        S.panning = false;
        beginEdit(target);
        notify();
        persist();
        return;
      }
      if (d.isDuplicate && S.history.length) {
        S.history[S.history.length - 1].label = "duplicate";
      }
      for (const id of d.originalIds || []) {
        const el = S.doc.elements[id];
        if (!el || el.type === "slide") continue;
        const midX =
          el.type === "arrow" && el.points?.length
            ? el.x + (el.points[0].x + el.points[el.points.length - 1].x) / 2
            : el.x + (el.width || 0) / 2;
        const midY =
          el.type === "arrow" && el.points?.length
            ? el.y + (el.points[0].y + el.points[el.points.length - 1].y) / 2
            : el.y + (el.height || 0) / 2;
        const sl = slides().find((s) => pointInElement(midX, midY, s));
        el.frameId = sl ? sl.id : null;
      }
      S.drag = null;
      S.panning = false;
      syncEnclosedShapes();
      notify();
      persist();
      return;
    }

    if (d && d.mode === "resize") {
      S.drag = null;
      S.panning = false;
      syncEnclosedShapes();
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
    if (S.tool !== "select") return;
    const target = e.target as HTMLElement;

    // Double-click a waypoint handle on a manual route removes the bend
    const hEl = target?.closest?.("[data-handle]") as HTMLElement | null;
    if (hEl) {
      const [kind, a] = (hEl.dataset.handle || "").split(":");
      const edgeEl = target?.closest?.(
        ".edges [data-id]",
      ) as HTMLElement | null;
      const el = edgeEl ? S.doc.elements[edgeEl.dataset.id!] : null;
      if (
        el &&
        el.type === "arrow" &&
        kind === "waypoint" &&
        el.route === "manual" &&
        (el.points || []).length > 3
      ) {
        pushHistory("remove bend");
        el.points!.splice(Number(a), 1);
        S.selection = new Set([el.id]);
        notify();
        persist();
        return;
      }
    }

    const edgeEl = target?.closest?.(".edges [data-id]") as HTMLElement | null;
    if (edgeEl && !(target?.closest?.(".node") as HTMLElement | null)) {
      const el = S.doc.elements[edgeEl.dataset.id!];
      if (el && el.type === "arrow" && !el.locked) {
        S.selection = new Set([el.id]);
        beginEdit(el.id);
        return;
      }
    }

    const w = { x: e.worldX, y: e.worldY };
    const tolerance = 24 / (S.camera.zoom || 1);
    const th = theme();
    const arrows = sortedElements().filter((el) => el.type === "arrow");
    for (let i = arrows.length - 1; i >= 0; i--) {
      const arrow = arrows[i];
      if (hitTestArrow(w, arrow, (id) => S.doc.elements[id], th, tolerance)) {
        if (!arrow.locked) {
          S.selection = new Set([arrow.id]);
          beginEdit(arrow.id);
          return;
        }
      }
    }

    if (S.selection.size === 1) {
      const selId = [...S.selection][0];
      const selEl = S.doc.elements[selId];
      if (
        selEl &&
        selEl.type === "arrow" &&
        !selEl.locked &&
        hitTestArrow(w, selEl, (id) => S.doc.elements[id], th, tolerance * 2)
      ) {
        beginEdit(selEl.id);
        return;
      }
    }

    const nodeEl = target?.closest?.(".node") as HTMLElement | null;
    if (!nodeEl) {
      setTool("text");
      textTool.createTextAt(w, { autoSize: true });
      return;
    }

    const el = S.doc.elements[nodeEl.dataset.id!];
    if (!el) return;
    if (el.type === "diagram") {
      S.codeFor = el.id;
      S.codeDraft = el.dsl;
      setPanel("code");
      return;
    }
    if (el.type === "slide") {
      present(
        (S.doc.elements ? ([...Object.values(S.doc.elements)] as any[]) : [])
          .filter((x) => x.type === "slide")
          .findIndex((s) => s.id === el.id),
      );
      return;
    }
    if (el.type === "image") return;

    S.selection = new Set([el.id]);
    beginEdit(el.id);
  }

  getCursor(): string {
    return "default";
  }
}

export const selectTool = new SelectToolController();
