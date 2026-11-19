import { describe, test, expect, beforeEach } from "bun:test";
import { S } from "../src/state/store";
import { selectTool } from "../src/tools/SelectToolController";
import type { CanvasPointerEvent, ToolContext } from "../src/tools/types";
import type { BoardElement } from "../src/lib/model";

function mockCtx(): ToolContext {
  return {
    container: null,
    toWorld: (cx, cy) => ({ x: cx, y: cy }),
    capturePointer: () => {},
  };
}

function mockEvent(partial: Partial<CanvasPointerEvent>): CanvasPointerEvent {
  return {
    nativeEvent: {} as any,
    clientX: 0,
    clientY: 0,
    worldX: 0,
    worldY: 0,
    button: 0,
    buttons: 1,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    pressure: 0.5,
    pointerId: 1,
    target: null,
    preventDefault: () => {},
    stopPropagation: () => {},
    ...partial,
  };
}

describe("SelectTool: Alt-drag Duplicate", () => {
  beforeEach(() => {
    S.doc = {
      id: "doc-1",
      name: "Test Board",
      settings: {
        gridSize: 16,
        snapToGrid: true,
        background: "dots",
        theme: "light",
        rough: false,
      },
      elements: {},
      files: {},
    };
    S.selection = new Set();
    S.history = [];
    S.drag = null;
    S.camera = { x: 0, y: 0, zoom: 1 };
  });

  test("Normal drag moves the original element without creating duplicates", () => {
    const el: BoardElement = {
      id: "box-1",
      type: "shape",
      shape: "box",
      version: 1,
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      index: 1,
    };
    S.doc.elements["box-1"] = el;
    S.selection = new Set(["box-1"]);

    const ctx = mockCtx();
    selectTool.startMove(mockEvent({ clientX: 100, clientY: 100 }), ctx);

    // Drag 32px right and 32px down without Alt
    selectTool.onPointerMove(
      mockEvent({ clientX: 132, clientY: 132, altKey: false }),
      ctx,
    );
    selectTool.onPointerUp(
      mockEvent({ clientX: 132, clientY: 132, altKey: false }),
      ctx,
    );

    expect(Object.keys(S.doc.elements)).toEqual(["box-1"]);
    expect(S.doc.elements["box-1"].x).toBe(132);
    expect(S.doc.elements["box-1"].y).toBe(132);
    expect([...S.selection]).toEqual(["box-1"]);
  });

  test("Alt-drag duplicates the element: original remains in place, clone is placed at dragged position", () => {
    const el: BoardElement = {
      id: "box-1",
      type: "shape",
      shape: "box",
      version: 1,
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      index: 1,
    };
    S.doc.elements["box-1"] = el;
    S.selection = new Set(["box-1"]);

    const ctx = mockCtx();
    selectTool.startMove(
      mockEvent({ clientX: 100, clientY: 100, altKey: true }),
      ctx,
    );

    // Drag 48px right and 32px down with Alt
    selectTool.onPointerMove(
      mockEvent({ clientX: 148, clientY: 132, altKey: true }),
      ctx,
    );
    selectTool.onPointerUp(
      mockEvent({ clientX: 148, clientY: 132, altKey: true }),
      ctx,
    );

    const elementIds = Object.keys(S.doc.elements);
    expect(elementIds.length).toBe(2);
    expect(elementIds).toContain("box-1");

    // Original element stayed in place
    expect(S.doc.elements["box-1"].x).toBe(100);
    expect(S.doc.elements["box-1"].y).toBe(100);

    // Cloned element exists and moved to new position (snapped to 16px grid)
    const cloneId = elementIds.find((id) => id !== "box-1")!;
    const clone = S.doc.elements[cloneId];
    expect(clone).toBeDefined();
    expect(clone.shape).toBe("box");
    expect(clone.x).toBe(148);
    expect(clone.y).toBe(132);

    // Selection moved to the new clone
    expect([...S.selection]).toEqual([cloneId]);
  });

  test("Toggling Alt off mid-drag discards clone and reverts to moving the original", () => {
    const el: BoardElement = {
      id: "box-1",
      type: "shape",
      shape: "box",
      version: 1,
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      index: 1,
    };
    S.doc.elements["box-1"] = el;
    S.selection = new Set(["box-1"]);

    const ctx = mockCtx();
    selectTool.startMove(mockEvent({ clientX: 100, clientY: 100 }), ctx);

    // Start dragging with Alt
    selectTool.onPointerMove(
      mockEvent({ clientX: 148, clientY: 132, altKey: true }),
      ctx,
    );
    expect(Object.keys(S.doc.elements).length).toBe(2);

    // Release Alt mid-drag
    selectTool.onPointerMove(
      mockEvent({ clientX: 164, clientY: 148, altKey: false }),
      ctx,
    );
    // Clone is discarded, only box-1 remains
    expect(Object.keys(S.doc.elements)).toEqual(["box-1"]);
    expect([...S.selection]).toEqual(["box-1"]);

    selectTool.onPointerUp(
      mockEvent({ clientX: 164, clientY: 148, altKey: false }),
      ctx,
    );
    expect(Object.keys(S.doc.elements)).toEqual(["box-1"]);
    expect(S.doc.elements["box-1"].x).toBe(164);
    expect(S.doc.elements["box-1"].y).toBe(148);
  });
});
