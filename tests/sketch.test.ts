import { describe, expect, it } from "bun:test";
import {
  cylinderSecondaryPath,
  getRoughFillPath,
  getRoughPaths,
  normalizePath,
  roughnessForStyle,
  seedFromId,
  shapePath,
} from "../src/lib/sketch";

describe("RoughJS Sketch Engine", () => {
  it("computes deterministic FNV-1a seeds for element IDs", () => {
    const seed1 = seedFromId("node-123");
    const seed2 = seedFromId("node-123");
    const seed3 = seedFromId("node-456");

    expect(seed1).toBe(seed2);
    expect(seed1).toBeGreaterThan(0);
    expect(seed1).not.toBe(seed3);
  });

  it("maps styles to proper roughness values", () => {
    expect(roughnessForStyle("clean")).toBe(0);
    expect(roughnessForStyle("chalkboard")).toBe(1.1);
    expect(roughnessForStyle("sketch")).toBe(1.7);
    expect(roughnessForStyle(undefined)).toBe(1.7);
  });

  it("generates geometric shape paths for all standard shapes", () => {
    const rect = shapePath("rectangle", 120, 80);
    expect(rect).toBe("M0 0 H120 V80 H0 Z");

    const diamond = shapePath("diamond", 100, 100);
    expect(diamond).toContain("L100 50 L50 100 L0 50 Z");

    const ellipse = shapePath("ellipse", 80, 60);
    expect(ellipse).toContain("A40 30 0 1 1");

    const cylinder = shapePath("cylinder", 90, 90);
    expect(cylinder).toContain("C0");

    const sec = cylinderSecondaryPath("cylinder", 90, 90);
    expect(sec).not.toBeNull();
    expect(sec).toContain("M0");

    const doc = shapePath("document", 100, 120);
    expect(doc).toContain("M0 0 H100");

    const person = shapePath("person", 60, 100);
    expect(person).toContain("A50 50 0 0 1");
  });

  it("normalizes curved path commands into line approximations", () => {
    const curvedPath = "M0 0 Q 50 50 100 0 C 100 50 150 50 150 0 Z";
    const normalized = normalizePath(curvedPath);

    expect(normalized).toContain("M0.00 0.00");
    expect(normalized).toContain("L");
    expect(normalized).toContain("Z");
    expect(normalized).not.toContain("Q");
    expect(normalized).not.toContain("C");
  });

  it("generates multi-stroke sketchy paths and caches the results", () => {
    const pathD = "M0 0 H120 V80 H0 Z";
    const paths = getRoughPaths("shape-1", pathD, {
      stroke: "#10b981",
      strokeWidth: 2,
      roughness: 1.7,
    });

    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].d).toBeDefined();
    expect(paths[0].stroke).toBe("#10b981");

    // Second call should return identical cached result
    const cachedPaths = getRoughPaths("shape-1", pathD, {
      stroke: "#10b981",
      strokeWidth: 2,
      roughness: 1.7,
    });
    expect(cachedPaths).toBe(paths);
  });

  it("generates organic fill paths for sketch mode", () => {
    const pathD = "M0 0 H120 V80 H0 Z";
    const fillPath = getRoughFillPath(
      "shape-1",
      pathD,
      seedFromId("shape-1"),
      1.7,
    );

    expect(fillPath).toBeDefined();
    expect(typeof fillPath).toBe("string");
    expect(fillPath.length).toBeGreaterThan(0);
  });
});
