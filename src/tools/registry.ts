import type { ToolController } from "./types";
import { panTool } from "./PanToolController";
import { laserTool } from "./LaserToolController";
import { eraserTool } from "./EraserToolController";
import { penTool } from "./PenToolController";
import { shapeTool } from "./ShapeToolController";
import { stickyTool } from "./StickyToolController";
import { textTool } from "./TextToolController";
import { arrowTool } from "./ArrowToolController";
import { selectTool } from "./SelectToolController";

const tools = new Map<string, ToolController>();

export function registerTool(controller: ToolController): void {
  tools.set(controller.id, controller);
}

export function getTool(id: string): ToolController | undefined {
  return tools.get(id);
}

export function getAllTools(): ToolController[] {
  return Array.from(tools.values());
}

// Auto-register built-in tools
registerTool(panTool);
registerTool(laserTool);
registerTool(eraserTool);
registerTool(penTool);
registerTool(shapeTool);
registerTool(stickyTool);
registerTool(textTool);
registerTool(arrowTool);
registerTool(selectTool);
