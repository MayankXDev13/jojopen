import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { MAKE } from "../lib/model";
import {
  S,
  addElement,
  notify,
  persist,
  pushHistory,
  scheduleNotify,
  settings,
} from "../state/store";
import { setTool, syncEnclosedShapes } from "../state/actions";

export const SHAPE_TOOLS = [
  "rectangle",
  "ellipse",
  "diamond",
  "cylinder",
  "frame",
];

export class ShapeToolController implements ToolController {
  readonly id = "shape";

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    pushHistory("add " + S.tool);
    const kind = S.tool;
    const shape = kind === "frame" ? null : kind;
    const w = { x: e.worldX, y: e.worldY };
    const el = shape
      ? MAKE.shape({ x: w.x, y: w.y, width: 1, height: 1, shape, label: "" })
      : MAKE.container({ x: w.x, y: w.y, width: 1, height: 1, label: "Group" });

    addElement(el);
    S.selection = new Set([el.id]);
    S.drag = { mode: "create", id: el.id, start: w, toolKind: kind };
    ctx.capturePointer(e.pointerId);
    notify();
  }

  onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    if (!d || d.mode !== "create") return;
    const el = S.doc.elements[d.id];
    if (!el) return;

    const w = { x: e.worldX, y: e.worldY };
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
    el.width = ww;
    el.height = hh;
    scheduleNotify();
  }

  onPointerUp(): void {
    const d: any = S.drag;
    if (d && d.mode === "create") {
      const el = S.doc.elements[d.id];
      if (el) {
        if (el.width < 8 && el.height < 8) {
          if (d.toolKind === "frame") {
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
          if (!el.label) el.label = d.toolKind === "frame" ? "Group" : "";
        }
        el.width = Math.max(16, el.width);
        el.height = Math.max(16, el.height);
        if (el.type === "shape") {
          syncEnclosedShapes(el);
        }
        S.selection = new Set([el.id]);
      }
      setTool("select");
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

export const shapeTool = new ShapeToolController();
