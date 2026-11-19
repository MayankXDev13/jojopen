/* Colour roles, board themes and the swatch palette. */

export const ROLE_NAMES = [
  "actor",
  "network",
  "compute",
  "data",
  "cache",
  "messaging",
  "security",
  "external",
  "neutral",
];

export type RolePaint = { fill: string; stroke: string; text: string };
export type Palette = Record<string, RolePaint>;

export const ROLE_COLORS: { light: Palette; dark: Palette; chalk: Palette } = {
  light: {
    actor: { fill: "#f1ecff", stroke: "#795ad6", text: "#33236e" },
    network: { fill: "#e1f4f0", stroke: "#25907f", text: "#0e4740" },
    compute: { fill: "#e8f0fe", stroke: "#3974d0", text: "#15386b" },
    data: { fill: "#e4f3e7", stroke: "#38914f", text: "#164825" },
    cache: { fill: "#feede0", stroke: "#d96f2f", text: "#68300b" },
    messaging: { fill: "#fbf1d3", stroke: "#bc8810", text: "#573e03" },
    security: { fill: "#ffe9ec", stroke: "#d04a69", text: "#6a1d30" },
    external: { fill: "#ecf1f7", stroke: "#6d7c8f", text: "#303b4a" },
    neutral: { fill: "#f2f2f2", stroke: "#808080", text: "#353535" },
    ink: { fill: "#ffffff", stroke: "#1c1b19", text: "#1c1b19" },
  },
  dark: {
    actor: { fill: "#221c34", stroke: "#a78ef3", text: "#e5ddff" },
    network: { fill: "#122b27", stroke: "#4cc0af", text: "#ccf2ec" },
    compute: { fill: "#15233a", stroke: "#6da3f3", text: "#d4e4fd" },
    data: { fill: "#142a1b", stroke: "#63be7c", text: "#d1efd9" },
    cache: { fill: "#341f0f", stroke: "#f2965b", text: "#fde0cc" },
    messaging: { fill: "#2e260c", stroke: "#e3b545", text: "#f8eac2" },
    security: { fill: "#361a1f", stroke: "#f18093", text: "#ffd9de" },
    external: { fill: "#20242b", stroke: "#9ba9bc", text: "#dee5ee" },
    neutral: { fill: "#242424", stroke: "#a4a4a4", text: "#e4e4e4" },
    ink: { fill: "#191919", stroke: "#ededec", text: "#ededec" },
  },
  chalk: {
    actor: {
      fill: "rgba(167,142,243,.14)",
      stroke: "#c8b6ff",
      text: "#f0eaff",
    },
    network: {
      fill: "rgba(76,192,175,.13)",
      stroke: "#8ee3d2",
      text: "#e2faf5",
    },
    compute: {
      fill: "rgba(109,163,243,.13)",
      stroke: "#9dc2ff",
      text: "#e6f0ff",
    },
    data: { fill: "rgba(99,190,124,.13)", stroke: "#9adcae", text: "#e7f8ec" },
    cache: { fill: "rgba(242,150,91,.13)", stroke: "#ffbc8c", text: "#ffeedf" },
    messaging: {
      fill: "rgba(227,181,69,.13)",
      stroke: "#f5d47f",
      text: "#fff6da",
    },
    security: {
      fill: "rgba(241,128,147,.13)",
      stroke: "#ffa9b7",
      text: "#ffe6ea",
    },
    external: {
      fill: "rgba(155,169,188,.13)",
      stroke: "#c6d1e0",
      text: "#eef3fa",
    },
    neutral: {
      fill: "rgba(255,255,255,.05)",
      stroke: "#c9c5ba",
      text: "#f4f1ea",
    },
    ink: { fill: "rgba(255,255,255,.03)", stroke: "#f4f1ea", text: "#f4f1ea" },
  },
};

export const THEME = {
  light: {
    board: "#fafaf7",
    dot: "#ddd9d0",
    ink: "#1c1b19",
    muted: "#67645e",
    arrow: "#5a5650",
    labelPill: "#fafaf7",
    select: "#4c6fff",
    frame: "#d4d0c7",
    frameText: "#67645e",
    sticky: "#ffe680",
    stickyInk: "#3f3606",
    slide: "#ffffff",
    slideEdge: "#e2ded4",
    grid: "#ddd9d0",
  },
  dark: {
    board: "#0f0f0f",
    dot: "#262626",
    ink: "#ededec",
    muted: "#a3a3a1",
    arrow: "#a9a9a6",
    labelPill: "#0f0f0f",
    select: "#7c93ff",
    frame: "#353535",
    frameText: "#a3a3a1",
    sticky: "#ebd46b",
    stickyInk: "#2b2504",
    slide: "#171717",
    slideEdge: "#2c2c2c",
    grid: "#262626",
  },
  chalk: {
    board: "#1e2622",
    dot: "rgba(255,255,255,.10)",
    ink: "#f4f1ea",
    muted: "rgba(244,241,234,.72)",
    arrow: "#e9e6de",
    labelPill: "#1e2622",
    select: "#f2d675",
    frame: "rgba(233,230,222,.35)",
    frameText: "rgba(244,241,234,.72)",
    sticky: "#e9d98c",
    stickyInk: "#2b2504",
    slide: "#232d28",
    slideEdge: "rgba(233,230,222,.22)",
    grid: "rgba(255,255,255,.10)",
  },
};

export type Theme = (typeof THEME)["light"];
export type StyleKey = keyof typeof THEME;

export const COLOR_KEYS = [
  "violet",
  "teal",
  "blue",
  "green",
  "orange",
  "amber",
  "rose",
  "slate",
  "gray",
  "ink",
];

export const COLOR_TO_ROLE: Record<string, string> = {
  violet: "actor",
  teal: "network",
  blue: "compute",
  green: "data",
  orange: "cache",
  amber: "messaging",
  rose: "security",
  slate: "external",
  gray: "neutral",
  ink: "neutral",
};

export const ROLE_TO_COLOR: Record<string, string> = {
  actor: "violet",
  network: "teal",
  compute: "blue",
  data: "green",
  cache: "orange",
  messaging: "amber",
  security: "rose",
  external: "slate",
  neutral: "gray",
};
