import { describe, test, expect } from "bun:test";
import fs from "fs";
import path from "path";

describe("Canvas Stacking Context", () => {
  test("ensures .canvas has z-index and isolation in app.css", () => {
    const appCss = fs.readFileSync(
      path.join(__dirname, "../src/styles/app.css"),
      "utf-8"
    );
    const canvasRuleMatch = appCss.match(/\.canvas\s*\{([^}]+)\}/);
    expect(canvasRuleMatch).not.toBeNull();
    const rules = canvasRuleMatch![1];
    expect(rules).toMatch(/z-index:\s*1/);
    expect(rules).toMatch(/isolation:\s*isolate/);
  });

  test("ensures .canvas has z-index and isolation in newui.css", () => {
    const newuiCss = fs.readFileSync(
      path.join(__dirname, "../src/styles/newui.css"),
      "utf-8"
    );
    const canvasRuleMatch = newuiCss.match(/\.canvas\s*\{([^}]+)\}/);
    expect(canvasRuleMatch).not.toBeNull();
    const rules = canvasRuleMatch![1];
    expect(rules).toMatch(/z-index:\s*1/);
    expect(rules).toMatch(/isolation:\s*isolate/);
  });
});
