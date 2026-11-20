/* First-run board: seed the URL-shortener demo or import the live site's board.
   The live key is only ever read, never written. */

import {
  MAKE,
  blankDoc,
  normalizeDoc,
  type BoardDoc,
  type BoardElement,
} from "./model";

/** Storage key the live site (jojopen.com) uses for its scratch board. */
export const LIVE_KEY = "jojopen:scratch:v2";

const STICKY_TEXT = "301s are cacheable — let the CDN absorb redirects";

function bindArrow(
  from: BoardElement,
  to: BoardElement,
  opts: {
    startAnchor: { x: number; y: number };
    endAnchor: { x: number; y: number };
    label?: string;
    dash?: string;
    index: number;
  },
): BoardElement {
  const ax = Math.round(from.x + from.width * opts.startAnchor.x);
  const ay = Math.round(from.y + from.height * opts.startAnchor.y);
  const bx = Math.round(to.x + to.width * opts.endAnchor.x);
  const by = Math.round(to.y + to.height * opts.endAnchor.y);
  return MAKE.arrow({
    index: opts.index,
    x: ax,
    y: ay,
    points: [
      { x: 0, y: 0 },
      { x: bx - ax, y: by - ay },
    ],
    routeMode: "orthogonal",
    route: "auto",
    startHead: "none",
    endHead: "arrow",
    dash: opts.dash ?? "solid",
    label: opts.label ?? "",
    start: {
      elementId: from.id,
      anchor: null,
      isPrecise: true,
      isExact: true,
      normalizedAnchor: opts.startAnchor,
    },
    end: {
      elementId: to.id,
      anchor: null,
      isPrecise: true,
      isExact: true,
      normalizedAnchor: opts.endAnchor,
    },
  });
}

/** Build the first-run demo matching jojopen.com's default scratch board. */
export function seedDemo(): BoardDoc {
  const doc = blankDoc("Scratch board");

  const backend = MAKE.container({
    index: 1,
    x: 544,
    y: 64,
    width: 256,
    height: 400,
    label: "Backend",
    role: "compute",
    color: "blue",
  });

  const user = MAKE.shape({
    index: 2,
    x: 0,
    y: 224,
    width: 128,
    height: 64,
    shape: "person",
    label: "User",
    role: "actor",
  });

  const cdn = MAKE.shape({
    index: 3,
    x: 176,
    y: 224,
    width: 128,
    height: 64,
    shape: "rounded",
    label: "CDN",
    role: "network",
  });

  const gateway = MAKE.shape({
    index: 4,
    x: 352,
    y: 224,
    width: 160,
    height: 64,
    shape: "rounded",
    label: "API Gateway",
    role: "network",
  });

  const shortener = MAKE.shape({
    index: 5,
    x: 576,
    y: 128,
    width: 192,
    height: 64,
    shape: "rounded",
    label: "Shortener service",
    role: "compute",
  });

  const auth = MAKE.shape({
    index: 6,
    x: 576,
    y: 240,
    width: 192,
    height: 64,
    shape: "rounded",
    label: "Auth service",
    role: "neutral",
    color: "ink",
    colorLocked: true,
  });

  const analytics = MAKE.shape({
    index: 7,
    x: 576,
    y: 368,
    width: 192,
    height: 64,
    shape: "rounded",
    label: "Analytics worker",
    role: "compute",
  });

  const postgres = MAKE.shape({
    index: 8,
    x: 864,
    y: 64,
    width: 144,
    height: 96,
    shape: "cylinder",
    label: "Postgres",
    role: "data",
  });

  const redis = MAKE.shape({
    index: 9,
    x: 864,
    y: 208,
    width: 144,
    height: 64,
    shape: "rounded",
    label: "Redis",
    role: "cache",
  });

  const kafka = MAKE.shape({
    index: 10,
    x: 864,
    y: 368,
    width: 144,
    height: 64,
    shape: "rounded",
    label: "Kafka",
    role: "messaging",
  });

  const arrows = [
    bindArrow(user, cdn, {
      startAnchor: { x: 1, y: 0.5 },
      endAnchor: { x: 0, y: 0.5 },
      index: 11,
    }),
    bindArrow(cdn, gateway, {
      startAnchor: { x: 1, y: 0.5 },
      endAnchor: { x: 0, y: 0.5 },
      index: 12,
    }),
    bindArrow(gateway, shortener, {
      startAnchor: { x: 1, y: 0.35 },
      endAnchor: { x: 0, y: 0.5 },
      index: 13,
    }),
    bindArrow(gateway, auth, {
      startAnchor: { x: 1, y: 0.65 },
      endAnchor: { x: 0, y: 0.5 },
      label: "verify",
      index: 14,
    }),
    bindArrow(shortener, postgres, {
      startAnchor: { x: 1, y: 0.33 },
      endAnchor: { x: 0, y: 0.5 },
      label: "write",
      index: 15,
    }),
    bindArrow(shortener, redis, {
      startAnchor: { x: 1, y: 0.67 },
      endAnchor: { x: 0, y: 0.5 },
      label: "cache",
      index: 16,
    }),
    bindArrow(shortener, kafka, {
      startAnchor: { x: 0.5, y: 1 },
      endAnchor: { x: 0.5, y: 0 },
      label: "click event",
      dash: "dashed",
      index: 17,
    }),
    bindArrow(kafka, analytics, {
      startAnchor: { x: 0, y: 0.5 },
      endAnchor: { x: 1, y: 0.5 },
      label: "consume",
      index: 18,
    }),
  ];

  const sticky = MAKE.sticky({
    index: 100,
    x: 16,
    y: 16,
    width: 208,
    height: 136,
    angle: -1.72,
    textScale: 0.78,
    text: STICKY_TEXT,
  });

  for (const el of [
    backend,
    user,
    cdn,
    gateway,
    shortener,
    auth,
    analytics,
    postgres,
    redis,
    kafka,
    ...arrows,
    sticky,
  ]) {
    doc.elements[el.id] = el;
  }

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
