import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { S, zoomAt, setZoom } from "../src/state/store";

describe("Camera Zoom Limits", () => {
  const origDoc = (globalThis as any).document;

  beforeEach(() => {
    (globalThis as any).document = {
      getElementById: (id: string) => {
        if (id === "canvas") {
          return {
            getBoundingClientRect: () => ({
              left: 0,
              top: 0,
              width: 1000,
              height: 800,
            }),
          };
        }
        return null;
      },
    };
    S.camera = { x: 0, y: 0, zoom: 1 };
  });

  afterEach(() => {
    if (origDoc !== undefined) {
      (globalThis as any).document = origDoc;
    } else {
      delete (globalThis as any).document;
    }
  });

  test("allows zoom up to 800% (zoom = 8)", () => {
    setZoom(8);
    expect(S.camera.zoom).toBe(8);
  });

  test("clamps zoom at 800% (zoom = 8) instead of 400% (zoom = 4)", () => {
    // Zooming in with a large factor
    zoomAt(500, 400, 10);
    expect(S.camera.zoom).toBe(8);

    // Zooming in further does not exceed 8
    zoomAt(500, 400, 1.5);
    expect(S.camera.zoom).toBe(8);
  });

  test("clamps minimum zoom at 8% (0.08)", () => {
    zoomAt(500, 400, 0.001);
    expect(S.camera.zoom).toBe(0.08);
  });
});
