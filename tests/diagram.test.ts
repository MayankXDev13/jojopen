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

  test("compileDiagramDoc sets kind and dash appropriately on arrows", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");
    const doc = blankDoc();
    const diag = MAKE.diagram({ id: "diag-1", x: 100, y: 100 });
    doc.elements[diag.id] = diag;
    const dsl = `a --> b : "async call"`;
    const res = compileDiagramDoc(doc, "diag-1", dsl);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    const arrow = Object.values(doc.elements).find((e: any) => e.type === "arrow") as any;
    expect(arrow).toBeDefined();
    expect(arrow.kind).toBe("async");
    expect(arrow.dash).toBe("dashed");
  });

  test("single-connection edges retain exact center 0.5 anchor", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");
    const doc = blankDoc();
    const diag = MAKE.diagram({ id: "diag-single", x: 100, y: 100 });
    doc.elements[diag.id] = diag;
    const dsl = `direction down\na -> b`;
    const res = compileDiagramDoc(doc, "diag-single", dsl);
    expect(res.success).toBe(true);
    const arrow = Object.values(doc.elements).find((e: any) => e.type === "arrow") as any;
    expect(arrow).toBeDefined();
    expect(arrow.start.normalizedAnchor).toEqual({ x: 0.5, y: 1 });
    expect(arrow.end.normalizedAnchor).toEqual({ x: 0.5, y: 0 });
    expect(arrow.start.isPrecise).toBe(true);
    expect(arrow.start.isExact).toBe(true);
    expect(arrow.end.isPrecise).toBe(true);
    expect(arrow.end.isExact).toBe(true);
  });

  test("multi-outgoing and multi-incoming edges distribute across face without overlap", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");
    const doc = blankDoc();
    const diag = MAKE.diagram({ id: "diag-multi", x: 100, y: 100 });
    doc.elements[diag.id] = diag;
    const dsl = `direction down
root -> leftChild
root -> centerChild
root -> rightChild
leftChild -> sink
centerChild -> sink
rightChild -> sink`;
    const res = compileDiagramDoc(doc, "diag-multi", dsl);
    expect(res.success).toBe(true);

    const arrows = Object.values(doc.elements).filter((e: any) => e.type === "arrow") as any[];
    expect(arrows.length).toBe(6);

    // Outgoing edges from root
    const rootOutgoing = arrows.filter((a) => a.meta?.dslEdge?.startsWith("root->"));
    expect(rootOutgoing.length).toBe(3);
    const startXPositions = rootOutgoing.map((a) => a.start.normalizedAnchor.x).sort((x1, x2) => x1 - x2);
    // Should be distributed at 0.25, 0.5, 0.75
    expect(startXPositions[0]).toBeCloseTo(0.25, 2);
    expect(startXPositions[1]).toBeCloseTo(0.5, 2);
    expect(startXPositions[2]).toBeCloseTo(0.75, 2);

    // Incoming edges to sink
    const sinkIncoming = arrows.filter((a) => a.meta?.dslEdge?.includes("->sink"));
    expect(sinkIncoming.length).toBe(3);
    const endXPositions = sinkIncoming.map((a) => a.end.normalizedAnchor.x).sort((x1, x2) => x1 - x2);
    expect(endXPositions[0]).toBeCloseTo(0.25, 2);
    expect(endXPositions[1]).toBeCloseTo(0.5, 2);
    expect(endXPositions[2]).toBeCloseTo(0.75, 2);
  });

  test("compileDiagramDoc respects diagram.scale multiplier", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");
    const doc = blankDoc();
    const diag = MAKE.diagram({ id: "diag-scale", x: 100, y: 100 });
    diag.scale = 1.5;
    doc.elements[diag.id] = diag;
    const dsl = `direction right\na -> b`;
    const res = compileDiagramDoc(doc, "diag-scale", dsl);
    expect(res.success).toBe(true);

    const doc1 = blankDoc();
    const diag1 = MAKE.diagram({ id: "diag-scale1", x: 100, y: 100 });
    doc1.elements[diag1.id] = diag1;
    compileDiagramDoc(doc1, "diag-scale1", dsl);

    // 1.5x scaled diagram should have 1.5x width and height of 1x diagram
    expect(diag.width).toBe(Math.round(diag1.width * 1.5));
    expect(diag.height).toBe(Math.round(diag1.height * 1.5));

    const shapeA = Object.values(doc.elements).find((e: any) => e.meta?.dslKey === "a") as any;
    const shapeA1 = Object.values(doc1.elements).find((e: any) => e.meta?.dslKey === "a") as any;
    expect(shapeA.width).toBe(Math.round(shapeA1.width * 1.5));
    expect(shapeA.height).toBe(Math.round(shapeA1.height * 1.5));
  });

  test("scaleSelection scales diagram frame and all child elements proportionally", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");
    const { scaleSelection } = require("../src/state/actions");
    const { useBoardStore } = require("../src/state/boardStore");

    const doc = blankDoc();
    const diag = MAKE.diagram({ id: "diag-act", x: 100, y: 100 });
    doc.elements[diag.id] = diag;
    compileDiagramDoc(doc, "diag-act", `direction right\na -> b`);

    useBoardStore.setState({
      doc,
      selection: new Set(["diag-act"]),
    } as any);

    const initialDiagW = diag.width;
    const shapeA = Object.values(doc.elements).find((e: any) => e.meta?.dslKey === "a") as any;
    const initialShapeW = shapeA.width;
    const initialShapeRelX = shapeA.x - diag.x;

    // Scale to 2x
    scaleSelection(2);

    expect(diag.scale).toBe(2);
    expect(diag.width).toBe(Math.round(initialDiagW * 2));
    expect(shapeA.width).toBe(Math.round(initialShapeW * 2));
    expect(shapeA.x - diag.x).toBe(Math.round(initialShapeRelX * 2));

    // Scale back to 1x
    scaleSelection(1);
    expect(diag.scale).toBe(1);
    expect(diag.width).toBe(initialDiagW);
    expect(shapeA.width).toBe(initialShapeW);
    expect(shapeA.x - diag.x).toBe(initialShapeRelX);
  });

  test("removeEdgeFromDiagramDSL removes matching edge line cleanly", () => {
    const { removeEdgeFromDiagramDSL } = require("../src/lib/diagram");
    const dsl = `direction right
User -> CDN
CDN -> Gateway : forward
Gateway -> Service`;

    const updated = removeEdgeFromDiagramDSL(dsl, {
      fromKey: "cdn",
      toKey: "gateway",
      label: "forward",
    });

    expect(updated).not.toContain("CDN -> Gateway");
    expect(updated).toContain("User -> CDN");
    expect(updated).toContain("Gateway -> Service");
  });

  test("deleteSelection on diagram arrow removes element and updates diagram DSL", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");
    const { deleteSelection } = require("../src/state/actions");
    const { useBoardStore } = require("../src/state/boardStore");

    const doc = blankDoc();
    const diag = MAKE.diagram({
      id: "diag-del",
      x: 100,
      y: 100,
      dsl: `direction right\na -> b\nb -> c`,
    });
    doc.elements[diag.id] = diag;
    compileDiagramDoc(doc, "diag-del", diag.dsl);

    const arrows = Object.values(doc.elements).filter(
      (e: any) => e.type === "arrow",
    ) as any[];
    expect(arrows.length).toBe(2);

    const arrowToDelete = arrows.find(
      (a) => a.meta?.dslFrom === "a" && a.meta?.dslTo === "b",
    );
    expect(arrowToDelete).toBeDefined();

    useBoardStore.setState({
      doc,
      selection: new Set([arrowToDelete.id]),
    } as any);

    deleteSelection();

    // Arrow is removed from elements
    expect(doc.elements[arrowToDelete.id]).toBeUndefined();
    // Diagram DSL is updated so edge won't come back on re-tidy
    expect(diag.dsl).not.toContain("a -> b");
    expect(diag.dsl).toContain("b -> c");

    // Re-compiling diagram doesn't bring back the deleted arrow
    compileDiagramDoc(doc, "diag-del", diag.dsl);
    const remainingArrows = Object.values(doc.elements).filter(
      (e: any) => e.type === "arrow",
    );
    expect(remainingArrows.length).toBe(1);
  });

  test("diagram arrow routeMode, dash, and labelT are preserved across recompilation", () => {
    const { compileDiagramDoc } = require("../src/lib/diagram");
    const { MAKE, blankDoc } = require("../src/lib/model");

    const doc = blankDoc();
    const diag = MAKE.diagram({
      id: "diag-pres",
      x: 100,
      y: 100,
      dsl: `direction right\na -> b`,
    });
    doc.elements[diag.id] = diag;
    compileDiagramDoc(doc, "diag-pres", diag.dsl);

    const arrow = Object.values(doc.elements).find(
      (e: any) => e.type === "arrow",
    ) as any;
    expect(arrow).toBeDefined();

    // User customized route, dash, and dragged labelT
    arrow.routeMode = "curved";
    arrow.dash = "dashed";
    arrow.labelT = 0.75;

    // Re-run compilation (e.g. Tidy up or Clean It)
    compileDiagramDoc(doc, "diag-pres", diag.dsl);

    const arrowAfter = Object.values(doc.elements).find(
      (e: any) => e.type === "arrow",
    ) as any;
    expect(arrowAfter.routeMode).toBe("curved");
    expect(arrowAfter.dash).toBe("dashed");
    expect(arrowAfter.labelT).toBe(0.75);
  });

  test("nextFrameElement excludes diagram frames from capturing arrow bindings or frames", () => {
    const { nextFrameElement, S } = require("../src/state/store");
    const { MAKE, blankDoc } = require("../src/lib/model");

    const doc = blankDoc();
    const diag = MAKE.diagram({
      id: "diag-frame-test",
      x: 100,
      y: 100,
      width: 500,
      height: 300,
      dsl: `direction right\na -> b`,
    });
    doc.elements[diag.id] = diag;

    S.doc = doc;

    // Querying inside the diagram bounding box (e.g. (200, 200)) should NOT return the diagram as a frame
    const hit = nextFrameElement({ x: 200, y: 200 });
    expect(hit).toBeNull();
  });
});

