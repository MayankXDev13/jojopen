import { describe, test, expect } from "bun:test";
import {
  nodePaint,
  shapeMarkup,
  diagramSVG,
  type DiagramEnv,
} from "../src/lib/diagram";
import { parseDSL } from "../src/lib/dsl";
import { THEME, ROLE_COLORS } from "../src/lib/palette";

const defaultEnv: DiagramEnv = {
  th: THEME.light,
  look: "light",
  clean: false,
  palette: true,
};

describe("Diagram: Node Paint Styling", () => {
  test("returns transparent fill and ink stroke when palette is disabled", () => {
    const node = {
      key: "n1",
      label: "Node",
      shape: "rounded",
      role: "actor",
      color: null,
      icon: null,
      link: null,
      group: null,
      order: 0,
      explicit: true,
    };
    const paint = nodePaint(node, { ...defaultEnv, palette: false });
    expect(paint.fill).toBe("transparent");
    expect(paint.stroke).toBe(THEME.light.ink);
    expect(paint.text).toBe(THEME.light.ink);
  });

  test("resolves custom hex colors with translucent fill", () => {
    const node = {
      key: "n1",
      label: "Node",
      shape: "rounded",
      role: null,
      color: "#3498db",
      icon: null,
      link: null,
      group: null,
      order: 0,
      explicit: true,
    };
    const paint = nodePaint(node, defaultEnv);
    expect(paint.fill).toBe("#3498db22");
    expect(paint.stroke).toBe("#3498db");
    expect(paint.text).toBe(THEME.light.ink);
  });

  test("resolves role colors correctly", () => {
    const node = {
      key: "n1",
      label: "Database",
      shape: "cylinder",
      role: "data",
      color: null,
      icon: null,
      link: null,
      group: null,
      order: 0,
      explicit: true,
    };
    const paint = nodePaint(node, defaultEnv);
    expect(paint).toEqual(ROLE_COLORS.light.data);
  });

  test("infers role from color name", () => {
    const node = {
      key: "n1",
      label: "Cache Store",
      shape: "rectangle",
      role: null,
      color: "orange", // Maps to cache
      icon: null,
      link: null,
      group: null,
      order: 0,
      explicit: true,
    };
    const paint = nodePaint(node, defaultEnv);
    expect(paint).toEqual(ROLE_COLORS.light.cache);
  });
});

describe("Diagram: Shape Markup Generation", () => {
  test("generates valid SVG elements for standard shapes", () => {
    const rect = shapeMarkup("rectangle", 120, 60, "#fff", "#000", "");
    expect(rect).toContain("<rect");
    expect(rect).toContain('rx="2"');

    const ellipse = shapeMarkup("ellipse", 100, 80, "#fff", "#000", "");
    expect(ellipse).toContain("<ellipse");
    expect(ellipse).toContain('cx="50"');
    expect(ellipse).toContain('cy="40"');

    const diamond = shapeMarkup("diamond", 80, 80, "#fff", "#000", "");
    expect(diamond).toContain("<path");
    expect(diamond).toContain('d="M40 1 L79 40 L40 79 L1 40 Z"');

    const cylinder = shapeMarkup("cylinder", 100, 100, "#fff", "#000", "");
    expect(cylinder).toContain("<ellipse");
    expect(cylinder).toContain("<path");

    const person = shapeMarkup("person", 80, 80, "#fff", "#000", "");
    expect(person).toContain("<path");
    expect(person).toContain('d="M40 1 H40 A39 39');

    const rounded = shapeMarkup("rounded", 100, 50, "#fff", "#000", "");
    expect(rounded).toContain("<rect");
    expect(rounded).toContain('rx="13"');
  });

  test("applies rough filter attribute when filter id is supplied", () => {
    const roughRect = shapeMarkup(
      "rectangle",
      100,
      50,
      "#fff",
      "#000",
      "url(#rough)",
    );
    expect(roughRect).toContain('filter="url(#rough)"');
  });
});

describe("Diagram: Full SVG Assembly", () => {
  test("diagramSVG generates complete SVG with defs, groups, and nodes", () => {
    const dsl = `
      group Services {
        api [rounded, "API Service"]
      }
    `;
    const parsed = parseDSL(dsl);
    const mockLayout = {
      width: 500,
      height: 400,
      nodes: {
        api: { x: 50, y: 50, w: 120, h: 60 },
      },
      groups: [
        { key: "Services", label: "Services", x: 30, y: 30, w: 200, h: 150 },
      ],
      edges: [],
    };

    const svg = diagramSVG(parsed, mockLayout as any, defaultEnv);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('viewBox="0 0 500 400"');
    expect(svg).toContain("Services");
    expect(svg).toContain("API Service");
  });
});
