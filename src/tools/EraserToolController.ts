import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { distToElement } from "../lib/geometry";
import {
  S,
  notify,
  persist,
  pushHistory,
  removeElements,
  scheduleNotify,
  sortedElements,
} from "../state/store";

export class EraserToolController implements ToolController {
  readonly id = "eraser";

  eraseAt(
    clientX: number,
    clientY: number,
    toWorld: (x: number, y: number) => { x: number; y: number },
  ): void {
    const w = toWorld(clientX, clientY);
    const base = 6 / S.camera.zoom;
    const hit = sortedElements()
      .reverse()
      .find((x) => {
        if (x.locked) return false;
        const tol =
          x.type === "freehand" || x.type === "arrow"
            ? base + (x.strokeWidth || 2)
            : base;
        return distToElement(w, x) <= tol;
      });

    if (hit) {
      pushHistory("erase");
      const ids = [hit.id];
      if (hit.type === "slide") {
        for (const c of sortedElements().filter((y) => y.frameId === hit.id))
          ids.push(c.id);
      }
      // Detach bound text link (legacy boards may still carry one).
      if (
        hit.type === "text" &&
        (hit as any).boundId &&
        S.doc.elements[(hit as any).boundId]
      ) {
        const c = S.doc.elements[(hit as any).boundId];
        if (c.meta) delete c.meta.boundTextId;
      }
      removeElements(ids);
      S.selection.delete(hit.id);
      scheduleNotify();
    }
  }

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    pushHistory("erase");
    if (S.tool !== "eraser" && (e.ctrlKey || e.metaKey)) {
      S.drag = { mode: "erase-temp", prevTool: S.tool };
    } else {
      S.drag = { mode: "erase" };
    }
    this.eraseAt(e.clientX, e.clientY, ctx.toWorld);
    ctx.capturePointer(e.pointerId);
  }

  onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    if (d && (d.mode === "erase" || d.mode === "erase-temp")) {
      this.eraseAt(e.clientX, e.clientY, ctx.toWorld);
    }
  }

  onPointerUp(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    if (d && (d.mode === "erase" || d.mode === "erase-temp")) {
      this.eraseAt(e.clientX, e.clientY, ctx.toWorld);
      S.drag = null;
      S.panning = false;
      notify();
      persist();
    }
  }

  getCursor(): string {
    return "crosshair";
  }
}

export const eraserTool = new EraserToolController();
