import { describe, test, expect, beforeEach } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { Rail } from "../src/components/Chrome";
import { S } from "../src/state/store";

describe("Rail: Right Sidebar Component", () => {
  beforeEach(() => {
    S.zen = false;
    S.panel = "none";
    S.rec = null;
    S.doc.recordings = [{ id: "rec-1", name: "Rec 1", steps: 5, duration: 1000, ops: [] }];
  });

  test("renders 6 rail buttons with live parity classes and titles", () => {
    const html = renderToStaticMarkup(React.createElement(Rail));

    expect(html).toContain('class="rail cp-rail cp-panel collapsible cp-collapsible"');

    // 1. AI assistant
    expect(html).toContain('data-act="assistant"');
    expect(html).toContain('title="AI assistant (Ctrl+I)"');
    expect(html).toContain('aria-label="AI assistant"');
    expect(html).toContain("cp-aibtn");
    expect(html).toContain(">AI</button>");

    // 2. Sands of Time
    expect(html).toContain('data-act="sot"');
    expect(html).toContain('title="Sands of Time — 1 recording"');
    expect(html).toContain('aria-label="Sands of Time — 1 recording"');
    expect(html).toContain("cp-sotbtn");
    expect(html).toContain("has-saved");
    expect(html).toContain("cp-sotbadge");

    // 3. Slides
    expect(html).toContain('data-act="slides"');
    expect(html).toContain('title="Slides (Ctrl+Shift+S)"');
    expect(html).toContain('aria-label="Slides"');

    // 4. My boards
    expect(html).toContain('data-act="boards"');
    expect(html).toContain('title="My boards"');
    expect(html).toContain('aria-label="My boards"');

    // 5. Diagram code (more / collapsible secondary)
    expect(html).toContain('data-act="code"');
    expect(html).toContain('title="Diagram code (Ctrl+E)"');
    expect(html).toContain('aria-label="Diagram code"');

    // 6. Keyboard shortcuts (more / collapsible secondary)
    expect(html).toContain('data-act="shortcuts"');
    expect(html).toContain('title="Keyboard shortcuts (?)"');
    expect(html).toContain('aria-label="Keyboard shortcuts"');

    // Verify more buttons count
    const moreMatches = html.match(/class="[^"]*\bmore\b[^"]*"/g);
    expect(moreMatches?.length).toBe(2);
  });
});
