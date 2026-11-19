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

import { Overlays } from "../src/components/Overlays";
import { useBoardStore } from "../src/state/boardStore";
import { saveRename } from "../src/state/actions";
import { S } from "../src/state/store";

describe("Board Details Dialog & Slug Management", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useBoardStore.setState({
      renameOpen: true,
      doc: {
        schemaVersion: 1,
        id: "xn9jzgl0",
        name: "Peppy Token",
        collectionId: "col-jojo",
        elements: {},
        files: {},
        recordings: [],
        settings: {} as any,
      },
    } as any);
  });

  it("renders the dialog with 'Board details' title and clean prefix without leading slash", () => {
    const html = renderToStaticMarkup(React.createElement(Overlays));

    expect(html).toContain("Board details");
    expect(html).toContain('value="Peppy Token"');
    // Prefix should start with hostname, not a leading slash
    expect(html).toContain('class="linkprefix"');
    expect(html).not.toContain('class="linkprefix">/');
    expect(html).toContain('value="peppy-token-xn9jzgl0"');
  });

  it("saveRename updates both board name and custom slug when user edits suffix freely", () => {
    saveRename("New Board Name", "custom-slug-without-suffix");

    expect(S.doc.name).toBe("New Board Name");
    expect(S.doc.id).toBe("custom-slug-without-suffix");
  });

  it("saveRename preserves existing id when no newId is provided", () => {
    saveRename("Updated Name Only");

    expect(S.doc.name).toBe("Updated Name Only");
    expect(S.doc.id).toBe("xn9jzgl0");
  });
});
