/* The JojoPen diagram language: a small, forgiving text format.
   parseDSL turns source into nodes / groups / edges plus diagnostics. */

import { ROLE_NAMES } from "./palette";

export const SHAPES = [
  "rectangle",
  "rounded",
  "ellipse",
  "diamond",
  "cylinder",
  "document",
  "person",
];
const SHAPE_ALIAS: Record<string, string> = {
  rect: "rectangle",
  box: "rectangle",
  square: "rectangle",
  round: "rounded",
  circle: "ellipse",
  oval: "ellipse",
  rhombus: "diamond",
  decision: "diamond",
  database: "cylinder",
  doc: "document",
  user: "person",
};
const ROLE_ALIAS: Record<string, string> = Object.fromEntries(
  ROLE_NAMES.map((r) => [r, r]),
);
const COLOR_ALIAS: Record<string, string> = {
  purple: "violet",
  cyan: "teal",
  red: "rose",
  pink: "rose",
  yellow: "amber",
  grey: "gray",
  gray: "gray",
  violet: "violet",
  teal: "teal",
  blue: "blue",
  green: "green",
  orange: "orange",
  amber: "amber",
  rose: "rose",
  slate: "slate",
  ink: "ink",
};
const DIRECTIONS: Record<string, string> = {
  right: "right",
  left: "left",
  down: "down",
  up: "up",
  lr: "right",
  rl: "left",
  tb: "down",
  td: "down",
  bt: "up",
};

export type Diagnostic = {
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
};

export type ParsedNode = {
  key: string;
  label: string;
  shape: string;
  role: string | null;
  color: string | null;
  icon: string | null;
  link: string | null;
  group: string | null;
  order: number;
  explicit: boolean;
};

export type ParsedGroup = {
  key: string;
  label: string;
  parent: string | null;
  children: string[];
  line: number;
  order: number;
  attrs: ParsedDecl;
};

export type ParsedEdge = {
  from: string;
  to: string;
  kind: string;
  label: string;
  route?: string | null;
  dash?: string | null;
  line: number;
};

export type ParsedDecl = {
  name?: string;
  attrs: Record<string, string>;
  shape: string | null;
  role: string | null;
  color: string | null;
  icon: string | null;
  label: string | null;
  link: string | null;
};

export type ParsedDiagram = {
  title: string;
  direction: string;
  nodes: Map<string, ParsedNode>;
  groups: Map<string, ParsedGroup>;
  edges: ParsedEdge[];
  diagnostics: Diagnostic[];
};

function stripComment(line: string): string {
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === "\\") i++;
      else if (ch === '"') q = false;
      continue;
    }
    if (ch === '"') {
      q = true;
      continue;
    }
    if (
      ch === "/" &&
      line[i + 1] === "/" &&
      (i === 0 || /\s/.test(line[i - 1]))
    )
      return line.slice(0, i);
  }
  return line;
}

function scanTop(str: string, fn: (ch: string, i: number) => boolean): number {
  let q = false;
  let br = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) {
      if (ch === "\\") i++;
      else if (ch === '"') q = false;
      continue;
    }
    if (ch === '"') {
      q = true;
      continue;
    }
    if (ch === "[") {
      br++;
      continue;
    }
    if (ch === "]") {
      br = Math.max(0, br - 1);
      continue;
    }
    if (br === 0 && fn(ch, i)) return i;
  }
  return -1;
}

function unquote(s: string): string {
  s = s.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"'))
    return s.slice(1, -1).replace(/\\(.)/g, "$1");
  return s;
}

function splitTop(str: string, ch = ","): string[] {
  const parts: string[] = [];
  let last = 0;
  while (true) {
    const i = scanTop(str.slice(last), (c) => c === ch);
    if (i < 0) {
      parts.push(str.slice(last));
      break;
    }
    parts.push(str.slice(last, last + i));
    last += i + 1;
  }
  return parts;
}

function parseAttrList(raw: string): ParsedDecl {
  const out: ParsedDecl = {
    attrs: {},
    shape: null,
    role: null,
    color: null,
    icon: null,
    label: null,
    link: null,
  };
  const body = raw.slice(1, -1);
  for (const itemRaw of splitTop(body)) {
    const item = itemRaw.trim();
    if (!item) continue;
    const m = /^([A-Za-z][\w-]*)\s*:\s*([\s\S]*)$/.exec(item);
    if (m && !item.startsWith('"')) {
      const k = m[1].toLowerCase();
      const v = unquote(m[2]);
      if (k === "label") out.label = v;
      else if (k === "icon") out.icon = v;
      else if (k === "shape")
        out.shape =
          SHAPE_ALIAS[v.toLowerCase()] ||
          (SHAPES.includes(v.toLowerCase()) ? v.toLowerCase() : null);
      else if (k === "role") out.role = ROLE_ALIAS[v.toLowerCase()] || null;
      else if (k === "color")
        out.color =
          COLOR_ALIAS[v.toLowerCase()] ||
          (/^#[0-9a-f]{3,8}$/i.test(v) ? v : null);
      else if (k === "link") out.link = v;
      else out.attrs[k] = v;
      continue;
    }
    const low = item.toLowerCase();
    if (item.startsWith('"')) {
      if (out.label == null) out.label = unquote(item);
      continue;
    }
    if (SHAPE_ALIAS[low] || SHAPES.includes(low)) {
      out.shape = SHAPE_ALIAS[low] || low;
      continue;
    }
    if (ROLE_ALIAS[low]) {
      out.role = low;
      continue;
    }
    if (COLOR_ALIAS[low]) {
      out.color = COLOR_ALIAS[low];
      continue;
    }
    if (!out.icon) out.icon = low;
  }
  return out;
}

function parseDecl(str: string): ParsedDecl {
  str = str.trim();
  let name: string;
  let rest: string;
  if (str.startsWith('"')) {
    const close = str.indexOf('"', 1);
    const end = close < 0 ? str.length : close + 1;
    name = unquote(str.slice(0, end));
    rest = str.slice(end).trim();
  } else {
    const i = str.indexOf("[");
    if (i < 0) {
      name = str.trim();
      rest = "";
    } else {
      name = str.slice(0, i).trim();
      rest = str.slice(i).trim();
    }
  }
  const attrs: ParsedDecl =
    rest.startsWith("[") && rest.endsWith("]")
      ? parseAttrList(rest)
      : {
          attrs: {},
          shape: null,
          role: null,
          color: null,
          icon: null,
          label: null,
          link: null,
        };
  return { name: name.replace(/\s+/g, " "), ...attrs };
}

const CONNECTORS = [
  { text: "<-->", kind: "bidirectional", reversed: false },
  { text: "<->", kind: "bidirectional", reversed: false },
  { text: "-..>", kind: "optional", reversed: false },
  { text: "-.->", kind: "optional", reversed: false },
  { text: "<--", kind: "async", reversed: true },
  { text: "<-", kind: "sync", reversed: true },
  { text: "-->", kind: "async", reversed: false },
  { text: "->", kind: "sync", reversed: false },
  { text: "---", kind: "line", reversed: false },
  { text: "--", kind: "line", reversed: false },
];

function findConnectors(str: string) {
  const found: {
    text: string;
    kind: string;
    reversed: boolean;
    index: number;
  }[] = [];
  let i = 0;
  let q = false;
  let br = 0;
  while (i < str.length) {
    const ch = str[i];
    if (q) {
      if (ch === "\\") i++;
      else if (ch === '"') q = false;
      i++;
      continue;
    }
    if (ch === '"') {
      q = true;
      i++;
      continue;
    }
    if (ch === "[") {
      br++;
      i++;
      continue;
    }
    if (ch === "]") {
      br = Math.max(0, br - 1);
      i++;
      continue;
    }
    if (br === 0) {
      let hit = null;
      for (const c of CONNECTORS)
        if (str.startsWith(c.text, i)) {
          hit = c;
          break;
        }
      if (hit) {
        found.push({ ...hit, index: i });
        i += hit.text.length;
        continue;
      }
    }
    i++;
  }
  return found;
}

export function parseDSL(src: string): ParsedDiagram {
  const diags: Diagnostic[] = [];
  const nodes = new Map<string, ParsedNode>();
  const groups = new Map<string, ParsedGroup>();
  const edges: ParsedEdge[] = [];
  let title = "";
  let direction = "right";
  const stack: string[] = [];
  const lines = String(src || "").split("\n");

  const ensureNode = (name: string, group: string | null) => {
    if (!nodes.has(name)) {
      nodes.set(name, {
        key: name,
        label: name,
        shape: "rounded",
        role: null,
        color: null,
        icon: null,
        link: null,
        group,
        order: nodes.size,
        explicit: false,
      });
    }
    return nodes.get(name)!;
  };
  const applyAttrs = (node: ParsedNode, d: ParsedDecl) => {
    if (d.label != null) node.label = d.label;
    if (d.shape) node.shape = d.shape;
    if (d.role) node.role = d.role;
    if (d.color) node.color = d.color;
    if (d.icon) node.icon = d.icon;
    if (d.link) node.link = d.link;
  };

  lines.forEach((rawLine, li) => {
    const lineNo = li + 1;
    const line = stripComment(rawLine).trim();
    if (!line) return;
    const diag = (
      severity: Diagnostic["severity"],
      message: string,
      column = 1,
    ) => diags.push({ line: lineNo, column, severity, message });

    if (line.startsWith("}")) {
      if (!stack.length) {
        diag(
          "error",
          "Unmatched '}'. Remove it, or open a group with `group Name {`.",
        );
        return;
      }
      stack.pop();
      const after = line.slice(1).trim();
      if (after)
        diag("warning", "Text after '}' was ignored. Put it on its own line.");
      return;
    }

    const head = /^(direction|title)\s*(?::|\s)\s*([\s\S]*)$/.exec(line);
    if (head) {
      const val = unquote(head[2].trim());
      if (head[1] === "direction") {
        const d = DIRECTIONS[val.toLowerCase()];
        if (d) direction = d;
        else
          diag(
            "error",
            `Unknown direction '${val}'. Use direction: right, left, down or up.`,
          );
      } else if (val) title = val;
      else diag("warning", "Empty title. Write `title: Some title`.");
      return;
    }

    const hashMatch = /^#+\s*(.*)$/.exec(line);
    if (hashMatch) {
      const val = unquote(hashMatch[1].trim());
      if (val) title = val;
      return;
    }

    /* group */
    const brace = scanTop(line, (c) => c === "{");
    if (brace >= 0) {
      if (/(?:->|<-|--)/.test(line.slice(0, brace))) {
        diag(
          "error",
          "A group line cannot contain an edge. Put edges on their own lines.",
        );
        return;
      }
      const openAtEnd = /\{\s*\}$/.test(line);
      let body = line.slice(0, brace).trim();
      if (/^group(?=\s|"|$)/.test(body)) body = body.replace(/^group\s*/, "");
      const d = parseDecl(body);
      if (!d.name) {
        diag("error", "Group needs a name: `group Name {`.");
        return;
      }
      const parent = stack.length ? stack[stack.length - 1] : null;
      if (nodes.has(d.name!)) {
        diag(
          "error",
          `'${d.name}' is already a node. Give the group a different name.`,
        );
        return;
      }
      let g = groups.get(d.name!);
      if (g) {
        if (g.parent !== parent)
          diag(
            "warning",
            `Group '${d.name}' was already declared elsewhere; reusing it.`,
          );
      } else {
        g = {
          key: d.name!,
          label: d.label || d.name!,
          parent,
          children: [],
          line: lineNo,
          order: groups.size,
          attrs: d,
        };
        groups.set(d.name!, g);
        if (parent && groups.get(parent))
          groups.get(parent)!.children.push(d.name!);
      }
      if (!openAtEnd) {
        stack.push(d.name!);
        return;
      }
      stack.push(d.name!);
      if (!/\{\s*\}$/.test(line))
        diag("warning", "'{' must end the group line.");
      return;
    }
    if (line.includes("{")) {
      diag("error", "'{' must end the line: `group Name {`.");
      return;
    }

    /* edge? */
    const conns = findConnectors(line);
    if (conns.length) {
      let colon = -1;
      for (let i = 0; i < line.length; i++) {
        if (
          line[i] === ":" &&
          !insideQuotes(line, i) &&
          !insideBrackets(line, i)
        ) {
          colon = i;
          break;
        }
      }
      let left = line;
      let labelRaw = "";
      if (colon > conns[0].index) {
        left = line.slice(0, colon);
        labelRaw = line.slice(colon + 1).trim();
      }
      const cs = findConnectors(left);
      let edgeLabel = "";
      let route: string | null = null;
      let dash: string | null = null;
      let lb = labelRaw;
      if (lb) {
        const br = scanTop(lb, (c) => c === "[");
        if (br >= 0) {
          const end = lb.lastIndexOf("]");
          const slice = end > br ? lb.slice(br, end + 1) : "";
          const rv = /route\s*:\s*([a-z]+)/i.exec(slice);
          const dv = /(solid|dashed|dotted|thick)/i.exec(slice);
          if (rv) route = rv[1].toLowerCase();
          if (dv) dash = dv[1].toLowerCase();
          lb = lb.slice(0, br).trim();
        }
        edgeLabel = unquote(lb.replace(/^:\s*/, ""));
      }
      let cursor = 0;
      const operands: string[] = [];
      for (const c of cs) {
        operands.push(left.slice(cursor, c.index));
        cursor = c.index + c.text.length;
      }
      operands.push(left.slice(cursor));
      const parsedOps = operands.map((o) =>
        splitTop(o)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => parseDecl(s))
          .filter((d) => d.name),
      );
      if (parsedOps.some((o) => !o.length)) {
        diag("error", "An edge is missing a node on one side.");
        return;
      }
      const group = stack.length ? stack[stack.length - 1] : null;
      cs.forEach((c, ci) => {
        const lhs = parsedOps[ci];
        const rhs = parsedOps[ci + 1];
        if (!lhs || !rhs) return;
        for (const A of lhs) {
          for (const B of rhs) {
            let from = A.name!;
            let to = B.name!;
            if (c.reversed) [from, to] = [to, from];
            const nA = ensureNode(A.name!, group);
            applyAttrs(nA, A);
            const nB = ensureNode(B.name!, group);
            applyAttrs(nB, B);
            edges.push({
              from,
              to,
              kind: c.kind,
              label: ci === cs.length - 1 ? edgeLabel : "",
              route,
              dash,
              line: lineNo,
            });
          }
        }
      });
      return;
    }

    /* node declaration */
    const d = parseDecl(line);
    if (!d.name) return;
    const isGroupWord = /^group(\s|$)/.test(line) && !line.startsWith('"');
    if (isGroupWord) {
      diag("error", "Group line is missing '{'. Write `group Name {`.");
      return;
    }
    const group = stack.length ? stack[stack.length - 1] : null;
    if (groups.has(d.name)) {
      diag(
        "error",
        `'${d.name}' is already a group. Give the node a different name.`,
      );
      return;
    }
    const n = ensureNode(d.name, group);
    n.explicit = true;
    applyAttrs(n, d);
  });

  if (stack.length)
    diags.push({
      line: lines.length,
      column: 1,
      severity: "warning",
      message: `Group '${stack[stack.length - 1]}' was never closed with '}'.`,
    });
  return { title, direction, nodes, groups, edges, diagnostics: diags };
}

function insideQuotes(s: string, idx: number): boolean {
  let q = false;
  for (let i = 0; i < idx; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === '"') q = !q;
  }
  return q;
}

function insideBrackets(s: string, idx: number): boolean {
  let b = 0;
  for (let i = 0; i < idx; i++) {
    if (s[i] === "[") b++;
    else if (s[i] === "]") b--;
  }
  return b > 0;
}
