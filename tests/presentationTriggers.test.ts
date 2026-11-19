import { describe, test, expect, beforeEach } from "bun:test";
import { S, slides } from "../src/state/store";
import { addSlide, present, exitPresent } from "../src/state/actions";
import { useBoardStore } from "../src/state/boardStore";

describe("Presentation Trigger Constraints", () => {
  beforeEach(() => {
    exitPresent();
    useBoardStore.setState({
      doc: {
        schemaVersion: 1,
        id: "test",
        title: "Test",
        elements: {},
        assets: {},
      },
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

  test("slides list has elements for present action", () => {
    const s1 = addSlide("blank", { title: "Slide 1" });
    const s2 = addSlide("blank", { title: "Slide 2" });
    expect(slides().length).toBe(2);

    present(1);
    expect(S.present?.index).toBe(1);

    exitPresent();
  });
});
