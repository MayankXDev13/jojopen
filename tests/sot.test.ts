import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { S } from "../src/state/store";
import { useBoardStore } from "../src/state/boardStore";
import {
  sotRecList,
  sotFmtMs,
  sotStepWord,
  sotStart,
  sotStop,
  recWatch,
  recFlush,
  sotOpenReplay,
  sotCloseReplay,
  sotReplayRec,
  sotSetIndex,
  sotPlayToggle,
  sotCycleSpeed,
  sotDelete,
  sotFrameUnion,
  sotFrameSVG,
  sotSceneFrom,
  sotResetForBoardSwitch,
  sotToggle,
} from "../src/state/sot";
import type { BoardElement } from "../src/lib/model";

describe("Sands of Time: Formatter & Helpers", () => {
  test("sotFmtMs formats durations correctly", () => {
    expect(sotFmtMs(0)).toBe("0s");
    expect(sotFmtMs(400)).toBe("0s");
    expect(sotFmtMs(1200)).toBe("1s");
    expect(sotFmtMs(45000)).toBe("45s");
    expect(sotFmtMs(60000)).toBe("1m");
    expect(sotFmtMs(65000)).toBe("1m 5s");
    expect(sotFmtMs(125000)).toBe("2m 5s");
  });

  test("sotStepWord handles singular and plural steps", () => {
    expect(sotStepWord(0)).toBe("0 steps");
    expect(sotStepWord(1)).toBe("1 step");
    expect(sotStepWord(2)).toBe("2 steps");
    expect(sotStepWord(42)).toBe("42 steps");
  });
});

describe("Sands of Time: Recording Lifecycle", () => {
  beforeEach(() => {
    S.doc = {
      id: "test-board",
      name: "Test Board",
      settings: {} as any,
      elements: {},
      files: {},
      recordings: [],
    };
    S.rec = null;
    S.sot = {
      listOpen: false,
      replay: null,
    };
  });

  afterEach(() => {
    if (S.rec?.timer) clearTimeout(S.rec.timer);
    if (S.sot.replay?.timer) clearInterval(S.sot.replay.timer);
  });

  test("sotStart initializes recording with a Start snapshot", () => {
    sotStart();
    expect(S.rec).not.toBeNull();
    expect(S.rec?.steps).toBe(0);
    expect(S.rec?.frames.length).toBe(1);
    expect(S.rec?.frames[0].label).toBe("Start");
    expect(S.sot.listOpen).toBe(false);
  });

  test("recFlush captures new frame when doc changes", () => {
    sotStart();
    const initialFrameCount = S.rec!.frames.length;

    // Simulate adding an element
    const el: BoardElement = {
      id: "rect-1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 80,
      height: 60,
    } as any;
    S.doc.elements[el.id] = el;
    S.rec!.pendingLabel = "Add Rectangle";

    recFlush();

    expect(S.rec!.frames.length).toBe(initialFrameCount + 1);
    expect(S.rec!.steps).toBe(1);
    expect(S.rec!.frames[1].label).toBe("Add Rectangle");
    expect(S.rec!.pendingLabel).toBe("");
  });

  test("recFlush ignores identical snapshots to avoid duplicate frames", () => {
    sotStart();
    recFlush(); // Doc didn't change
    expect(S.rec!.frames.length).toBe(1);
    expect(S.rec!.steps).toBe(0);
  });

  test("sotStop discards recording if no edits were made (<= 1 frame)", () => {
    sotStart();
    sotStop();
    expect(S.rec).toBeNull();
    expect(sotRecList().length).toBe(0);
  });

  test("sotStop saves recording into doc.recordings when frames exist", () => {
    sotStart();
    // Add an element
    S.doc.elements["el-1"] = {
      id: "el-1",
      type: "rectangle",
      x: 50,
      y: 50,
      width: 100,
      height: 80,
    } as any;
    S.rec!.pendingLabel = "Draw Box";
    recFlush();

    sotStop();

    expect(S.rec).toBeNull();
    const list = sotRecList();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe("Sands 1");
    expect(list[0].frames.length).toBe(2);
    expect(list[0].steps.length).toBe(1);
    expect(list[0].steps[0].label).toBe("Draw Box");
    expect(S.sot.listOpen).toBe(true);
  });

  test("sotToggle toggles start, stop, and card visibility", () => {
    // 1. Initial toggle -> starts recording
    sotToggle();
    expect(S.rec).not.toBeNull();

    // Add frame and toggle again -> stops recording and opens card
    S.doc.elements["el-1"] = {
      id: "el-1",
      type: "rectangle",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    } as any;
    recFlush();
    sotToggle();
    expect(S.rec).toBeNull();
    expect(S.sot.listOpen).toBe(true);

    // 2. Toggle again when recordings exist -> closes card
    sotToggle();
    expect(S.sot.listOpen).toBe(false);

    // 3. Toggle again -> opens card
    sotToggle();
    expect(S.sot.listOpen).toBe(true);
  });
});

describe("Sands of Time: Replay & Bounding Box Union", () => {
  beforeEach(() => {
    S.doc = {
      id: "test-board",
      name: "Test Board",
      settings: {} as any,
      elements: {},
      files: {},
      recordings: [],
    };
    S.sot = {
      listOpen: false,
      replay: null,
    };
  });

  afterEach(() => {
    if (S.sot.replay?.timer) clearInterval(S.sot.replay.timer);
  });

  test("sotFrameUnion calculates outer bounding box encompassing all frames", () => {
    const frame1Doc = {
      id: "test-board",
      elements: {
        a: {
          id: "a",
          type: "rectangle",
          x: 100,
          y: 100,
          width: 50,
          height: 50,
        },
      },
    };
    const frame2Doc = {
      id: "test-board",
      elements: {
        a: {
          id: "a",
          type: "rectangle",
          x: 100,
          y: 100,
          width: 50,
          height: 50,
        },
        b: {
          id: "b",
          type: "rectangle",
          x: 300,
          y: 400,
          width: 100,
          height: 50,
        },
      },
    };

    const rec: any = {
      id: "sot-1",
      frames: [
        { json: JSON.stringify(frame1Doc), at: 0 },
        { json: JSON.stringify(frame2Doc), at: 500 },
      ],
    };

    const union = sotFrameUnion(rec);
    expect(union.minX).toBe(100);
    expect(union.minY).toBe(100);
    expect(union.maxX).toBe(400); // 300 + 100
    expect(union.maxY).toBe(450); // 400 + 50
    expect(union.width).toBe(300);
    expect(union.height).toBe(350);
  });

  test("sotOpenReplay, sotSetIndex, and sotCycleSpeed", () => {
    const rec: any = {
      id: "sot-test-1",
      name: "Sands 1",
      frames: [
        { json: JSON.stringify({ elements: {} }), at: 0 },
        { json: JSON.stringify({ elements: {} }), at: 300 },
        { json: JSON.stringify({ elements: {} }), at: 600 },
      ],
      steps: [
        { label: "Step 1", at: 300 },
        { label: "Step 2", at: 600 },
      ],
      duration: 600,
    };
    S.doc.recordings = [rec];

    sotOpenReplay("sot-test-1");
    expect(S.sot.replay).not.toBeNull();
    expect(S.sot.replay?.id).toBe("sot-test-1");
    expect(S.sot.replay?.index).toBe(0);
    expect(S.sot.replay?.speed).toBe(1);

    // Scrub index
    sotSetIndex(2);
    expect(S.sot.replay?.index).toBe(2);

    // Clamps out of bounds index
    sotSetIndex(99);
    expect(S.sot.replay?.index).toBe(2);
    sotSetIndex(-5);
    expect(S.sot.replay?.index).toBe(0);

    // Cycle playback speed: 1 -> 2 -> 4 -> 1
    sotCycleSpeed();
    expect(S.sot.replay?.speed).toBe(2);
    sotCycleSpeed();
    expect(S.sot.replay?.speed).toBe(4);
    sotCycleSpeed();
    expect(S.sot.replay?.speed).toBe(1);

    // Replay record retriever
    expect(sotReplayRec()?.id).toBe("sot-test-1");

    // Close replay
    sotCloseReplay();
    expect(S.sot.replay).toBeNull();
  });

  test("sotDelete removes recording and closes active replay if matching", () => {
    const rec: any = {
      id: "sot-del-1",
      name: "Sands to Delete",
      frames: [],
      steps: [],
      duration: 0,
    };
    S.doc.recordings = [rec];
    sotOpenReplay("sot-del-1");
    expect(S.sot.replay).not.toBeNull();

    sotDelete("sot-del-1");
    expect(S.doc.recordings?.length).toBe(0);
    expect(S.sot.replay).toBeNull();
  });

  test("sotFrameUnion and sotFrameSVG never mutate S.doc or trigger store updates", () => {
    const originalDoc = S.doc;
    let docMutations = 0;
    const unsub = useBoardStore.subscribe((state, prev) => {
      if (state.doc !== prev.doc) docMutations++;
    });

    const frameDoc = {
      id: "other",
      settings: { style: "clean", palette: "mono" },
      elements: {
        a: {
          id: "a",
          type: "shape",
          shape: "rectangle",
          label: "Box",
          x: 20,
          y: 30,
          width: 120,
          height: 60,
        },
      },
    };
    const rec: any = {
      id: "sot-pure",
      frames: [{ json: JSON.stringify(frameDoc), at: 0, label: "Start" }],
    };

    const union = sotFrameUnion(rec);
    const svg = sotFrameSVG(rec.frames[0].json, union, 40, 400, 300);

    unsub();
    expect(S.doc).toBe(originalDoc);
    expect(docMutations).toBe(0);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Box");
  });

  test("recWatch defers capture while dragging or editing text", () => {
    sotStart();
    S.doc.elements["el-drag"] = {
      id: "el-drag",
      type: "shape",
      x: 10,
      y: 10,
      width: 50,
      height: 50,
    } as any;

    S.drag = { mode: "create", id: "el-drag" };
    recWatch();
    expect(S.rec?.timer).toBeNull();

    S.drag = null;
    S.editingId = "el-drag";
    recWatch();
    expect(S.rec?.timer).toBeNull();

    S.editingId = null;
    recWatch();
    expect(S.rec?.timer).not.toBeNull();
    clearTimeout(S.rec.timer);
  });

  test("sotPlayToggle, sotSetIndex, and sotCycleSpeed manage timers and index safely", () => {
    const rec: any = {
      id: "sot-play-1",
      name: "Sands Play",
      frames: [
        { json: JSON.stringify({ elements: {} }), at: 0 },
        { json: JSON.stringify({ elements: {} }), at: 300 },
        { json: JSON.stringify({ elements: {} }), at: 600 },
      ],
      steps: [
        { label: "Step 1", at: 300 },
        { label: "Step 2", at: 600 },
      ],
      duration: 600,
    };
    S.doc.recordings = [rec];

    sotOpenReplay("sot-play-1");
    expect(S.sot.replay?.union).not.toBeNull();

    sotPlayToggle();
    expect(S.sot.replay?.playing).toBe(true);
    expect(S.sot.replay?.timer).not.toBeNull();

    // Cycling speed while playing keeps current index
    S.sot.replay.index = 1;
    sotCycleSpeed();
    expect(S.sot.replay?.speed).toBe(2);
    expect(S.sot.replay?.playing).toBe(true);
    expect(S.sot.replay?.index).toBe(1);

    // Manual scrub pauses playback
    sotSetIndex(2);
    expect(S.sot.replay?.index).toBe(2);
    expect(S.sot.replay?.playing).toBe(false);
    expect(S.sot.replay?.timer).toBeNull();

    // Opening replay on 1-frame recording does not start interval
    S.doc.recordings.push({
      id: "sot-one",
      name: "One",
      frames: [{ json: JSON.stringify({ elements: {} }), at: 0 }],
      steps: [],
      duration: 0,
    } as any);
    sotOpenReplay("sot-one");
    sotPlayToggle();
    expect(S.sot.replay?.playing).toBe(false);
  });

  test("sotResetForBoardSwitch cleans up active recording, replay, and list", () => {
    sotStart();
    S.sot.listOpen = true;
    sotResetForBoardSwitch();
    expect(S.rec).toBeNull();
    expect(S.sot.listOpen).toBe(false);
    expect(S.sot.replay).toBeNull();
  });

  test("sotSceneFrom handles malformed JSON without throwing", () => {
    const scene = sotSceneFrom("{not-valid-json");
    expect(scene.doc).toBeDefined();
    expect(scene.w).toBeGreaterThan(0);
    expect(scene.h).toBeGreaterThan(0);
  });
});
