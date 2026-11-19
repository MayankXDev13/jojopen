import { describe, it, expect, beforeEach } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as any;
}

import {
  collectionsList,
  createCollection,
  boardsList,
  KEY_COLLECTIONS,
  S,
} from "../src/state/store";
import { useBoardStore } from "../src/state/boardStore";
import { BoardsPanel } from "../src/components/Panels";
import { newBoard } from "../src/state/actions";

describe("Boards & Collections System", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useBoardStore.setState({
      boardQuery: "",
      activeCollection: "col-jojo",
      panel: "boards",
    } as any);
  });

  it("provides jojo as the ONLY default collection", () => {
    const cols = collectionsList();
    expect(cols.length).toBe(1);
    expect(cols[0].name).toBe("jojo");
  });

  it("purges ledger-x and sketcha collections if they exist in localStorage", () => {
    globalThis.localStorage.setItem(
      KEY_COLLECTIONS,
      JSON.stringify([
        { id: "col-jojo", name: "jojo", createdAt: 1 },
        { id: "col-ledger-x", name: "ledger-x", createdAt: 2 },
        { id: "col-sketcha", name: "sketcha", createdAt: 3 },
      ]),
    );

    const cols = collectionsList();
    expect(cols.length).toBe(1);
    expect(cols[0].name).toBe("jojo");
    expect(cols.some((c) => c.name === "ledger-x")).toBe(false);
    expect(cols.some((c) => c.name === "sketcha")).toBe(false);
  });

  it("allows creating new collections dynamically", () => {
    const col = createCollection("my-projects");
    expect(col).not.toBeNull();
    expect(col?.name).toBe("my-projects");

    const updated = collectionsList();
    expect(updated.some((c) => c.name === "my-projects")).toBe(true);
    expect(updated.length).toBe(2);
  });

  it("persists boards with their collectionId defaulting to jojo", () => {
    const boards = boardsList();
    expect(boards.length).toBeGreaterThan(0);
    expect(boards.every((b: any) => b.collectionId === "col-jojo")).toBe(true);
  });

  it("renders the BoardsPanel with original sidebar layout and jojo collection", () => {
    const html = renderToStaticMarkup(React.createElement(BoardsPanel));

    // Header has My boards
    expect(html).toContain("My boards");

    // Collections label and jojo pill
    expect(html).toContain("Collections");
    expect(html).toContain("jojo");
    expect(html).not.toContain("ledger-x");
    expect(html).not.toContain("sketcha");

    // Search bar with placeholder
    expect(html).toContain('placeholder="Search all boards"');

    // New collection input
    expect(html).toContain('placeholder="+ New collection..."');

    // New board button
    expect(html).toContain("New board");

    // Section label for current collection
    expect(html).toContain("BOARDS IN JOJO");
  });

  it("creates a new board in the currently active collection", () => {
    const customCol = createCollection("custom-col")!;
    useBoardStore.setState({ activeCollection: customCol.id } as any);
    newBoard();
    expect(S.doc.collectionId).toBe(customCol.id);
  });
});
