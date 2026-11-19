import { describe, test, expect, beforeEach } from "bun:test";
import { shapeEncloses } from "../src/lib/geometry";
import { MAKE, BoardElement } from "../src/lib/model";
import { S, elements } from "../src/state/store";
import { syncEnclosedShapes } from "../src/state/actions";
import { selectTool } from "../src/tools/SelectToolController";

describe("Shape Nesting & Auto No-Fill", () => {
  beforeEach(() => {
    S.doc.elements = {};
    S.selection.clear();
  });

  test("shapeEncloses detects when outer shape contains inner shape", () => {
    const outer = MAKE.shape({
      id: "outer",
      x: 100,
      y: 100,
      width: 300,
      height: 200,
    });
    const inner = MAKE.shape({
      id: "inner",
      x: 150,
      y: 130,
      width: 100,
      height: 80,
    });
    const outside = MAKE.shape({
      id: "outside",
      x: 500,
      y: 500,
      width: 100,
      height: 80,
    });

    expect(shapeEncloses(outer, inner)).toBe(true);
    expect(shapeEncloses(inner, outer)).toBe(false);
    expect(shapeEncloses(outer, outside)).toBe(false);
  });

  test("syncEnclosedShapes gives outer shape noFill = true and puts it behind inner", () => {
    // Inner was created first
    const inner = MAKE.shape({
      id: "inner",
      x: 150,
      y: 130,
      width: 100,
      height: 80,
      noFill: false,
      index: 1,
    });
    S.doc.elements[inner.id] = inner;

    // Outer is created later on top of inner
    const outer = MAKE.shape({
      id: "outer",
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      noFill: false,
      index: 2,
    });
    S.doc.elements[outer.id] = outer;

    syncEnclosedShapes(outer);

    expect(outer.noFill).toBe(true);
    expect(inner.noFill).toBe(false);
    // Outer should be re-indexed behind inner
    expect(outer.index).toBeLessThan(inner.index);
  });

  test("syncEnclosedShapes sets existing parent to noFill = true when inner is created inside it", () => {
    // Outer exists on canvas
    const outer = MAKE.shape({
      id: "outer",
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      noFill: false,
      index: 1,
    });
    S.doc.elements[outer.id] = outer;

    // Inner is created inside it
    const inner = MAKE.shape({
      id: "inner",
      x: 150,
      y: 130,
      width: 100,
      height: 80,
      noFill: false,
      index: 2,
    });
    S.doc.elements[inner.id] = inner;

    syncEnclosedShapes(inner);

    expect(outer.noFill).toBe(true);
    expect(inner.noFill).toBe(false);
  });
});

describe("Marquee Selection: Enclosure vs Intersection", () => {
  beforeEach(() => {
    S.doc.elements = {};
    S.selection.clear();
    S.camera = { x: 0, y: 0, zoom: 1 };
  });

  test("marquee selects only fully enclosed shape when another shape merely intersects", () => {
    // Orange shape: (x: 200, y: 100, w: 100, h: 50) -> bounds: 200..300, 100..150
    const orange = MAKE.shape({
      id: "orange",
      x: 200,
      y: 100,
      width: 100,
      height: 50,
    });
    // Blue shape: (x: 180, y: 140, w: 100, h: 50) -> bounds: 180..280, 140..190 (overlaps orange's bottom-left)
    const blue = MAKE.shape({
      id: "blue",
      x: 180,
      y: 140,
      width: 100,
      height: 50,
    });

    S.doc.elements[orange.id] = orange;
    S.doc.elements[blue.id] = blue;

    // User drags marquee around orange: x: 195..310, y: 90..160
    // This marquee completely encloses orange (200..300, 100..150).
    // But it intersects blue (blue's top-right corner is at 280, 140, inside the marquee, while blue's bottom is at 190, outside).
    S.marquee = {
      x0: 195,
      y0: 90,
      x1: 310,
      y1: 160,
      additive: false,
    };

    const mockCtx: any = {
      container: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 1000,
          height: 1000,
        }),
      },
      toWorld: (x: number, y: number) => ({ x, y }),
    };

    selectTool.finishMarquee(mockCtx);

    // Only orange should be selected, NOT blue!
    expect(S.selection.has("orange")).toBe(true);
    expect(S.selection.has("blue")).toBe(false);
    expect(S.selection.size).toBe(1);
  });

  test("marquee falls back to intersecting shapes if nothing is fully enclosed", () => {
    const box = MAKE.shape({
      id: "box",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    });
    S.doc.elements[box.id] = box;

    // Marquee touches corner of box, but doesn't fully enclose it
    S.marquee = {
      x0: 50,
      y0: 50,
      x1: 150,
      y1: 150,
      additive: false,
    };

    const mockCtx: any = {
      container: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 1000,
          height: 1000,
        }),
      },
      toWorld: (x: number, y: number) => ({ x, y }),
    };

    selectTool.finishMarquee(mockCtx);

    // Falls back to selecting intersecting box
    expect(S.selection.has("box")).toBe(true);
    expect(S.selection.size).toBe(1);
  });
});
