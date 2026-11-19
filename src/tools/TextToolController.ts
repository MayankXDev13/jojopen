import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { MAKE } from "../lib/model";
import { TEXT_AUTOWRAP_THRESHOLD } from "../lib/textMeasure";
import { S, addElement, notify, persist, pushHistory } from "../state/store";
import { beginEdit, setTool } from "../state/actions";

export class TextToolController implements ToolController {
  readonly id = "text";

  createTextAt(
    w: { x: number; y: number },
    opts: { width?: number; autoSize?: boolean } = {},
  ): void {
    pushHistory("add text");
    const autoSize = opts.autoSize ?? true;
    const width = opts.width ?? 260;
    const el = MAKE.text({
      x: Math.round(w.x),
      y: Math.round(w.y - 14),
      width: Math.max(60, Math.round(width)),
      height: 32,
      text: "",
      originalText: "",
      autoSize,
      fontSize: 22,
      align: "left",
    });
    addElement(el);
    S.selection = new Set([el.id]);
    notify();
    beginEdit(el.id);
    setTool("select");
  }

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    e.preventDefault();
    S.drag = {
      mode: "text",
      start: { x: e.clientX, y: e.clientY },
      origin: { x: e.worldX, y: e.worldY },
    };
    ctx.capturePointer(e.pointerId);
  }

  onPointerMove(): void {}

  onPointerUp(e: CanvasPointerEvent, ctx: ToolContext): void {
    const d: any = S.drag;
    if (d && d.mode === "text") {
      const dragW = Math.abs(e.clientX - d.start.x);
      const origin = d.origin;
      S.drag = null;
      S.panning = false;
      if (dragW > TEXT_AUTOWRAP_THRESHOLD) {
        const cur = ctx.toWorld(e.clientX, e.clientY);
        const width = Math.max(60, Math.abs(cur.x - origin.x));
        e.preventDefault();
        this.createTextAt(
          { x: Math.min(origin.x, cur.x), y: origin.y },
          { width, autoSize: false },
        );
      } else {
        e.preventDefault();
        this.createTextAt(origin, { autoSize: true });
      }
      notify();
      persist();
    }
  }

  getCursor(): string {
    return "text";
  }
}

export const textTool = new TextToolController();
