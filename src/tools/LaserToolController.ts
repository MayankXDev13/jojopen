import type { CanvasPointerEvent, ToolContext, ToolController } from "./types";
import { S, notify } from "../state/store";

export class LaserToolController implements ToolController {
  readonly id = "laser";

  private canvas: HTMLCanvasElement | null = null;
  private points: { x: number; y: number; t: number; life: number }[] = [];
  private raf: number | null = null;
  private timer: number | undefined = undefined;
  private hover: { x: number; y: number } | null = null;

  attachCanvas(c: HTMLCanvasElement | null): void {
    this.canvas = c;
  }

  private draw = (): void => {
    const c = this.canvas;
    if (!c) {
      this.raf = null;
      return;
    }
    const ctx = c.getContext("2d")!;
    const dpr = devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    const pts = this.points;
    const held = (S.drag as any)?.mode === "laser";

    for (let i = pts.length - 1; i >= 0; i--) {
      if (held) pts[i].t = now;
      else if (now - pts[i].t > pts[i].life) pts.splice(i, 1);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
      ctx.fillStyle = "rgba(240,70,70,.9)";
      ctx.fill();
    } else if (!held && this.hover) {
      const p = this.hover;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,70,70,.9)";
      ctx.fill();
    }
    this.raf = pts.length ? requestAnimationFrame(this.draw) : null;
  };

  private ensure(): boolean {
    const c = this.canvas;
    if (!c) return false;
    const dpr = devicePixelRatio;
    if (c.width !== innerWidth * dpr) {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      c.style.width = `${innerWidth}px`;
      c.style.height = `${innerHeight}px`;
    }
    return true;
  }

  clear(): void {
    this.points = [];
    this.hover = null;
    const c = this.canvas;
    if (c) {
      const dpr = devicePixelRatio;
      c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.getContext("2d")?.clearRect(0, 0, innerWidth, innerHeight);
    }
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    clearTimeout(this.timer);
  }

  addPoint(x: number, y: number): void {
    if (!this.ensure()) return;
    const c = this.canvas!;
    this.points.push({ x, y, t: performance.now(), life: 650 });
    if (this.points.length > 2000) this.points.shift();
    if (!this.raf) this.raf = requestAnimationFrame(this.draw);
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (!this.points.length) {
        c.getContext("2d")?.clearRect(0, 0, innerWidth, innerHeight);
        this.raf = null;
      }
    }, 900);
  }

  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return;
    S.drag = { mode: "laser" };
    this.addPoint(e.clientX, e.clientY);
    ctx.capturePointer(e.pointerId);
    notify();
  }

  onPointerMove(e: CanvasPointerEvent): void {
    const d: any = S.drag;
    if (d && d.mode === "laser") {
      if (e.buttons) this.addPoint(e.clientX, e.clientY);
      return;
    }
    if (S.tool === "laser" && !S.drag) {
      this.hover = { x: e.clientX, y: e.clientY };
      if (this.ensure() && !this.raf) {
        this.raf = requestAnimationFrame(this.draw);
      }
    }
  }

  onPointerUp(): void {
    const d: any = S.drag;
    if (d && d.mode === "laser") {
      S.drag = null;
    }
    S.panning = false;
    notify();
  }

  getCursor(): string {
    return "none";
  }
}

export const laserTool = new LaserToolController();
