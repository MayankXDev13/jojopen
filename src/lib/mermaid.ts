/* Mermaid flowchart import: converts a pasted flowchart into JojoPen DSL. */

type MermaidNode = {
  id: string;
  label: string;
  shape: string;
  group?: { id: string; label: string } | null;
};
type MermaidEdge = { from: string; to: string; kind: string; label: string };

function mermaidSplit(line: string): {
  parts: string[];
  conns: { conn: string; label: string }[];
} {
  const re = /<-->|<->|-\.\.->|-\.->|==>|-->|---|--|==/;
  const parts: string[] = [];
  const conns: { conn: string; label: string }[] = [];
  let rest = line;
  for (;;) {
    const m = re.exec(rest);
    if (!m) break;
    parts.push(rest.slice(0, m.index));
    rest = rest.slice(m.index + m[0].length);
    let label = "";
    const lm = /^\s*\|([^|]*)\|/.exec(rest);
    if (lm) {
      label = lm[1].trim();
      rest = rest.slice(lm[0].length);
    }
    conns.push({ conn: m[0], label });
  }
  parts.push(rest);
  return { parts: parts.map((s) => s.trim()).filter(Boolean), conns };
}

function mermaidNode(tok: string): MermaidNode | null {
  const t = tok
    .trim()
    .replace(/:::[\w-]+/g, "")
    .trim();
  if (!t) return null;
  const m = /^([A-Za-z0-9_.:-]+)\s*([\s\S]*)$/.exec(t);
  const id = m ? m[1] : t;
  const rest = m ? m[2].trim() : "";
  let label: string | null = null;
  let shape = "rounded";
  if (rest) {
    if (rest.startsWith("((") && rest.endsWith("))")) {
      shape = "ellipse";
      label = rest.slice(2, -2);
    } else if (rest.startsWith("([") && rest.endsWith("])")) {
      shape = "ellipse";
      label = rest.slice(2, -2);
    } else if (rest.startsWith("[(") && rest.endsWith(")]")) {
      shape = "cylinder";
      label = rest.slice(2, -2);
    } else if (rest.startsWith("{{") && rest.endsWith("}}")) {
      shape = "diamond";
      label = rest.slice(2, -2);
    } else if (rest.startsWith("[[") && rest.endsWith("]]")) {
      shape = "rectangle";
      label = rest.slice(2, -2);
    } else if (rest.startsWith("[/") && rest.endsWith("/]")) {
      shape = "rectangle";
      label = rest.slice(2, -2);
    } else if (rest.startsWith("[") && rest.endsWith("]")) {
      shape = "rectangle";
      label = rest.slice(1, -1);
    } else if (rest.startsWith("(") && rest.endsWith(")")) {
      shape = "rounded";
      label = rest.slice(1, -1);
    } else if (rest.startsWith("{") && rest.endsWith("}")) {
      shape = "diamond";
      label = rest.slice(1, -1);
    } else if (rest.startsWith(">") && rest.endsWith("]")) {
      shape = "rounded";
      label = rest.slice(1, -1);
    } else label = rest;
  }
  const finalLabel =
    String(label == null ? id : label)
      .replace(/^["']|["']$/g, "")
      .trim() || id;
  return { id, label: finalLabel.replace(/<br\s*\/?>/gi, "\n"), shape };
}

function mermaidRole(label: string, shape: string): string {
  const l = label.toLowerCase();
  if (shape === "diamond") return "neutral";
  if (/(redis|cache|memcache|cdn edge)/.test(l)) return "cache";
  if (/(db|database|postgres|mysql|sql|warehouse|store)/.test(l)) return "data";
  if (/(kafka|queue|topic|rabbit|sqs|pubsub|event bus)/.test(l))
    return "messaging";
  if (/(auth|login|security|lock|key|token)/.test(l)) return "security";
  if (/(user|client|customer|actor|person|browser|mobile)/.test(l))
    return "actor";
  if (/(cdn|network|gateway|proxy|dns|load.?balancer)/.test(l))
    return "network";
  if (/(api|server|service|worker|function|lambda|compute|app|backend)/.test(l))
    return "compute";
  if (/(cloud|external|stripe|third.?party|saas)/.test(l)) return "external";
  return "neutral";
}

export function mermaidToDSL(src: string): { dsl?: string; error?: string } {
  const raw = String(src || "")
    .replace(/^\s*```[a-z]*\s*$/gim, "")
    .replace(/^\s*%%[^\n]*$/gm, "");
  const lines = raw.split(/\r?\n/);
  let direction = "right";
  const header = "Mermaid import";
  const nodes = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];
  const groups: { id: string; label: string }[] = [];
  let group: { id: string; label: string } | null = null;
  let sawFlow = false;

  const addNode = (n: MermaidNode | null) => {
    if (!n) return;
    if (!nodes.has(n.id)) nodes.set(n.id, { ...n, group });
    else {
      const ex = nodes.get(n.id)!;
      if (n.label && n.label !== n.id) ex.label = n.label;
      if (n.shape && n.shape !== "rounded") ex.shape = n.shape;
      if (group && !ex.group) ex.group = group;
    }
  };

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    const flow = /^(flowchart|graph)\s+([A-Za-z]{2})/i.exec(line);
    if (flow) {
      sawFlow = true;
      direction =
        (
          {
            LR: "right",
            RL: "left",
            TD: "down",
            TB: "down",
            BT: "up",
          } as Record<string, string>
        )[flow[2].toUpperCase()] || "right";
      continue;
    }
    if (
      /^(classDef|class|style|linkStyle|click|accTitle|accDescr|direction)\b/i.test(
        line,
      )
    )
      continue;
    if (/^subgraph\b/i.test(line)) {
      const g = line.replace(/^subgraph\s+/i, "").trim();
      const m = /^([^\s[]+)\s*\[([\s\S]*)\]$/.exec(g);
      const name = m ? m[2] : g;
      group = { id: m ? m[1] : name, label: name.replace(/^["']|["']$/g, "") };
      groups.push(group);
      continue;
    }
    if (/^end$/i.test(line)) {
      group = null;
      continue;
    }
    if (
      !sawFlow &&
      /^(sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|timeline|mindmap)/i.test(
        line,
      )
    ) {
      return {
        error:
          "This importer handles Mermaid flowcharts. Try “flowchart LR …”.",
      };
    }
    line = line.replace(/--\s+([^|>]+?)\s+-->/g, "-->|$1|");
    line = line.replace(/-\.\s+([^|>]+?)\s+\.->/g, "-.->|$1|");
    const { parts, conns } = mermaidSplit(line);
    if (!parts.length) continue;
    if (!conns.length) {
      addNode(mermaidNode(parts[0]));
      continue;
    }
    const parsed = parts.map((p) =>
      p
        .split(/\s*&\s*/)
        .map(mermaidNode)
        .filter((x): x is MermaidNode => !!x),
    );
    let ei = 0;
    for (let i = 0; i < parsed.length - 1; i++) {
      const A = parsed[i];
      const B = parsed[i + 1];
      if (!A.length || !B.length) continue;
      const c = conns[ei++] || { conn: "-->", label: "" };
      for (const a of A)
        for (const b of B) {
          addNode(a);
          addNode(b);
          const kind =
            c.conn === "-..->"
              ? "-..>"
              : c.conn === "-.->"
                ? "optional"
                : c.conn === "---" || c.conn === "--"
                  ? "line"
                  : c.conn === "<->" || c.conn === "<-->"
                    ? "bidirectional"
                    : "sync";
          edges.push({ from: a.id, to: b.id, kind, label: c.label || "" });
        }
    }
  }

  if (!nodes.size)
    return {
      error:
        "No nodes found. Paste a flowchart, e.g. “flowchart LR / A[Start] --> B[End]”.",
    };

  const byId = new Map<string, string>();
  const used = new Set<string>();
  const nameFor = (n: MermaidNode) => {
    if (byId.has(n.id)) return byId.get(n.id)!;
    const base =
      n.label
        .replace(/[\[\]{}]/g, "")
        .replace(/\s+/g, " ")
        .trim() || n.id;
    let name = base;
    let k = 2;
    while (used.has(name)) name = `${base} ${k++}`;
    used.add(name);
    byId.set(n.id, name);
    return name;
  };
  const decl = (n: MermaidNode) => {
    const name = nameFor(n);
    if (!n.shape || n.shape === "rectangle") return name;
    return `${name} [${n.shape}]`;
  };

  const top = [...nodes.values()].filter((n) => !n.group);
  const inGroup = (g: { id: string }) =>
    [...nodes.values()].filter((n) => n.group && n.group.id === g.id);
  let out = `direction: ${direction}\n\n`;
  for (const n of top) out += decl(n) + "\n";
  for (const g of groups) {
    const kids = inGroup(g);
    if (!kids.length) continue;
    out +=
      `\ngroup ${g.label.replace(/[{}]/g, "")} {\n` +
      kids.map((n) => "  " + decl(n)).join("\n") +
      "\n}\n";
  }
  if (edges.length) {
    out += "\n";
    for (const e of edges) {
      const arrow =
        e.kind === "-..>"
          ? "-..>"
          : e.kind === "optional"
            ? "-.->"
            : e.kind === "line"
              ? "---"
              : e.kind === "bidirectional"
                ? "<->"
                : "->";
      out += `${nameFor(nodes.get(e.from)!)} ${arrow} ${nameFor(nodes.get(e.to)!)}${e.label ? ": " + e.label : ""}\n`;
    }
  }
  return { dsl: out };
}
