# JojoPen Diagram Logic: Original vs. Current Architecture & Deep Dive

This document details how diagrams are handled in the original JojoPen implementation (`legacy/index.html`), breaks down the core diagram engine code, and provides a point-by-point comparison with the modern React + TypeScript architecture in `src/`.

---

## 1. High-Level Concept: What is a Diagram in JojoPen?

In JojoPen, a diagram is not a loose collection of disparate whiteboard shapes or lines. Instead, it is a **first-class, self-contained canvas element** (`type: "diagram"`) driven by a declarative text DSL (Domain-Specific Language).

A single diagram element encapsulates:
1. **Raw DSL text**: The human-readable structural code describing nodes, groups, and connections.
2. **Auto-layout geometry**: Topologically ranked nodes, nested group bounds, and orthogonally routed edges.
3. **Rendered SVG markup**: A single composite SVG containing the wobbly sketch filters, styled shapes, labels, semantic colors, and directional markers.

---

## 2. Diagram Handling in the Original Codebase (`legacy/index.html`)

In `legacy/index.html` (a ~11,000-line single-file HTML app), diagrams were handled through a tightly coupled mix of global mutable state, imperative DOM operations, and pure geometric math.

### 2.1 Data Structure & Factory
The legacy factory (`MAKE.diagram`, around line 2911):
```javascript
diagram: (e = {}) => ({
  ...baseElement(e, { width: 640, height: 400 }),
  type: "diagram",
  title: e.title ?? "Diagram",
  family: e.family ?? "architecture",
  dsl: e.dsl ?? "",
  layoutHints: e.layoutHints ?? {},
})
```
Every diagram element lived directly in `doc.elements[id]` with its bounding coordinates (`x`, `y`, `width`, `height`) and `dsl`.

### 2.2 Rendering on Canvas
During the monolithic canvas redraw loop (`renderCanvas()`, around line 5031):
```javascript
else if (el.type === "diagram") {
  const r = diagramFor(el.dsl || "");
  d.innerHTML = r.svg;
  if (r.parsed.diagnostics.some((x) => x.severity === "error")) {
    d.title = r.parsed.diagnostics
      .filter((x) => x.severity === "error")
      .map((x) => `line ${x.line}: ${x.message}`)
      .join("\n");
  }
}
```
The entire diagram was rendered into an SVG string via `diagramFor()` and injected directly into the DOM node via `d.innerHTML`.

### 2.3 User Interaction & State Management
- **Global Mutable State**: Stored on `S` (`S.codeDraft`, `S.codeFor`, `S.mermaidOpen`, `S.mermaidText`, etc.).
- **Editing**: Pressing `Ctrl+E` or clicking the rail icon opened the diagram code panel (`codePanelHTML()`). The textarea bound to `S.codeDraft`.
- **Applying Code**: Changes were not live-synced to the canvas while typing. The user had to click "Apply to diagram" (`applyCode()`). This ran `parseDSL()`, checked for syntax errors, computed `layoutDiagram()`, adjusted element dimensions, and initiated a full canvas repaint via `renderAll()`.
- **Mermaid Import**: A dedicated modal (`mermaidHTML()`) parsed Mermaid flowchart syntax (`flowchart LR/TD`, `subgraph`, shaped nodes) and transformed it into JojoPen DSL via `mermaidToDSL()`.

---

## 3. The 4-Stage Diagram Code Pipeline

Both the original implementation and the modern port follow a structured 4-step pipeline:

```
[ DSL Text Source ]
        │
        ▼
[ 1. Parser (parseDSL) ] ──────────> Parsed AST (Nodes, Groups, Edges, Diagnostics)
        │
        ▼
[ 2. Layout Engine (layoutDiagram) ] ─> Geometry (Ranked Nodes, Group Bounds, Routed Edges)
        │
        ▼
[ 3. SVG Generator (diagramSVG) ] ───> Vector Markup (Shapes, Rough Filter, Roles, Pills)
        │
        ▼
[ 4. Cache & Canvas Mount ] ────────> Cached in LRU & Rendered in Canvas Node
```

### Stage 1: Lexing & Parsing (`parseDSL`)
- **Directives**:
  - `direction: right | left | down | up` (aliases: `lr`, `rl`, `tb`, `td`, `bt`).
  - `title: <title string>`.
- **Groups & Hierarchy**:
  - `group Name { ... }` blocks maintain a lexical stack (`stack.push()` / `stack.pop()`).
  - Child nodes and nested sub-groups inherit parent group memberships.
- **Connectors**:
  - Recognized operators in order of length/specificity:
    - `<-->` / `<->` : Bidirectional sync
    - `-.->` : Optional (dashed)
    - `<--` / `-->` : Asynchronous (dashed with arrow)
    - `<-` / `->` : Synchronous (solid with arrow)
    - `---` / `--` : Plain association line
- **Declarations & Attributes**:
  - Bracketed attribute syntax: `NodeName [role, shape, color, icon, link, label]`.
  - Automatic shape alias resolution (`rect` -> `rectangle`, `circle` -> `ellipse`, `database` -> `cylinder`, etc.).
  - Automatic semantic role alias resolution (`actor`, `compute`, `data`, `cache`, `messaging`, `security`, `network`, etc.).
  - Implicit node registration: Any operand in an edge expression (e.g. `A -> B`) is auto-registered as a node even if not declared beforehand.
- **Error Diagnostics**: Returns line and column diagnostic objects (`severity: "error" | "warning"`), preventing parser crashes on invalid user input.

### Stage 2: Geometric Auto-Layout (`layoutDiagram`)
- **Topological DAG Layering**:
  - Constructs adjacency and in-degree maps from edge relationships.
  - Nodes with 0 in-degrees are queued and assigned topological rank 0.
  - Breadth-First Search (BFS) assigns layer ranks: $\text{rank}(v) = \max(\text{rank}(v), \text{rank}(u) + 1)$.
  - Any cycles or isolated nodes are placed in fallback ranks (`maxRank + 1`).
- **Dynamic Node Sizing (`nodeSize`)**:
  - Text is wrapped based on fontSize heuristics.
  - Dimensions are calculated dynamically:
    $$\text{width} = \text{clamp}(\text{longestLine} \times 7.2 + 46, 104, 250) + (\text{hasIcon} ? 6 : 0)$$
    $$\text{height} = 64 \text{px} \quad (\text{increased for person/ellipse/cylinder or multi-line text})$$
- **Rank Coordinate Layout**:
  - Arranges nodes along the primary axis with a rank gap (`gapPrimary = 106px`) and cross axis (`gapCross = 26px`).
  - Evenly centers all elements along the cross axis.
  - Coordinate mirroring is applied when direction is `left` or `up`.
- **Hierarchical Group Bounding Boxes (`groupBox`)**:
  - Recursively computes the minimum bounding rectangle encompassing all contained nodes and child sub-groups.
  - Applies inner padding (`pad = 26px`) and top title space (`top = 30px`).
- **Edge Routing & Overpass Bypass (`routeDiagramEdge`)**:
  - Computes orthogonal connection anchors at the boundary of node boxes.
  - **Intermediate Rank Detour**: If an edge connects nodes across intermediate rank layers (`lo + 1 < hi`), standard straight lines would cut through intervening nodes. The router computes a detour route below/around the intervening boxes:
    $$\text{offset} = 22 + (\text{skipIndex} \bmod 3) \times 14$$
    $$\text{detourY} = \max(\text{interveningMaxY}, p0.y, p1.y) + \text{offset}$$
  - Returns polyline coordinates (`pts`), SVG path data (`d`), and label placement (`labelAt`).

### Stage 3: SVG Rendering & Styling (`diagramSVG`)
- **Rough Hand-Drawn Filter**:
  - When style is `sketch`, injects an SVG `<filter id="rough">` with `<feTurbulence>` ($0.022$ frequency) and `<feDisplacementMap>` to create hand-drawn, wobbly lines. In `clean` mode, this filter is omitted.
- **Node Geometry & Icons**:
  - Generates SVG primitives for `rectangle`, `rounded`, `ellipse`, `diamond`, `cylinder`, `document`, and `person`.
  - Translates and scales SVG icons into the node's visual header.
- **Semantic Role Coloring (`nodePaint`)**:
  - Maps nodes to their assigned or inferred role (`compute`, `data`, `cache`, `network`, etc.).
  - Resolves corresponding palette triples (`fill`, `stroke`, `text`).
- **Edges & Pills**:
  - Renders connector lines, stroke dashes (`7 5` for async, `2 5` for optional), and marker heads (`#arrowhead`).
  - Edge labels are rendered inside rounded pill badges positioned at `labelAt`.

### Stage 4: Caching & Canvas Integration (`diagramFor`)
- Layout and SVG generation results are cached in an LRU map (capacity: 60 entries) keyed by:
  `${dsl}|${look}|${paletteEnabled ? "r" : "m"}`
- Prevents expensive re-parsing on regular canvas pans, zooms, or re-renders.

---

## 4. In-Depth Comparison: Original Logic vs. Current Port

| Aspect | Original (`legacy/index.html`) | Current Logic (`src/`) | Concrete Impact & Rationale |
| :--- | :--- | :--- | :--- |
| **Code Structure & Modularity** | Monolithic ~11,000-line single HTML file. Diagram code was interspersed across lines 3800–5050 and 6050–6150. | Clean modular TypeScript files in `src/lib/`: [dsl.ts](src/lib/dsl.ts), [layout.ts](src/lib/layout.ts), [diagram.ts](src/lib/diagram.ts), [mermaid.ts](src/lib/mermaid.ts), [roles.ts](src/lib/roles.ts). | **Clean Architecture**: Parsing, geometric layout math, SVG rendering, and UI controls are isolated into testable, maintainable modules. |
| **Store & Environment Coupling** | Tightly bound to global variables `S`, calling `settings()`, `styleKey()`, `paletteOn()`, `TH()`. | Pure, side-effect free functions. Functions accept an explicit, immutable `DiagramEnv` object (`{ th, look, clean, palette }`). | **Pure Engine**: The diagram pipeline can run in Node.js, Web Workers, automated CLI tools, or headless unit tests without a DOM or window instance. |
| **Canvas Node Rendering** | Imperative DOM manipulation inside `renderCanvas()`: `d.innerHTML = r.svg`. | Declarative React component in [NodeView.tsx](src/components/NodeView.tsx) using `useMemo(() => diagram(el.dsl \|\| ""), [el.type, el.dsl, ...])`. | **Optimized Re-rendering**: Diagram SVG is memoized; canvas updates only recalculate the specific diagram when its DSL or theme changes. |
| **Live Synchronization** | User had to manually click "Apply to diagram" or trigger `applyCode()` to push code to canvas. | Real-time live sync via [`updateCodeDraftAndSync`](src/state/actions.ts): valid keystrokes update the canvas diagram live, auto-adjusting bounds. | **Instant Visual Feedback**: Users immediately see architectural changes as they type, with diagnostics highlighting mistakes without breaking the canvas. |
| **Icon System Integration** | Static inline SVG string dictionary (`ICONS[name]`) with limited general-purpose icons. | Unified icon library ([iconLibrary.ts](src/lib/iconLibrary.ts)): supports Lucide icons, cloud vendor logos (AWS, GCP, Azure, K8s, Docker), brand color fills, with fallback to legacy `ICONS`. | **Richer System Architectures**: Real-world architecture diagrams can feature authentic brand logos (PostgreSQL, Kafka, Redis, AWS Lambda, etc.). |
| **Geometry Safety & Clamping** | Resizing diagrams or rapid dragging could pass negative dimensions into SVG attributes, causing console errors. | Geometry dimensions clamped strictly (`Math.max(2, w)`, `Math.max(2, h)`) before SVG markup generation. | **Zero Console Warnings**: Robust rendering under rapid interactive resize and drag events. |
| **Tidy Up & Clean It Actions** | "Tidy up" was embedded in format bar; "Clean it" was an AI assistant placeholder. | First-class actions: [`tidyCode()`](src/state/actions.ts) and [`cleanIt()`](src/state/actions.ts) re-run layout, clear cache, and adapt element dimensions cleanly. | **One-Click Polishing**: Automatically adjusts container dimensions and re-routes lines to fit the auto-layout bounds. |
| **Slide Deck Integration** | Legacy slide generator cloned static template strings. | [actions.ts: `addSlide`](src/state/actions.ts) detects `diagram` or `diagram-bullets` layouts, places diagram elements within designated slide frames, and syncs titles. | **Seamless Presentation Integration**: Diagrams automatically fit slide aspect ratios and sync with presentation agenda slides. |
| **AI Diagram Generation** | Scaffolding in assistant prompt text. | Structured action [`addDiagramFromAI`](src/state/actions.ts) parses assistant DSL outputs, calculates layout, and inserts diagrams with history tracking. | **Native AI Workflow**: AI can generate, modify, and review complete system architectures directly onto the canvas. |
| **Type Safety & Testing** | Untyped JavaScript without unit tests. | Strict TypeScript type definitions (`ParsedDiagram`, `ParsedNode`, `Layout`, `DiagramEnv`) + comprehensive Bun unit tests ([diagram.test.ts](tests/diagram.test.ts), [dsl.test.ts](tests/dsl.test.ts)). | **Regression Protection**: Node paint rules, rough filters, shape markup, and parser edge cases are validated on every build. |

---

## 5. Summary

1. **100% Algorithmic Fidelity**: The core layout logic—including DAG ranking, rank spacing, cross-axis centering, group bounding box recursion, and overpass edge detour routing—is identically preserved from the original implementation.
2. **Modularized & Pure**: The monolithic code was refactored into pure, decoupled TypeScript functions that take explicit environments and return deterministic data.
3. **Enhanced UX**: Real-time live DSL preview, multi-cloud brand icons, React memoization, and automated unit testing elevate the implementation into a production-grade system diagramming engine.
