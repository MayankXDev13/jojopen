import { describe, it, expect, beforeEach } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis as any;
}

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

  it("provides default collections matching original site (jojo, ledger-x, sketcha)", () => {
    const cols = collectionsList();
    expect(cols.length).toBeGreaterThanOrEqual(3);
    const names = cols.map((c) => c.name);
    expect(names).toContain("jojo");
    expect(names).toContain("ledger-x");
    expect(names).toContain("sketcha");
  });

  it("allows creating new collections dynamically", () => {
    const col = createCollection("my-projects");
    expect(col).not.toBeNull();
    expect(col?.name).toBe("my-projects");

    const updated = collectionsList();
    expect(updated.some((c) => c.name === "my-projects")).toBe(true);
  });

  it("persists boards with their collectionId", () => {
    const boards = boardsList();
    expect(boards.length).toBeGreaterThan(0);
    const jojoBoards = boards.filter((b: any) => b.collectionId === "col-jojo");
    expect(jojoBoards.length).toBeGreaterThanOrEqual(3);
    const names = jojoBoards.map((b: any) => b.name);
    expect(names).toContain("Peppy Token");
  });

  it("renders the BoardsPanel with original sidebar layout and collections", () => {
    const html = renderToStaticMarkup(React.createElement(BoardsPanel));

    // Header has My boards
    expect(html).toContain("My boards");

    // Collections label and pills
    expect(html).toContain("Collections");
    expect(html).toContain("jojo");
    expect(html).toContain("ledger-x");
    expect(html).toContain("sketcha");

    // Search bar with placeholder
    expect(html).toContain('placeholder="Search all boards"');

    // New collection input
    expect(html).toContain('placeholder="+ New collection..."');

    // New board button
    expect(html).toContain("New board");

    // Section label for current collection
    expect(html).toContain("BOARDS IN JOJO");

    // Peppy Token board is listed
    expect(html).toContain("Peppy Token");
  });

  it("switches active collection when activeCollection changes", () => {
    useBoardStore.setState({ activeCollection: "col-ledger-x" } as any);
    const html = renderToStaticMarkup(React.createElement(BoardsPanel));

    expect(html).toContain("BOARDS IN LEDGER-X");
    expect(html).toContain("Ledger Core Architecture");
  });

  it("filters boards when searching", () => {
    useBoardStore.setState({ boardQuery: "Peppy" } as any);
    const html = renderToStaticMarkup(React.createElement(BoardsPanel));

    expect(html).toContain("Matching boards");
    expect(html).toContain("Peppy Token");
    expect(html).not.toContain("AWS");
  });

  it("creates a new board in the currently active collection", () => {
    useBoardStore.setState({ activeCollection: "col-ledger-x" } as any);
    newBoard();
    expect(S.doc.collectionId).toBe("col-ledger-x");
  });
});
