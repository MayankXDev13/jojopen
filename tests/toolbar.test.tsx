import { describe, test, expect, beforeEach } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { Toolbar } from "../src/components/Chrome";
import { setTool } from "../src/state/actions";
import { S } from "../src/state/store";

describe("Toolbar: Active Tool Display", () => {
  beforeEach(() => {
    setTool("select");
  });

  test("shows Select as active and visible (no .more) by default", () => {
    const html = renderToStaticMarkup(React.createElement(Toolbar));
    // Select button should be active and not have 'more'
    expect(html).toContain('data-tool="select"');
    const selectMatch = html.match(/<button[^>]*data-tool="select"[^>]*>/);
    expect(selectMatch).not.toBeNull();
    const selectTag = selectMatch![0];
    expect(selectTag).toContain("is-active");
    expect(selectTag).not.toMatch(/class="[^"]*\bmore\b[^"]*"/);

    // Hand button should have 'more' and not 'is-active'
    const handMatch = html.match(/<button[^>]*data-tool="hand"[^>]*>/);
    expect(handMatch).not.toBeNull();
    const handTag = handMatch![0];
    expect(handTag).toContain("more");
    expect(handTag).not.toContain("is-active");
  });

  test("shows Hand as active and visible (no .more) when Hand tool is chosen", () => {
    setTool("hand");
    const html = renderToStaticMarkup(React.createElement(Toolbar));

    // Hand button should be active and not have 'more'
    const handMatch = html.match(/<button[^>]*data-tool="hand"[^>]*>/);
    expect(handMatch).not.toBeNull();
    const handTag = handMatch![0];
    expect(handTag).toContain("is-active");
    expect(handTag).not.toMatch(/class="[^"]*\bmore\b[^"]*"/);

    // Select button should now have 'more' and not 'is-active'
    const selectMatch = html.match(/<button[^>]*data-tool="select"[^>]*>/);
    expect(selectMatch).not.toBeNull();
    const selectTag = selectMatch![0];
    expect(selectTag).toContain("more");
    expect(selectTag).not.toContain("is-active");
  });

  test("shows Rectangle as active and visible (no .more) when Rectangle tool is chosen", () => {
    setTool("rectangle");
    const html = renderToStaticMarkup(React.createElement(Toolbar));

    const rectMatch = html.match(/<button[^>]*data-tool="rectangle"[^>]*>/);
    expect(rectMatch).not.toBeNull();
    const rectTag = rectMatch![0];
    expect(rectTag).toContain("is-active");
    expect(rectTag).not.toMatch(/class="[^"]*\bmore\b[^"]*"/);

    // Hand and Select should have 'more'
    const selectMatch = html.match(/<button[^>]*data-tool="select"[^>]*>/);
    expect(selectMatch![0]).toContain("more");
  });
});
