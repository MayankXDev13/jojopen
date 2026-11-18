import type { CanvasPointerEvent, ToolController } from './types';
import { MAKE } from '../lib/model';
import { S, addElement, notify, pushHistory } from '../state/store';
import { beginEdit, setTool } from '../state/actions';

export class StickyToolController implements ToolController {
  readonly id = 'sticky';

  createStickyAt(w: { x: number; y: number }): void {
    pushHistory('add sticky');
    const el = MAKE.sticky({
      x: Math.round(w.x - 100),
      y: Math.round(w.y - 100),
      width: 200,
      height: 200,
      text: '',
    });
    addElement(el);
    S.selection = new Set([el.id]);
    notify();
    beginEdit(el.id);
    setTool('select');
  }

  onPointerDown(e: CanvasPointerEvent): void {
    e.preventDefault();
    this.createStickyAt({ x: e.worldX, y: e.worldY });
  }

  onPointerMove(): void {}
  onPointerUp(): void {}

  getCursor(): string {
    return 'crosshair';
  }
}

export const stickyTool = new StickyToolController();
