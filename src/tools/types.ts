import type React from "react";

export interface CanvasPointerEvent {
  nativeEvent: PointerEvent | React.PointerEvent;
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  button: number;
  buttons: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  pressure?: number;
  pointerId: number;
  target: HTMLElement | SVGElement | Element | null;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface ToolContext {
  container: HTMLElement | null;
  toWorld: (clientX: number, clientY: number) => { x: number; y: number };
  capturePointer: (pointerId: number) => void;
  releasePointer?: (pointerId: number) => void;
}

export interface ToolController {
  readonly id: string;
  onPointerDown(e: CanvasPointerEvent, ctx: ToolContext): boolean | void;
  onPointerMove(e: CanvasPointerEvent, ctx: ToolContext): boolean | void;
  onPointerUp(e: CanvasPointerEvent, ctx: ToolContext): boolean | void;
  onPointerCancel?(e: CanvasPointerEvent, ctx: ToolContext): void;
  onDoubleClick?(e: CanvasPointerEvent, ctx: ToolContext): void;
  getCursor?(e: CanvasPointerEvent, ctx: ToolContext): string | undefined;
}
