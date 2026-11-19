import { describe, test, expect, beforeEach } from "bun:test";
import { MAKE, blankDoc, type BoardDoc } from "../src/lib/model";
import { compileDiagramDoc } from "../src/lib/diagram";
import { S, setDoc } from "../src/state/store";
import {
  codeTarget,
  compileDiagram,
  deleteSelection,
  newDiagram,
  tidyCode,
  updateCodeDraftAndSync,
} from "../src/state/actions";
import { useBoardStore } from "../src/state/boardStore";

describe("Diagram Compilation & Interactive Frame Parity", () => {
  beforeEach(() => {
    const doc = blankDoc("Test Board");
    S.doc = doc;
    useBoardStore.setState({
      doc,
      selection: new Set(),
      codeFor: null,
      codeDraft: "",
    } as any);
  });

  test("compileDiagramDoc compiles DSL into frame and child elements with frameId", () => {
    const doc = blankDoc("Test Board");
    const dsl = `direction: right

User [user]
group Backend {
  Auth service
}
Postgres [cylinder]

User -> Auth service -> Postgres`;

    const diag = MAKE.diagram({
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      title: "Architecture",
      dsl,
    });
    doc.elements[diag.id] = diag;

    const res = compileDiagramDoc(doc, diag.id, dsl);
    expect(res).not.toBeNull();
    expect(res?.success).toBe(true);

    // Diagram element acts as frame with title and expanded dimensions
    expect(diag.title).toBe("Architecture");
    expect(diag.width).toBeGreaterThan(300);
    expect(diag.height).toBeGreaterThan(150);

    const children = Object.values(doc.elements).filter(
      (e) => e.frameId === diag.id,
    );
    expect(children.length).toBeGreaterThanOrEqual(5); // 3 shapes, 1 container, 2 arrows

    // Group container
    const container = children.find((e) => e.type === "container");
    expect(container).toBeDefined();
    expect(container?.label).toBe("Backend");
    expect(container?.meta.dslGroup).toBe("Backend");

    // Shapes
    const userShape = children.find(
      (e) => e.type === "shape" && e.meta.dslKey === "User",
    );
    expect(userShape).toBeDefined();
    expect(userShape?.shape).toBe("person");
    expect(userShape?.label).toBe("User");

    const authShape = children.find(
      (e) => e.type === "shape" && e.meta.dslKey === "Auth service",
    );
    expect(authShape).toBeDefined();
    expect(authShape?.label).toBe("Auth service");

    const pgShape = children.find(
      (e) => e.type === "shape" && e.meta.dslKey === "Postgres",
    );
    expect(pgShape).toBeDefined();
    expect(pgShape?.shape).toBe("cylinder");

    // Arrows
    const arrows = children.filter((e) => e.type === "arrow");
    expect(arrows.length).toBe(2);
    expect(arrows[0].start?.elementId).toBe(userShape?.id);
    expect(arrows[0].end?.elementId).toBe(authShape?.id);
  });

  test("newDiagram creates diagram frame, compiles interactive elements, and sets selection", () => {
    newDiagram();

    const elements = Object.values(S.doc.elements);
    const diag = elements.find((e) => e.type === "diagram");
    expect(diag).toBeDefined();
    expect(diag?.title).toBe("URL shortener");

    // Check that child elements were created inside the diagram
    const children = elements.filter((e) => e.frameId === diag?.id);
    expect(children.length).toBeGreaterThan(5);

    // Verify selection is set to diagram frame
    expect(S.selection.has(diag!.id)).toBe(true);

    // codeTarget recognizes the diagram
    expect(codeTarget()?.id).toBe(diag?.id);
  });

  test("codeTarget resolves to parent diagram when a child shape is selected", () => {
    newDiagram();
    const elements = Object.values(S.doc.elements);
    const diag = elements.find((e) => e.type === "diagram")!;
    const childShape = elements.find(
      (e) => e.type === "shape" && e.frameId === diag.id,
    )!;
    expect(childShape).toBeDefined();

    // Select ONLY the child shape
    useBoardStore.setState({ selection: new Set([childShape.id]) } as any);

    // codeTarget correctly identifies the parent diagram
    expect(codeTarget()?.id).toBe(diag.id);
  });

  test("user can interact with figure: deleting an individual child shape preserves the frame", () => {
    newDiagram();
    const elements = Object.values(S.doc.elements);
    const diag = elements.find((e) => e.type === "diagram")!;
    const userShape = elements.find(
      (e) =>
        e.type === "shape" &&
        e.frameId === diag.id &&
        e.meta.dslKey === "User",
    )!;
    expect(userShape).toBeDefined();

    // User selects the User shape and deletes it
    useBoardStore.setState({ selection: new Set([userShape.id]) } as any);
    deleteSelection();

    // The User shape is deleted
    expect(S.doc.elements[userShape.id]).toBeUndefined();

    // The diagram frame and other shapes still exist!
    expect(S.doc.elements[diag.id]).toBeDefined();
    const remainingChildren = Object.values(S.doc.elements).filter(
      (e) => e.frameId === diag.id,
    );
    expect(remainingChildren.length).toBeGreaterThan(0);
  });

  test("deleting the diagram frame cascades and deletes all child elements", () => {
    newDiagram();
    const elements = Object.values(S.doc.elements);
    const diag = elements.find((e) => e.type === "diagram")!;
    const childIds = elements
      .filter((e) => e.frameId === diag.id)
      .map((e) => e.id);
    expect(childIds.length).toBeGreaterThan(0);

    // User selects the diagram frame and deletes it
    useBoardStore.setState({ selection: new Set([diag.id]) } as any);
    deleteSelection();

    // The diagram frame is deleted
    expect(S.doc.elements[diag.id]).toBeUndefined();

    // All children are also deleted
    for (const cid of childIds) {
      expect(S.doc.elements[cid]).toBeUndefined();
    }
  });

  test("editing code live-syncs interactive shapes inside the frame", () => {
    newDiagram();
    const diag = Object.values(S.doc.elements).find(
      (e) => e.type === "diagram",
    )!;
    useBoardStore.setState({ selection: new Set([diag.id]) } as any);

    const updatedDSL = `direction: right

Frontend [user]
Backend [server]

Frontend -> Backend: HTTP request`;

    updateCodeDraftAndSync(updatedDSL);

    expect(diag.dsl).toBe(updatedDSL);

    const children = Object.values(S.doc.elements).filter(
      (e) => e.frameId === diag.id,
    );
    const frontendShape = children.find(
      (e) => e.type === "shape" && e.meta.dslKey === "Frontend",
    );
    const backendShape = children.find(
      (e) => e.type === "shape" && e.meta.dslKey === "Backend",
    );
    const arrow = children.find((e) => e.type === "arrow");

    expect(frontendShape).toBeDefined();
    expect(backendShape).toBeDefined();
    expect(arrow).toBeDefined();
    expect(arrow?.label).toBe("HTTP request");

    // Old shapes like "User" or "Redis" from previous code should be removed
    const oldShape = children.find(
      (e) => e.type === "shape" && e.meta.dslKey === "User",
    );
    expect(oldShape).toBeUndefined();
  });

  test("tidyCode refreshes layout and child element positions cleanly", () => {
    newDiagram();
    const diag = Object.values(S.doc.elements).find(
      (e) => e.type === "diagram",
    )!;
    useBoardStore.setState({ selection: new Set([diag.id]) } as any);

    // Intentionally mutate a child position
    const child = Object.values(S.doc.elements).find(
      (e) => e.frameId === diag.id && e.type === "shape",
    )!;
    child.x = 9999;

    tidyCode();

    // Position was restored to neat layout
    expect(S.doc.elements[child.id].x).toBeLessThan(9000);
  });
});
