import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { S, notify, scheduleNotify } from "../state/store";

export class PanToolController implements ToolController {
  readonly id = "pan";

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    S.drag = {
      mode: "pan",
      start: { x: e.clientX, y: e.clientY },
      cam: { ...S.camera },
    };
    S.panning = true;
    ctx.capturePointer(e.pointerId);
    notify();
  }

  onPointerMove(e: CanvasPointerEvent): void {
    const d: any = S.drag;
    if (d && d.mode === "pan") {
      S.camera.x = d.cam.x + (e.clientX - d.start.x);
      S.camera.y = d.cam.y + (e.clientY - d.start.y);
      scheduleNotify();
    }
  }

  onPointerUp(): void {
    const d: any = S.drag;
    if (d && d.mode === "pan") {
      S.drag = null;
    }
    S.panning = false;
    notify();
  }

  getCursor(): string {
    return S.panning ? "grabbing" : "grab";
  }
}

export const panTool = new PanToolController();
