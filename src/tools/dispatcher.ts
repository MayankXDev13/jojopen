import type React from 'react';
import type { CanvasPointerEvent, ToolContext, ToolController } from './types';
import { getTool } from './registry';
import { S } from '../state/store';

export function createCanvasPointerEvent(
  e: React.PointerEvent | PointerEvent,
  toWorld: (clientX: number, clientY: number) => { x: number; y: number }
): CanvasPointerEvent {
  const clientX = e.clientX;
  const clientY = e.clientY;
  const w = toWorld(clientX, clientY);

  return {
    nativeEvent: e,
    clientX,
    clientY,
    worldX: w.x,
    worldY: w.y,
    button: e.button,
    buttons: e.buttons,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    pressure: (e as any).pressure,
    pointerId: e.pointerId,
    target: (e.target as Element) || null,
    preventDefault: () => e.preventDefault?.(),
    stopPropagation: () => e.stopPropagation?.(),
  };
}

export function resolveActiveTool(
  e?: CanvasPointerEvent
): ToolController | undefined {
  const d: any = S.drag;
  if (d) {
    if (d.mode === 'pan') return getTool('pan');
    if (d.mode === 'laser') return getTool('laser');
    if (d.mode === 'erase' || d.mode === 'erase-temp') return getTool('eraser');
    if (d.mode === 'ink') return getTool('pen');
    if (d.mode === 'create') return getTool('shape');
    if (d.mode === 'arrow' || d.mode === 'arrow-edit' || d.mode === 'arrow-segment' || d.mode === 'label') return getTool('arrow');
    if (d.mode === 'text') return getTool('text');
    if (d.mode === 'box' || d.mode === 'move' || d.mode === 'resize') return getTool('select');
  }

  if (e) {
    if (S.space || S.tool === 'hand' || e.button === 1) return getTool('pan');
    if (S.tool === 'eraser' || ((e.ctrlKey || e.metaKey) && (S.tool === 'pen' || S.tool === 'select'))) {
      return getTool('eraser');
    }
  } else {
    if (S.space || S.tool === 'hand') return getTool('pan');
    if (S.tool === 'eraser') return getTool('eraser');
  }

  const tool = S.tool;
  if (['rectangle', 'ellipse', 'diamond', 'cylinder', 'frame'].includes(tool)) {
    return getTool('shape');
  }
  if (tool === 'line') return getTool('arrow');

  return getTool(tool) || getTool('select');
}
