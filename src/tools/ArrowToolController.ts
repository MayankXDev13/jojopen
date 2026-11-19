import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { MAKE } from "../lib/model";
import {
  arrowGeom,
  cleanupArrowPoints,
  nextFrameElement,
  normalizedAnchorOf,
  pointInElement,
  projectOntoPolyline,
  suggestedBinding,
} from "../lib/geometry";
import {
  S,
  addElement,
  notify,
  persist,
  pushHistory,
  removeElements,
  scheduleNotify,
  settings,
  slides,
  sortedElements,
  theme,
} from "../state/store";
import { beginEdit, setTool } from "../state/actions";

export class ArrowToolController implements ToolController {
  readonly id = "arrow";

  startArrow(
    e: CanvasPointerEvent,
    ctx: ToolContext,
    startEl: any = null,
  ): void {
    pushHistory("add arrow");
    const isLine = S.tool === "line";
    const w = { x: e.worldX, y: e.worldY };
    const el = MAKE.arrow({
      x: 0,
      y: 0,
      points: [
        { x: w.x, y: w.y },
        { x: w.x, y: w.y },
      ],
      route: "auto",
      kind: isLine ? "line" : "sync",
      routeMode: isLine ? "straight" : "orthogonal",
      startHead: "none",
      endHead: isLine ? "none" : "triangle",
    });
    if (startEl) {
      el.start = {
        elementId: startEl.id,
        anchor: "auto",
        normalizedAnchor: normalizedAnchorOf(startEl, w),
        isExact: false,
        isPrecise: false,
        snap: "edge",
      };
    }
    addElement(el);
    S.drag = { mode: "arrow", id: el.id, startEl: startEl?.id || null };
    (S as any).suggestedBinding = null;
    ctx.capturePointer(e.pointerId);
    notify();
  }

  onEdgeDown(
    e: CanvasPointerEvent,
    edgeEl: Element,
    ctx: ToolContext,
  ): boolean {
    const id = (edgeEl as HTMLElement).dataset.id!;
    const el = S.doc.elements[id];
    if (!el) return false;

    e.stopPropagation();
    if (S.tool !== "select") setTool("select");
    const w = { x: e.worldX, y: e.worldY };

    // Arrow label drag
    const labelG = (e.target as HTMLElement)?.closest?.("g[data-label]");
    if (el.type === "arrow" && labelG && !el.locked) {
      pushHistory("move label");
      const wasSelected = S.selection.has(el.id);
      S.selection = new Set([el.id]);
      S.drag = {
        mode: "label",
        id: el.id,
        moved: false,
        wasSelected,
      };
      ctx.capturePointer(e.pointerId);
      notify();
      return true;
    }

    // Arrow handles
    if (el.type === "arrow" && S.selection.has(el.id) && !el.locked) {
      const t = e.target as HTMLElement;
      const h = (t?.closest?.("[data-handle]") as HTMLElement | null)?.dataset
        .handle;
      if (h) {
        const [kind, a, b] = h.split(":");
        if (kind === "endpoint") {
          pushHistory("edit arrow");
          S.drag = { mode: "arrow-edit", id: el.id, pointIdx: Number(a) };
          (S as any).suggestedBinding = null;
          ctx.capturePointer(e.pointerId);
          notify();
          return true;
        }
        if (kind === "waypoint") {
          pushHistory("bend arrow");
          S.drag = {
            mode: "arrow-edit",
            id: el.id,
            pointIdx: Number(a),
            manual: true,
          };
          ctx.capturePointer(e.pointerId);
          notify();
          return true;
        }
        if (kind === "insert") {
          pushHistory("bend arrow");
          const idx = Number(a);
          const wpt = { x: w.x - el.x, y: w.y - el.y };
          if (el.route !== "manual") {
            const geom = arrowGeom(el, (id) => S.doc.elements[id], theme());
            const dp = geom.pts;
            const f = dp[0];
            const l = dp[dp.length - 1];
            el.points = [
              { x: f.x - el.x, y: f.y - el.y },
              wpt,
              { x: l.x - el.x, y: l.y - el.y },
            ];
            S.drag = {
              mode: "arrow-edit",
              id: el.id,
              pointIdx: 1,
              manual: true,
            };
          } else {
            el.points!.splice(idx + 1, 0, wpt);
            S.drag = {
              mode: "arrow-edit",
              id: el.id,
              pointIdx: idx + 1,
              manual: true,
            };
          }
          el.route = "manual";
          ctx.capturePointer(e.pointerId);
          notify();
          return true;
        }
        if (kind === "segment") {
          pushHistory("move arrow segment");
          const geom = arrowGeom(el, (id) => S.doc.elements[id], theme());
          S.drag = {
            mode: "arrow-segment",
            id: el.id,
            index: Number(a),
            axis: b,
            base: geom.pts,
          };
          ctx.capturePointer(e.pointerId);
          notify();
          return true;
        }
      }

      // Proximity fallback
      const pts = (el.points || []).map((p) => ({
        x: el.x + p.x,
        y: el.y + p.y,
      }));
      const z = S.camera.zoom;
      const hitIdx = pts.findIndex(
        (p) => Math.hypot((p.x - w.x) * z, (p.y - w.y) * z) < 10,
      );
      if (hitIdx >= 0) {
        pushHistory("edit arrow");
        S.drag = { mode: "arrow-edit", id: el.id, pointIdx: hitIdx };
        (S as any).suggestedBinding = null;
        ctx.capturePointer(e.pointerId);
        notify();
        return true;
      }
    }

    return false;
  }

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    const target = e.target as HTMLElement;
    const nodeEl = target?.closest?.(".node:not(.slide)") as HTMLElement | null;
    const startEl = nodeEl ? S.doc.elements[nodeEl.dataset.id!] : null;
    this.startArrow(e, ctx, startEl);
  }

  onPointerMove(e: CanvasPointerEvent): void {
    const d: any = S.drag;
    const w = { x: e.worldX, y: e.worldY };

    if (!d && (S.tool === "arrow" || S.tool === "line") && !e.buttons) {
      const sug = suggestedBinding(sortedElements(), w, null);
      const id = sug ? sug.el.id : null;
      if ((S as any).suggestedBinding !== id) {
        (S as any).suggestedBinding = id;
        scheduleNotify();
      }
      return;
    }

    if (!d) return;

    if (d.mode === "arrow") {
      const el = S.doc.elements[d.id];
      if (!el) return;
      el.points![el.points!.length - 1] = { x: w.x, y: w.y };
      d.endWorld = w;
      const sug = suggestedBinding(sortedElements(), w, el.id);
      (S as any).suggestedBinding = sug ? sug.el.id : null;
      scheduleNotify();
      return;
    }

    if (d.mode === "arrow-edit") {
      const el = S.doc.elements[d.id];
      if (!el) return;
      el.points![d.pointIdx] = { x: w.x - el.x, y: w.y - el.y };
      if (d.manual) el.route = "manual";
      const sug = suggestedBinding(sortedElements(), w, el.id);
      (S as any).suggestedBinding = sug ? sug.el.id : null;
      d.suggested = sug;
      scheduleNotify();
      return;
    }

    if (d.mode === "arrow-segment") {
      const el = S.doc.elements[d.id];
      if (!el || el.routeMode !== "orthogonal") return;
      const g = settings();
      const snap = (v: number) =>
        g.snapToGrid && !e.altKey ? Math.round(v / g.gridSize) * g.gridSize : v;
      const base: { x: number; y: number }[] = d.base;
      const pts = base.map((p) => ({ ...p }));
      let idx = d.index;
      if (idx === 0) {
        pts.unshift({ ...pts[0] });
        idx++;
      }
      if (idx + 1 === pts.length - 1) pts.push({ ...pts[pts.length - 1] });
      if (d.axis === "h") {
        const y = snap(w.y);
        pts[idx].y = y;
        pts[idx + 1].y = y;
      } else {
        const x = snap(w.x);
        pts[idx].x = x;
        pts[idx + 1].x = x;
      }
      el.points = pts.map((p) => ({ x: p.x - el.x, y: p.y - el.y }));
      el.route = "manual";
      scheduleNotify();
      return;
    }

    if (d.mode === "label") {
      const el = S.doc.elements[d.id];
      if (!el) return;
      d.moved = true;
      const geom = arrowGeom(el, (id) => S.doc.elements[id], theme());
      const { t } = projectOntoPolyline(geom.pts, w);
      (el as any).labelT = t;
      (el as any).labelRatio = t;
      delete (el as any).labelPoint;
      scheduleNotify();
      return;
    }
  }

  onPointerUp(): void {
    const d: any = S.drag;
    if (!d) return;

    if (d.mode === "arrow") {
      const el = S.doc.elements[d.id];
      if (el) {
        const p0 = el.points![0];
        const p1 = el.points![el.points!.length - 1];
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 8) {
          removeElements([el.id]);
          S.selection.clear();
        } else {
          if (!el.start) {
            const hit = nextFrameElement(
              sortedElements(),
              { x: p0.x, y: p0.y },
              el.id,
            );
            if (hit) {
              el.start = {
                elementId: hit.id,
                anchor: "auto",
                normalizedAnchor: normalizedAnchorOf(hit, { x: p0.x, y: p0.y }),
                isExact: false,
                isPrecise: false,
                snap: "edge",
              };
            }
          }
          const hit2 = nextFrameElement(
            sortedElements(),
            { x: p1.x, y: p1.y },
            el.id,
          );
          if (hit2) {
            el.end = {
              elementId: hit2.id,
              anchor: "auto",
              normalizedAnchor: normalizedAnchorOf(hit2, { x: p1.x, y: p1.y }),
              isExact: false,
              isPrecise: false,
              snap: "edge",
            };
          }
          const sl =
            (el.start?.elementId && S.doc.elements[el.start.elementId]?.frameId
              ? S.doc.elements[S.doc.elements[el.start.elementId].frameId!]
              : null) ||
            (el.end?.elementId && S.doc.elements[el.end.elementId]?.frameId
              ? S.doc.elements[S.doc.elements[el.end.elementId].frameId!]
              : null) ||
            slides().find((s) =>
              pointInElement((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, s),
            );
          if (sl) {
            el.frameId = sl.id;
          }
          S.selection = new Set([el.id]);
        }
      }
      (S as any).suggestedBinding = null;
      setTool("select");
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      return;
    }

    if (d.mode === "arrow-edit") {
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
            anchor: "auto",
            normalizedAnchor: sug.anchor,
            isExact: false,
            isPrecise: true,
            snap: "edge" as const,
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
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      return;
    }

    if (d.mode === "arrow-segment") {
      const el = S.doc.elements[d.id];
      if (el) {
        const abs = (el.points || []).map((p) => ({
          x: el.x + p.x,
          y: el.y + p.y,
        }));
        const clean = cleanupArrowPoints(abs);
        if (clean.length !== abs.length && clean.length >= 2) {
          el.points = clean.map((p) => ({ x: p.x - el.x, y: p.y - el.y }));
        }
        el.route = "manual";
        S.selection = new Set([el.id]);
      }
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      return;
    }

    if (d.mode === "label") {
      const editId = !d.moved && d.wasSelected ? d.id : null;
      S.selection = new Set([d.id]);
      S.drag = null;
      S.panning = false;
      notify();
      persist();
      if (editId) {
        beginEdit(editId);
      }
      return;
    }
  }

  onDoubleClick(e: CanvasPointerEvent): void {
    const edgeEl = (e.target as HTMLElement)?.closest?.(
      ".edges [data-id]",
    ) as HTMLElement | null;
    if (
      edgeEl &&
      !((e.target as HTMLElement)?.closest?.(".node") as HTMLElement | null)
    ) {
      const el = S.doc.elements[edgeEl.dataset.id!];
      if (el && el.type === "arrow" && !el.locked) {
        beginEdit(el.id);
      }
    }
  }

  getCursor(): string {
    return "crosshair";
  }
}

export const arrowTool = new ArrowToolController();
