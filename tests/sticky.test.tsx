import { describe, test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { NodeView } from "../src/components/NodeView";
import { MAKE } from "../src/lib/model";
import { colorFor } from "../src/state/store";
import { elementSVG } from "../src/lib/exportSvg";
import { THEME } from "../src/lib/palette";

describe("Sticky Note: Rendering & Geometry", () => {
  test("renders 200x200 sticky note with exact SVG dog-ear fold and top strip", () => {
    const el = MAKE.sticky({
      id: "test-sticky",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      text: "Hello Sticky",
    });

    const html = renderToStaticMarkup(React.createElement(NodeView, { el }));

    // Must be .node.sticky
    expect(html).toContain('class="node sticky"');
    // Must contain SVG with note paths
    expect(html).toContain('d="M0 0 H200 V174 L174 200 H0 Z"');
    expect(html).toContain('d="M0 0 H200 V24 H0 Z"');
    expect(html).toContain('fill="rgba(0,0,0,0.05)"');
    expect(html).toContain('d="M174 200 L200 174 L176 176 Z"');
    expect(html).toContain('fill="#c8ac3f"');
    expect(html).toContain('fill="#ebd46b"');

    // Label overlay styles
    expect(html).toContain("Hello Sticky");
    expect(html).toContain("18px 16px 16px");
    expect(html).toContain("font-size:19px");
    expect(html).toContain("line-height:1.3");
  });

  test("colorFor returns sticky palette colors for sticky notes", () => {
    const el = MAKE.sticky({
      id: "sticky-col",
      text: "database auth test",
    });
    const c = colorFor(el);
    expect(c.fill).toBe("#ebd46b");
    expect(c.stroke).toBe("#c8ac3f");
    expect(c.text).toBe("#2b2504");
  });

  test("elementSVG exports SVG with drop shadow and folded geometry", () => {
    const el = MAKE.sticky({
      id: "sticky-export",
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      text: "Export note",
    });

    const svg = elementSVG(el, {
      th: THEME.light,
      clean: false,
      colorFor: () => colorFor(el),
      files: {},
      slides: [],
      diagramFor: () => ({}) as any,
      arrowGeom: () => ({}) as any,
    });

    expect(svg).toContain("M50 50 H250 V224 L224 250 H50 Z");
    expect(svg).toContain("M50 50 H250 V74 H50 Z");
    expect(svg).toContain("M224 250 L250 224 L226 226 Z");
    expect(svg).toContain("Export note");
    expect(svg).toContain('font-size="19"');
  });
});
