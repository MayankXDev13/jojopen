/* First-run board: seed the URL-shortener demo or import the live site's board.
   The live key is only ever read, never written. */

import { compileDiagramDoc } from "./diagram";
import { parseDSL } from "./dsl";
import { layoutDiagram } from "./layout";
import { MAKE, blankDoc, normalizeDoc, type BoardDoc } from "./model";
import { TEMPLATES } from "./templates";

/** Storage key the live site (jojopen.com) uses for its scratch board. */
export const LIVE_KEY = "jojopen:scratch:v2";

const STICKY_TEXT = "301s are cacheable — let the CDN absorb redirects";

/** Build the first-run demo: the system-template diagram plus a sticky note. */
export function seedDemo(): BoardDoc {
  const doc = blankDoc("Scratch board");
  const dsl = TEMPLATES.system;
  const parsed = parseDSL(dsl);
  const layout = layoutDiagram(parsed);
  const Dt = 48;
  const diagram = MAKE.diagram({
    x: 0,
    y: 0,
    width: layout.width + Dt * 2,
    height: layout.height + Dt * 2,
    title: parsed.title || "URL shortener",
    dsl,
  });
  diagram.index = 1;
  doc.elements[diagram.id] = diagram;
  compileDiagramDoc(doc, diagram.id, dsl);
  const sticky = MAKE.sticky({
    x: 0,
    y: diagram.height + 48,
    text: STICKY_TEXT,
  });
  sticky.index = 100;
  doc.elements[sticky.id] = sticky;
  return doc;
}

/** Read-only import of the live board. Returns null when absent or unusable. */
export function importLive(): BoardDoc | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LIVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const board = data?.board ?? data;
    if (!board?.elements || Object.keys(board.elements).length === 0)
      return null;
    return normalizeDoc(board);
  } catch (e) {
    console.warn("ignoring malformed " + LIVE_KEY, e);
    return null;
  }
}
