import { describe, test, expect, beforeEach } from "bun:test";
import {
  S,
  slideBuildStages,
  slideHiddenElements,
  slideStepCount,
  slides,
} from "../src/state/store";
import { addSlide, present, exitPresent } from "../src/state/actions";
import { useBoardStore } from "../src/state/boardStore";

describe("Presentation Trigger Constraints", () => {
  beforeEach(() => {
    exitPresent();
    const doc = {
      schemaVersion: 1,
      id: "test",
      name: "Test",
      elements: {},
      assets: {},
      files: {},
      settings: {
        theme: "dark",
        style: "sketch",
        palette: "clean",
        handFont: "excalifont",
        showGrid: true,
        gridSize: 20,
      },
    };
    S.doc = doc as any;
    useBoardStore.setState({
      doc,
      selection: new Set(),
      present: null,
    } as any);
  });

  test("present() enters presentation mode with fullscreen state", () => {
    addSlide("blank", { title: "Slide 1" });
    expect(S.present).toBeNull();

    present(0);
    expect(S.present).not.toBeNull();
    expect(S.present?.index).toBe(0);
    expect(S.present?.chrome).toBe(true);

    exitPresent();
    expect(S.present).toBeNull();
  });

  test("slideBuildStages groups diagram elements and slideStepCount matches stages", () => {
    const s = addSlide("diagram-bullets", {
      title: "How it works",
      texts: [
        "How it works",
        "• Reads hit the cache first\n• Misses fall back to the database",
      ],
      diagram: "Client -> API -> DB",
    });

    const stages = slideBuildStages(S.doc, s);
    // Base stage: Title header text, Stage 1: Bullets, Stage 2: Diagram group
    expect(stages.length).toBe(3);

    // Diagram stage contains all diagram child shapes and arrows together
    const elements = Object.values(S.doc.elements);
    const diagEl = elements.find((e) => e.type === "diagram" && e.frameId === s.id)!;
    const diagStage = stages.find((stg) => stg.includes(diagEl.id))!;
    expect(diagStage).toBeDefined();
    expect(diagStage).toContain(diagEl.id);

    const childShapes = elements.filter(
      (e) => e.type === "shape" && e.frameId === diagEl.id,
    );
    expect(childShapes.length).toBeGreaterThan(0);
    childShapes.forEach((cs) => expect(diagStage).toContain(cs.id));

    // Steps count is transitions between stages (2 steps)
    const stepCount = slideStepCount(S.doc, s);
    expect(stepCount).toBe(2);
  });

  test("slideHiddenElements hides arrows when their connected nodes are hidden", () => {
    const s = addSlide("diagram-bullets", {
      title: "How it works",
      diagram: "Client -> API",
    });

    // At step 0, only base header is shown, bullets and diagram (API, Client, Arrow) are hidden
    const hiddenAt0 = slideHiddenElements(S.doc, s, 0);
    const elements = Object.values(S.doc.elements);
    const arrow = elements.find((e) => e.type === "arrow")!;
    expect(arrow).toBeDefined();
    // Since Client and API are hidden, arrow must also be hidden
    expect(hiddenAt0.has(arrow.id)).toBe(true);

    // At full step reveal, arrow and nodes are visible
    const stepCount = slideStepCount(S.doc, s);
    const hiddenAtEnd = slideHiddenElements(S.doc, s, stepCount);
    expect(hiddenAtEnd.has(arrow.id)).toBe(false);
  });
});

