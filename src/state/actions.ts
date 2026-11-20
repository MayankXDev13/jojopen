/* User-level actions. Components call these directly; they mutate the store,
   persist and notify as needed. */

import { clamp, deep, download, plural, slug, uid } from "../lib/dom";
import { boundsOf, arrowGeom, shapeEncloses } from "../lib/geometry";
import { layoutDiagram } from "../lib/layout";
import {
  clearDiagramCache,
  compileDiagramDoc,
  removeEdgeFromDiagramDSL,
} from "../lib/diagram";
import { fitTextBox, wrapMeasured } from "../lib/textMeasure";
import { parseDSL } from "../lib/dsl";
import { MAKE, SLIDE_H, SLIDE_W, blankDoc, normalizeDoc } from "../lib/model";
import { COLOR_KEYS } from "../lib/palette";
import {
  callAI,
  currentAI,
  extractJSON,
  loadAIConfig,
  saveAIConfig,
  AI_META,
} from "../lib/ai";
import { mermaidToDSL } from "../lib/mermaid";
import {
  resolveIcon,
  iconDataURL,
  loadIconLibrary,
  onIconLibraryLoaded,
} from "../lib/iconLibrary";
import {
  AI_SUGGESTIONS,
  SLIDE_TITLES,
  TEMPLATES,
  estimateTextHeight,
  slideGeometry,
} from "../lib/templates";
import {
  exportSVG as renderExportSVG,
  renderSlideSVG as renderSlide,
  rasterize,
  svgToDataURL,
  type ExportEnv,
} from "../lib/exportSvg";

onIconLibraryLoaded(() => {
  notify();
});
import {
  S,
  addElement,
  boardsList,
  collectionsList,
  colorFor,
  diagram,
  elements,
  fitAll,
  fontFor,
  notify,
  paletteOn,
  persist,
  pushHistory,
  removeElements,
  saveBoardCopy,
  selectionElements,
  settings,
  slideChildren,
  slideStepCount,
  slides,
  snapshot,
  sortedElements,
  theme,
  toast,
  viewportCenter,
  nextIndex,
  nextSlideOrder,
  KEY_BOARDS,
  roleColor,
} from "./store";
import { useBoardStore } from "./boardStore";

import { sotToggle, sotCloseReplay, sotResetForBoardSwitch } from "./sot";

export { AI_SUGGESTIONS };

/* ---------- panels + overlays ---------- */

export function closeOverlays() {
  useBoardStore.setState({ help: false } as any);
  useBoardStore.setState({ shortcuts: false } as any);
  useBoardStore.setState({ palette: false } as any);
  useBoardStore.setState({ exportOpen: false } as any);
  useBoardStore.setState({ connectOpen: false } as any);
  useBoardStore.setState({ iconSearch: false } as any);
  useBoardStore.setState({ renameOpen: false } as any);
  useBoardStore.setState({ mermaidOpen: false } as any);
  useBoardStore.setState({ paletteQ: "" } as any);
  notify();
}

export function setPanel(name: Exclude<any, "none"> | any) {
  const st = useBoardStore.getState();
  useBoardStore.setState({ panel: st.panel === name ? "none" : name } as any);
  useBoardStore.setState({ colorPop: false } as any);
  notify();
}

export function openMenu() {
  useBoardStore.setState({ help: !S.help } as any);
  notify();
}
export function openShortcuts() {
  useBoardStore.setState({ shortcuts: true } as any);
  notify();
}
export function openPalette() {
  useBoardStore.setState({ palette: true } as any);
  useBoardStore.setState({ paletteQ: "" } as any);
  useBoardStore.setState({ paletteIndex: 0 } as any);
  notify();
}
export function openExport() {
  loadIconLibrary().then(() => notify());
  useBoardStore.setState({ exportOpen: true } as any);
  notify();
}
export function openConnect() {
  useBoardStore.setState({ connectOpen: true } as any);
  notify();
}
export function openIconSearch() {
  loadIconLibrary().then(() => notify());
  useBoardStore.setState({ iconSearch: true } as any);
  useBoardStore.setState({ iconQuery: "" } as any);
  useBoardStore.setState({ iconCursor: 0 } as any);
  notify();
}
export function openRename() {
  useBoardStore.setState({ renameOpen: true } as any);
  notify();
}
export function openMermaid() {
  useBoardStore.setState({ mermaidOpen: true } as any);
  if (!useBoardStore.getState().mermaidText) {
    useBoardStore.setState({
      mermaidText:
        "flowchart LR\n  A[Browser] --> B(API)\n  B --> C[(Postgres)]\n  B -..-> D{{Queue}}",
    } as any);
  }
  useBoardStore.setState({ mermaidError: "" } as any);
  if (S.panel !== "code") {
    setPanel("code");
  }
  notify();
}

/* ---------- tools ---------- */

export function setTool(tool: string) {
  if (tool === "image") return pickImage();
  useBoardStore.setState({ tool: tool } as any);
  useBoardStore.setState({ colorPop: false } as any);
  if (S.panel === "none" && tool !== "select")
    useBoardStore.setState({ startOpen: true } as any);
  notify();
}

/* ---------- slides ---------- */

export function nextSlidePos() {
  const list = slides();
  if (!list.length) return { x: 64, y: 64 };
  const last = list[list.length - 1];
  return { x: last.x + last.width + 160, y: last.y };
}

export function addSlide(layout = "blank", opts: any = {}) {
  pushHistory("add slide");
  const pos = opts.pos || nextSlidePos();
  const order = nextSlideOrder();
  const slide = MAKE.slide({
    x: pos.x,
    y: pos.y,
    title: opts.title || SLIDE_TITLES[layout] || "Slide",
    layout,
    order,
  });
  addElement(slide);
  const geo = slideGeometry(layout);
  geo.texts.forEach((t, i) => {
    const text = opts.texts?.[i] ?? t.text;
    const h = estimateTextHeight(text, t.w, t.size);
    const el = MAKE.text({
      x: slide.x + t.x,
      y: slide.y + t.y,
      width: t.w,
      height: h,
      text,
      fontSize: t.size,
      align: t.align,
      frameId: slide.id,
      index: slide.index + 0.001 * (i + 1),
    });
    el.meta = { slideRole: t.role };
    addElement(el);
  });
  if (
    geo.diagramArea &&
    (opts.diagram || layout === "diagram" || layout === "diagram-bullets")
  ) {
    const a = geo.diagramArea;
    const dsl = opts.diagram || TEMPLATES.slideDiagram;
    const diag = MAKE.diagram({
      x: slide.x + a.x,
      y: slide.y + a.y,
      width: a.w,
      height: a.h,
      title: opts.title || "Diagram",
      dsl,
      frameId: slide.id,
      index: slide.index + 0.002,
    });
    addElement(diag);
    compileDiagramDoc(S.doc, diag.id, dsl);
  }
  useBoardStore.setState({ selection: new Set([slide.id]) } as any);
  persist();
  notify();
  return slide;
}

export function duplicateSlide(id: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  pushHistory("duplicate slide");
  const pos = nextSlidePos();
  const copy = MAKE.slide({
    ...deep(sl),
    id: uid(),
    x: pos.x,
    y: pos.y,
    order: nextSlideOrder(),
    index: nextIndex(),
  });
  addElement(copy);
  for (const e of slideChildren(sl)) {
    const c = deep(e);
    c.id = uid();
    c.frameId = copy.id;
    c.index = nextIndex();
    c.x = copy.x + (e.x - sl.x);
    c.y = copy.y + (e.y - sl.y);
    addElement(c);
  }
  useBoardStore.setState({ selection: new Set([copy.id]) } as any);
  notify();
  persist();
}

export function deleteSlide(id: string) {
  pushHistory("delete slide");
  const ids = new Set([
    id,
    ...slideChildren(S.doc.elements[id] || ({} as any)).map((e) => e.id),
  ]);
  removeElements([...ids]);
  S.selection.clear();
  notify();
  persist();
}

export function selectionToSlide() {
  const list = selectionElements().filter((e) => e.type !== "slide");
  if (!list.length) return toast("Select something to put on a slide");
  const b = boundsOf(list)!;
  const pos = nextSlidePos();
  pushHistory("selection to slide");
  const slide = MAKE.slide({
    x: pos.x,
    y: pos.y,
    title: list.find((e) => e.type === "diagram")?.title || "Untitled slide",
    order: nextSlideOrder(),
  });
  addElement(slide);
  const area = { x: 80, y: 100, w: SLIDE_W - 160, h: SLIDE_H - 160 };
  const scale = Math.max(
    0.2,
    Math.min(1, area.w / Math.max(1, b.width), area.h / Math.max(1, b.height)),
  );
  for (const e of list) {
    const c = deep(e);
    if (c.type === "arrow") {
      c.x = slide.x + area.x + (e.x - b.minX) * scale;
      c.y = slide.y + area.y + (e.y - b.minY) * scale;
    } else {
      c.width = Math.max(8, e.width * scale);
      c.height = Math.max(8, e.height * scale);
      c.x = slide.x + area.x + (e.x - b.minX) * scale;
      c.y = slide.y + area.y + (e.y - b.minY) * scale;
    }
    c.frameId = slide.id;
    addElement(c, { noClamp: true });
    c.x = slide.x + area.x + (e.x - b.minX) * scale;
    c.y = slide.y + area.y + (e.y - b.minY) * scale;
  }
  removeElements(list.map((e) => e.id));
  useBoardStore.setState({ selection: new Set([slide.id]) } as any);
  persist();
  notify();
  toast("Moved selection to a slide");
}

export function arrangeSlides() {
  pushHistory("arrange slides");
  let x = 64;
  const y = 64;
  const list = slides();
  list.forEach((s, i) => {
    const dx = x - s.x;
    const dy = y - s.y;
    s.x = x;
    s.y = y;
    s.order = i + 1;
    for (const c of slideChildren(s)) {
      c.x += dx;
      c.y += dy;
    }
    x += SLIDE_W + 160;
  });
  notify();
  persist();
}

export function toggleBuilds(id: string, checked: boolean) {
  const sl = S.doc.elements[id];
  if (!sl || sl.type !== "slide") return;
  pushHistory("builds");
  sl.animate = checked;
  sl.builds = [];
  persist();
  notify();
  const count = slideStepCount(S.doc, sl);
  toast(
    checked ? `Builds on · ${plural(count, "step")}` : "Builds off",
  );
}

export function buildAdd(id: string, mode: "appear" | "highlight") {
  const sl = S.doc.elements[id];
  if (!sl) return;
  const selected = selectionElements()
    .filter((e) => e.frameId === id && e.id !== id)
    .map((e) => e.id);
  const ids = selected.length ? selected : slideChildren(sl).map((e) => e.id);
  if (!ids.length) return toast("Draw something on the slide first");
  pushHistory(mode === "highlight" ? "highlight build" : "appear build");
  const ex = new Set(sl.builds || []);
  for (const x of ids) ex.add(x);
  sl.builds = [...ex];
  persist();
  notify();
  toast(
    `${mode === "highlight" ? "Highlight" : "Appear"} build added · ${plural(sl.builds.length, "step")}`,
  );
}

export function buildReplay(id: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  sl.animate = true;
  sl.builds = [];
  const idx = slides().findIndex((s) => s.id === id);
  present(Math.max(0, idx));
  if (S.present) {
    S.present.steps = 0;
    notify();
  }
}

export function renameSlide(id: string, title: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  pushHistory("rename slide");
  sl.title = title.trim() || "Slide";
  persist();
  notify();
}

export function setNotes(id: string, notes: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  pushHistory("notes");
  sl.notes = notes;
  persist();
  notify();
}

/* ---------- presentation ---------- */

export function present(index = 0) {
  const list = slides();
  if (!list.length) return toast("Add a slide first");
  useBoardStore.setState({
    present: {
      index: Math.max(0, Math.min(index, list.length - 1)),
      steps: 0,
      chrome: true,
      laser: false,
    },
  } as any);
  notify();
  if (typeof document !== "undefined") {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

export function exitPresent() {
  useBoardStore.setState({ present: null } as any);
  if (typeof document !== "undefined" && document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
  notify();
}

export function presentNav(delta: number) {
  if (!S.present) return;
  const list = slides();
  const p = S.present;
  if (delta > 0) {
    const sl = list[p.index];
    const maxSteps = sl ? slideStepCount(S.doc, sl) : 0;
    if (sl && maxSteps > p.steps) {
      p.steps++;
      notify();
      return;
    }
    if (p.index < list.length - 1) {
      p.index++;
      p.steps = 0;
      notify();
    }
  } else {
    if (p.steps > 0) {
      p.steps--;
      notify();
      return;
    }
    if (p.index > 0) {
      p.index--;
      const prevSl = list[p.index];
      p.steps = prevSl ? slideStepCount(S.doc, prevSl) : 0;
      notify();
    }
  }
}

/* ---------- diagram code ---------- */

export function compileDiagram(diagramId: string, dsl?: string) {
  const res = compileDiagramDoc(S.doc, diagramId, dsl);
  if (res?.success) {
    persist();
    notify();
  }
  return res;
}

export function codeTarget() {
  const sel = selectionElements();
  if (!sel.length) return null;
  const diagramEl = sel.find((e) => e.type === "diagram");
  if (diagramEl) return diagramEl;
  for (const el of sel) {
    if (el.frameId) {
      const parent = S.doc.elements[el.frameId];
      if (parent?.type === "diagram") return parent;
    }
  }
  return null;
}

export function syncCodeDraft() {
  const target = codeTarget();
  if (target) {
    if (S.codeFor !== target.id) {
      useBoardStore.setState({
        codeFor: target.id,
        codeDraft: target.dsl || "",
      } as any);
    }
  } else {
    if (S.codeFor !== null) {
      useBoardStore.setState({
        codeFor: null,
      } as any);
    }
  }
}

export function setCodeDraft(v: string) {
  useBoardStore.setState({ codeDraft: v } as any);
  notify();
}

export function updateCodeDraftAndSync(src: string) {
  useBoardStore.setState({ codeDraft: src } as any);
  const target = codeTarget();
  if (target) {
    const parsed = parseDSL(src);
    if (!parsed.diagnostics.some((d) => d.severity === "error")) {
      compileDiagramDoc(S.doc, target.id, src);
      clearDiagramCache();
      persist();
    }
  }
  notify();
}

export function copyCode() {
  const target = codeTarget();
  const text = S.codeDraft ?? target?.dsl ?? "";
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  }
  toast("Copied code to clipboard");
}

export function tidyCode() {
  const target = codeTarget();
  const src = S.codeDraft || target?.dsl || "";
  const parsed = parseDSL(src);
  if (parsed.diagnostics.some((d) => d.severity === "error")) {
    return toast("Fix diagram errors first");
  }
  pushHistory("tidy diagram");
  if (target) {
    compileDiagramDoc(S.doc, target.id, src);
    clearDiagramCache();
    persist();
  }
  notify();
  toast("Tidied up");
}

export function applyCode() {
  const src = S.codeDraft || "";
  const parsed = parseDSL(src);
  if (parsed.diagnostics.some((d) => d.severity === "error")) {
    notify();
    return toast("Fix the errors first");
  }
  pushHistory("code");
  const target = codeTarget();
  if (target) {
    compileDiagramDoc(S.doc, target.id, src);
    clearDiagramCache();
    persist();
    fitAll();
    toast("Diagram updated");
  } else {
    const c = viewportCenter();
    const layout = layoutDiagram(parsed);
    const Dt = 48;
    const w = layout.width + Dt * 2;
    const h = layout.height + Dt * 2;
    const el = MAKE.diagram({
      x: Math.round(c.x - w / 2),
      y: Math.round(c.y - h / 2),
      width: Math.max(240, w),
      height: Math.max(180, h),
      title: parsed.title || "Diagram",
      dsl: src,
    });
    addElement(el);
    compileDiagramDoc(S.doc, el.id, src);
    useBoardStore.setState({
      selection: new Set([el.id]),
      codeFor: el.id,
      codeDraft: src,
      panel: "code",
    } as any);
    persist();
    notify();
    fitAll();
    toast("Diagram added");
  }
}

export function validateCode() {
  const d = parseDSL(S.codeDraft || "").diagnostics;
  notify();
  toast(
    d.some((x) => x.severity === "error")
      ? "Fix the errors to apply"
      : "Looks good",
  );
}

export function newDiagram() {
  const dsl = `direction: right

User [user]
CDN [cdn]
API Gateway [gateway]

group Backend {
  Auth service
  Orders service
}

Postgres [cylinder]
Redis [redis]
Kafka [kafka]

User -> CDN -> API Gateway
API Gateway -> Auth service: verify
API Gateway -> Orders service
Orders service -> Postgres: write
Orders service -> Redis: cache
Orders service --> Kafka: order.created`;
  const parsed = parseDSL(dsl);
  const layout = layoutDiagram(parsed);
  const Dt = 48;
  const c = viewportCenter();
  const w = layout.width + Dt * 2;
  const h = layout.height + Dt * 2;
  const el = MAKE.diagram({
    x: Math.round(c.x - w / 2),
    y: Math.round(c.y - h / 2),
    width: Math.max(240, w),
    height: Math.max(180, h),
    title: parsed.title || "URL shortener",
    dsl,
  });
  pushHistory("new diagram");
  addElement(el);
  compileDiagramDoc(S.doc, el.id, dsl);
  useBoardStore.setState({
    selection: new Set([el.id]),
    codeFor: el.id,
    codeDraft: dsl,
    panel: "code",
  } as any);
  persist();
  notify();
  fitAll();
  toast("Created new diagram");
}

export function exampleCode() {
  useBoardStore.setState({ codeDraft: TEMPLATES.demo } as any);
  notify();
}

export function mermaidConvert() {
  const src = S.mermaidText || "";
  const res = mermaidToDSL(src);
  if (res.error) {
    useBoardStore.setState({ mermaidError: res.error } as any);
    notify();
    return;
  }
  useBoardStore.setState({ mermaidError: "" } as any);
  useBoardStore.setState({ mermaidOpen: false } as any);
  pushHistory("import mermaid");
  useBoardStore.setState({ codeDraft: res.dsl! } as any);
  const parsed = parseDSL(res.dsl!);
  const layout = layoutDiagram(parsed);

  const target = codeTarget();
  if (target) {
    target.dsl = res.dsl!;
    target.title = parsed.title || target.title || "Imported";
    target.width = Math.max(240, layout.width);
    target.height = Math.max(180, layout.height);
  } else {
    S.selection.clear();
    const el = MAKE.diagram({
      x: 80,
      y: 80,
      width: Math.max(240, layout.width),
      height: Math.max(180, layout.height),
      title: parsed.title || "Imported",
      dsl: res.dsl!,
    });
    addElement(el);
    useBoardStore.setState({ selection: new Set([el.id]) } as any);
    useBoardStore.setState({ codeFor: el.id } as any);
  }
  notify();
  persist();
  fitAll();
  toast("Converted Mermaid to a diagram");
}

/* ---------- assistant ---------- */

function pushMsg(m: any) {
  S.assistant.messages.push(m);
  notify();
}

export async function sendAI(text: string) {
  if (!text.trim()) return;
  const ai = currentAI(S.assistant.provider, S.assistant.model);
  if (!ai.key) {
    openConnect();
    return;
  }
  if (S.assistant.busy) return;
  pushMsg({ kind: "user", text });
  S.assistant.busy = true;
  S.assistant.abort = new AbortController();
  notify();
  try {
    const history = S.assistant.messages
      .filter((m: any) => m.kind === "user" || m.kind === "ai")
      .slice(-8)
      .map((m: any) => `${m.kind === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");
    const content = await callAI(ai, text, history, S.assistant.abort.signal);
    let data: any = null;
    try {
      data = JSON.parse(extractJSON(content));
    } catch {
      data = null;
    }
    if (!data) {
      pushMsg({ kind: "ai", text: String(content).slice(0, 1400) });
    } else {
      if (data.reply) pushMsg({ kind: "ai", text: data.reply });
      for (const a of data.actions || []) {
        if (a.type === "diagram" && a.dsl) {
          pushMsg({
            kind: "tool",
            text: `Created diagram “${a.title || "Diagram"}”`,
          });
          addDiagramFromAI(a.dsl, a.title);
        } else if (a.type === "deck" && Array.isArray(a.slides)) {
          addDeckFromAI(a.slides);
          pushMsg({
            kind: "tool",
            text: `Created ${plural(a.slides.length, "slide")}`,
          });
        }
      }
      notify();
    }
  } catch (err: any) {
    pushMsg({
      kind: "error",
      text:
        err?.name === "AbortError"
          ? "Stopped."
          : err?.message || "Request failed",
    });
  } finally {
    S.assistant.busy = false;
    S.assistant.abort = null;
    notify();
  }
}

export function stopAI() {
  S.assistant.abort?.abort();
}

export function addDiagramFromAI(dsl: string, title?: string) {
  pushHistory("ai diagram");
  const parsed = parseDSL(dsl);
  const layout = layoutDiagram(parsed);
  const c = viewportCenter();
  const el = MAKE.diagram({
    x: Math.round(c.x - layout.width / 2),
    y: Math.round(c.y - layout.height / 2),
    width: layout.width,
    height: layout.height,
    title: title || parsed.title || "Diagram",
    dsl,
  });
  addElement(el);
  useBoardStore.setState({ selection: new Set([el.id]) } as any);
  persist();
  notify();
}

export function addDeckFromAI(slidesIn: any[]) {
  pushHistory("ai deck");
  for (const s of slidesIn) {
    const layout = [
      "title",
      "section",
      "bullets",
      "diagram",
      "diagram-bullets",
      "blank",
    ].includes(s.layout)
      ? s.layout
      : "bullets";
    const texts: string[] = [];
    if (layout === "title")
      texts.push(s.title || "Presentation title", s.subtitle || "");
    else if (layout === "section")
      texts.push(s.title || "Section title", s.subtitle || "");
    else if (layout === "bullets")
      texts.push(
        s.title || "Slide title",
        (s.bullets || []).map((b: string) => "•  " + b).join("\n"),
      );
    else if (layout === "diagram") texts.push(s.title || "How it works");
    else if (layout === "diagram-bullets")
      texts.push(
        s.title || "How it works",
        (s.bullets || []).map((b: string) => "•  " + b).join("\n"),
      );
    addSlide(layout, {
      title: s.title,
      texts,
      diagram: s.diagram,
      notes: s.notes,
    });
  }
}

export function saveAIKey(
  provider: string,
  key: string,
  model: string,
  baseUrl: string,
) {
  const cfg = loadAIConfig();
  cfg.provider = provider;
  cfg.model = model || AI_META[provider].model;
  cfg.baseUrl = baseUrl;
  cfg.keys = { ...(cfg.keys || {}), [provider]: key };
  saveAIConfig(cfg);
  useBoardStore.setState({ connectOpen: false } as any);
  useBoardStore.setState({ connectProvider: null } as any);
  useBoardStore.setState({ connectModel: null } as any);
  notify();
  toast("AI connected");
}

export function forgetKey() {
  const cfg = loadAIConfig();
  const provider = cfg.provider || "anthropic";
  if (cfg.keys) delete cfg.keys[provider];
  saveAIConfig(cfg);
  notify();
  toast("Key forgotten");
}

/* ---------- boards ---------- */

export function saveRename(name: string, newId?: string) {
  const v =
    name.trim() || useBoardStore.getState().doc.name || "Untitled board";
  const prevId = useBoardStore.getState().doc.id;
  const trimmedId = newId?.trim();
  const id = trimmedId && trimmedId !== prevId ? trimmedId : prevId;
  useBoardStore.setState({
    doc: { ...useBoardStore.getState().doc, name: v, id },
  } as any);
  if (id !== prevId) {
    saveBoardCopy();
    if (typeof history !== "undefined" && typeof window !== "undefined") {
      const segments = window.location.pathname.split("/").filter(Boolean);
      if (segments.length >= 3) {
        segments[2] = id;
        window.history.replaceState(null, "", "/" + segments.join("/"));
      }
    }
  }
  persist(true);
  useBoardStore.setState({ renameOpen: false } as any);
  notify();
}

export function copyBoardLink() {
  saveBoardCopy();
  let link = "";
  if (typeof window !== "undefined") {
    const host = window.location.host.replace(/^\/+/, "");
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const slugVal =
        segments[2] ||
        `${slug(S.doc.name || "board")}-${(S.doc.id || "xn9jzgl0").slice(0, 8)}`;
      link = `${window.location.protocol}//${host}/${segments[0]}/${segments[1]}/${slugVal}`;
    } else {
      const username =
        (typeof localStorage !== "undefined" &&
          localStorage.getItem("jojopen.user.v1")) ||
        "mayanknair";
      const col =
        collectionsList().find(
          (c) => c.id === (S.doc.collectionId || S.activeCollection),
        )?.name || "jojo";
      const slugVal = `${slug(S.doc.name || "board")}-${(S.doc.id || "xn9jzgl0").slice(0, 8)}`;
      link = `${window.location.protocol}//${host}/${username}/${col}/${slugVal}`;
    }
  } else {
    link = `https://jojopen.com/mayanknair/jojo/${slug(S.doc.name || "board")}-${(S.doc.id || "xn9jzgl0").slice(0, 8)}`;
  }
  navigator.clipboard
    ?.writeText(link)
    .then(() => toast("Board link copied"))
    .catch(() => toast(link));
}

export function newBoard() {
  sotResetForBoardSwitch();
  saveBoardCopy();
  const doc = blankDoc("Untitled board");
  doc.collectionId = S.activeCollection || "col-jojo";
  useBoardStore.setState({ doc } as any);
  S.selection.clear();
  useBoardStore.setState({ history: [] } as any);
  useBoardStore.setState({ future: [] } as any);
  useBoardStore.setState({ timeline: [] } as any);
  useBoardStore.setState({ camera: { x: 80, y: 80, zoom: 1 } } as any);
  useBoardStore.setState({ startOpen: false } as any);
  useBoardStore.setState({ panel: "none" } as any);
  if (typeof location !== "undefined") location.hash = "";
  notify();
  persist(true);
  toast("New board");
}

export function openBoard(id: string) {
  try {
    sotResetForBoardSwitch();
    saveBoardCopy();
    let raw =
      localStorage.getItem("jojopen.board." + id) ||
      (S.doc.id === id ? JSON.stringify(S.doc) : null);
    if (!raw) {
      const b = boardsList().find((x: any) => x.id === id);
      if (b) {
        const doc = blankDoc(b.name);
        doc.id = id;
        doc.collectionId = b.collectionId || "col-jojo";
        raw = JSON.stringify(doc);
        localStorage.setItem("jojopen.board." + id, raw);
      }
    }
    if (!raw) return toast("Board not found");
    useBoardStore.setState({ doc: normalizeDoc(JSON.parse(raw)) } as any);
    S.selection.clear();
    useBoardStore.setState({ history: [] } as any);
    useBoardStore.setState({ future: [] } as any);
    useBoardStore.setState({ timeline: [] } as any);
    useBoardStore.setState({ camera: { x: 0, y: 0, zoom: 1 } } as any);
    history.replaceState(null, "", "#/b/" + id);
    notify();
    persist();
    toast("Opened " + S.doc.name);
  } catch {
    toast("Could not open board");
  }
}

export function deleteBoard(id: string, skipConfirm = true) {
  if (
    !skipConfirm &&
    typeof confirm !== "undefined" &&
    !confirm("Delete this board? This cannot be undone.")
  )
    return;
  const list = boardsList().filter((b: any) => b.id !== id);
  localStorage.setItem(KEY_BOARDS, JSON.stringify(list));
  localStorage.removeItem("jojopen.board." + id);
  if (id === S.doc.id) newBoard();
  notify();
}

export function downloadJSON() {
  const data = {
    app: "JojoPen",
    exportedAt: new Date().toISOString(),
    doc: S.doc,
  };
  download(
    slug(S.doc.name || "board") + ".jojopen.json",
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
}

export function importJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const doc = j.doc || j;
      if (!doc.elements) throw new Error("Not a JojoPen file");
      saveBoardCopy();
      useBoardStore.setState({
        doc: normalizeDoc({
          ...doc,
          id: uid(),
          name: doc.name || f.name.replace(/\.json$/, ""),
        }),
      } as any);
      S.selection.clear();
      useBoardStore.setState({ history: [] } as any);
      useBoardStore.setState({ future: [] } as any);
      useBoardStore.setState({ timeline: [] } as any);
      useBoardStore.setState({ camera: { x: 0, y: 0, zoom: 1 } } as any);
      notify();
      persist(true);
      fitAll();
      toast("Imported " + S.doc.name);
    } catch {
      toast("Could not read that file");
    }
  };
  input.click();
}

export function applyTemplate(id: string) {
  useBoardStore.setState({ startOpen: true } as any);
  if (id === "system" || id === "flow") {
    pushHistory("template");
    const dsl = id === "system" ? TEMPLATES.system : TEMPLATES.flow;
    const parsed = parseDSL(dsl);
    const layout = layoutDiagram(parsed);
    const Dt = 48;
    const el = MAKE.diagram({
      x: 0,
      y: 0,
      width: layout.width + Dt * 2,
      height: layout.height + Dt * 2,
      title:
        parsed.title || (id === "system" ? "URL shortener" : "Sign-up flow"),
      dsl,
    });
    addElement(el);
    compileDiagramDoc(S.doc, el.id, dsl);
    useBoardStore.setState({
      doc: {
        ...useBoardStore.getState().doc,
        name: id === "system" ? "URL shortener" : "Sign-up flow",
      },
      selection: new Set([el.id]),
      codeFor: el.id,
      codeDraft: dsl,
      panel: "code",
    } as any);
    notify();
    persist(true);
    fitAll();
    return toast("Added " + el.title);
  }
  if (id === "deck") {
    useBoardStore.setState({
      doc: { ...useBoardStore.getState().doc, name: "Slide deck" },
    } as any);
    addSlide("title", {
      title: "Your talk title",
      texts: ["Your talk title", "A short subtitle"],
    });
    addSlide("bullets", {
      title: "Agenda",
      texts: ["Agenda", "•  The problem\n•  How it works\n•  What we learned"],
    });
    addSlide("diagram-bullets", {
      title: "How it works",
      texts: [
        "How it works",
        "•  Reads hit the cache first\n•  Misses fall back to the database",
      ],
      diagram: TEMPLATES.slideDiagram,
    });
    setPanel("slides");
    notify();
    persist(true);
    setTimeout(fitAll, 30);
  }
}

/* ---------- editing ---------- */

export function copySelection() {
  const list = selectionElements();
  if (!list.length) return toast("Select something first");
  useBoardStore.setState({
    clipboard: { elements: deep(list), files: {} },
  } as any);
  for (const e of list)
    if (e.type === "image" && S.doc.files[e.fileId])
      S.clipboard.files[e.fileId] = S.doc.files[e.fileId];
  toast(`${plural(list.length, "element")} copied`);
}

export function cutSelection() {
  copySelection();
  deleteSelection();
}

export function pasteClipboard() {
  if (!S.clipboard?.elements?.length) return toast("Nothing to paste");
  pushHistory("paste");
  const map = new Map<string, string>();
  for (const e of S.clipboard.elements) map.set(e.id, uid());
  const ids: string[] = [];
  Object.assign(S.doc.files, S.clipboard.files || {});
  for (const src of S.clipboard.elements) {
    const e = deep(src);
    e.id = map.get(src.id)!;
    e.index = nextIndex();
    e.x += 24;
    e.y += 24;
    if (e.frameId && map.has(e.frameId)) e.frameId = map.get(e.frameId);
    if (e.type === "arrow") {
      if (e.start?.elementId && map.has(e.start.elementId))
        e.start = { ...e.start, elementId: map.get(e.start.elementId) };
      if (e.end?.elementId && map.has(e.end.elementId))
        e.end = { ...e.end, elementId: map.get(e.end.elementId) };
    }
    S.doc.elements[e.id] = e;
    ids.push(e.id);
  }
  useBoardStore.setState({ selection: new Set(ids) } as any);
  notify();
  persist();
  toast("Pasted");
}

export function duplicateSelection() {
  if (!S.selection.size) return toast("Select something first");
  copySelection();
  pasteClipboard();
}

export function deleteSelection() {
  if (!S.selection.size) return;
  pushHistory("delete");
  const ids = [...S.selection];
  for (const id of ids) {
    const e = S.doc.elements[id];
    if (e?.type === "slide") for (const c of slideChildren(e)) ids.push(c.id);
    if (e?.type === "diagram") {
      for (const c of elements()) {
        if (c.frameId === id) ids.push(c.id);
      }
    }
    if (e?.type === "arrow" && e.frameId) {
      const diag = S.doc.elements[e.frameId];
      if (diag && diag.type === "diagram" && diag.dsl) {
        const fromEl = e.start?.elementId
          ? S.doc.elements[e.start.elementId]
          : null;
        const toEl = e.end?.elementId ? S.doc.elements[e.end.elementId] : null;
        diag.dsl = removeEdgeFromDiagramDSL(diag.dsl, {
          fromKey:
            (e.meta as any)?.dslFrom ||
            (fromEl?.meta as any)?.dslKey ||
            fromEl?.label,
          toKey:
            (e.meta as any)?.dslTo ||
            (toEl?.meta as any)?.dslKey ||
            toEl?.label,
          label: e.label,
          lineNo: (e.meta as any)?.dslLine,
          meta: e.meta,
        });
      }
    }
  }
  removeElements([...new Set(ids)]);
  S.selection.clear();
  notify();
  persist();
}

export function selectAll() {
  useBoardStore.setState({
    selection: new Set(elements().map((e) => e.id)),
  } as any);
  notify();
}

export function clearSelection() {
  S.selection.clear();
  notify();
}

export function nudge(dx: number, dy: number) {
  const list = selectionElements().filter((e) => !e.locked);
  if (!list.length) return;
  const step = S._shift ? 1 : settings().snapToGrid ? settings().gridSize : 1;
  pushHistory("move");
  for (const e of list) {
    e.x += dx * step;
    e.y += dy * step;
    if (e.type === "slide")
      for (const c of slideChildren(e)) {
        c.x += dx * step;
        c.y += dy * step;
      }
  }
  notify();
  persist();
}

export function beginEdit(id: string) {
  const el = S.doc.elements[id];
  if (!el || el.locked) return;
  useBoardStore.setState({ editingId: id } as any);
  notify();
}

export function editLabel() {
  if (S.selection.size !== 1) return;
  const e = selectionElements()[0];
  if (!e || e.locked) return;
  if (e.type === "diagram") {
    useBoardStore.setState({ codeFor: e.id } as any);
    useBoardStore.setState({ codeDraft: e.dsl } as any);
    setPanel("code");
    return;
  }
  if (e.type === "slide")
    return beginEdit(e.id);
  beginEdit(e.id);
}

/** Commit the inline text editor's value back into the element (original xA).
    Single trailing-trim; Escape/blur/Cmd+Enter all commit, never discard. */
export function commitEdit(id: string, value: string) {
  const el = S.doc.elements[id];
  useBoardStore.setState({ editingId: null } as any);
  if (!el) {
    notify();
    return;
  }
  pushHistory("edit text");
  const v = value.replace(/\s+$/, "");
  if (el.type === "arrow") {
    el.label = v;
    el.originalText = v;
  } else if (el.type === "text") {
    if (!v) {
      removeElements([id]);
      S.selection.delete(id);
    } else {
      el.text = v;
      el.originalText = v;
      // Measured fit: autoSize grows width, fixed-width grows height only.
      const clean = settings().style === "clean";
      const family = clean ? "Inter,system-ui,sans-serif" : fontFor(el);
      const box = fitTextBox({
        text: v,
        fontSize: el.fontSize || 18,
        fontFamily: family,
        autoSize: el.autoSize !== false,
        fixedWidth: el.width,
        zoom: 1,
      });
      if (el.autoSize !== false) el.width = box.width;
      el.height = box.height;
    }
  } else if (el.type === "sticky") {
    // Original stores text only; the fixed note never resizes on commit.
    el.text = v;
    el.originalText = v;
  } else if (el.type === "shape" && el.shape !== undefined) {
    // Original Dj: grow-only box to fit the label (width to longest word).
    el.label = v;
    el.originalText = v;
    const fs = 14 * (el.textScale ?? 1);
    const words = v.split(/\s+/).filter(Boolean);
    const longest = measureWordWidth(
      words,
      `500 ${fs}px Inter,system-ui,sans-serif`,
    );
    const grid = Math.max(1, settings().gridSize || 16);
    const quant = (n: number) => Math.ceil(n / grid) * grid;
    const newW = Math.max(el.width, 120, quant(longest + 48));
    const lines = wrapMeasured(
      v,
      Math.max(60, newW - 24),
      `${fs}px Inter,system-ui,sans-serif`,
    );
    el.width = newW;
    el.height = Math.max(el.height, 48, quant(lines.length * fs * 1.25 + 24));
  } else el.label = v;
  notify();
  persist();
}

/** Widest word in px via canvas measure (original Ft width). */
function measureWordWidth(words: string[], font: string): number {
  try {
    const c = document.createElement("canvas").getContext("2d");
    if (!c) return Math.max(...words.map((w) => w.length * 8), 0);
    c.font = font;
    return Math.max(0, ...words.map((w) => c.measureText(w).width));
  } catch {
    return Math.max(...words.map((w) => w.length * 8), 0);
  }
}

export function groupSelection() {
  if (S.selection.size < 2) return toast("Select two or more elements");
  pushHistory("group");
  const gid = uid();
  for (const e of selectionElements())
    e.groupIds = [...(e.groupIds || []), gid];
  notify();
  persist();
  toast("Grouped");
}

export function ungroupSelection() {
  const gids = new Set(selectionElements().flatMap((e) => e.groupIds || []));
  if (!gids.size) return toast("Nothing is grouped");
  pushHistory("ungroup");
  for (const e of elements())
    e.groupIds = (e.groupIds || []).filter((g) => !gids.has(g));
  notify();
  persist();
  toast("Ungrouped");
}

export function orderSelection(kind: string) {
  const sel = selectionElements();
  if (!sel.length) return;
  pushHistory("arrange");
  const list = sortedElements();
  const set = new Set(sel.map((e) => e.id));
  if (kind === "front") {
    for (const e of sel) list.splice(list.indexOf(e), 1);
    list.push(...sel);
  } else if (kind === "back") {
    for (const e of sel) list.splice(list.indexOf(e), 1);
    list.unshift(...sel);
  } else if (kind === "forward") {
    for (let i = list.length - 2; i >= 0; i--)
      if (set.has(list[i].id) && !set.has(list[i + 1].id))
        [list[i], list[i + 1]] = [list[i + 1], list[i]];
  } else {
    for (let i = 1; i < list.length; i++)
      if (set.has(list[i].id) && !set.has(list[i - 1].id))
        [list[i], list[i - 1]] = [list[i - 1], list[i]];
  }
  list.forEach((e, i) => {
    e.index = i + 1;
  });
  notify();
  persist();
}

export function toggleLock() {
  const list = selectionElements();
  if (!list.length) return;
  const lock = !list.every((e) => e.locked);
  pushHistory("lock");
  list.forEach((e) => {
    e.locked = lock;
  });
  notify();
  persist();
  toast(lock ? "Locked" : "Unlocked");
}

export function toggleTheme() {
  const t = useBoardStore.getState().themePref;
  useBoardStore.setState({
    themePref: t === "system" ? "dark" : t === "dark" ? "light" : "system",
  } as any);
  notify();
  persist();
}

export function toggleBw() {
  settings().palette =
    (settings().palette ?? "roles") === "mono" ? "roles" : "mono";
  notify();
  persist();
}

export function toggleSnap() {
  settings().snapToGrid = !settings().snapToGrid;
  notify();
  persist();
}

export function toggleGrid() {
  settings().showGrid = !settings().showGrid;
  notify();
  persist();
}

export function toggleZen() {
  useBoardStore.setState({ zen: !S.zen } as any);
  notify();
}

export function toggleFont() {
  settings().handFont =
    settings().handFont === "kalam" ? "excalifont" : "kalam";
  notify();
  persist();
  toast(settings().handFont === "kalam" ? "Kalam" : "Excalifont");
}

export function cleanIt() {
  const diagrams = S.selection.size
    ? selectionElements().filter((e) => e.type === "diagram")
    : elements().filter((e) => e.type === "diagram");
  if (!diagrams.length) return toast("Add a diagram first");
  pushHistory("clean it");
  let n = 0;
  for (const d of diagrams) {
    const parsed = parseDSL(d.dsl || "");
    if (parsed.diagnostics.some((x) => x.severity === "error")) continue;
    compileDiagramDoc(S.doc, d.id, d.dsl || "");
    n++;
  }
  clearDiagramCache();
  notify();
  persist();
  toast(n ? `Cleaned up ${plural(n, "diagram")}` : "Fix diagram errors first");
}

export function applyColor(color: string) {
  pushHistory("color");
  selectionElements().forEach((e) => {
    e.color = color;
    e.colorLocked = true;
  });
  persist();
  notify();
}

export function autoColor() {
  pushHistory("auto color");
  selectionElements().forEach((e) => {
    e.colorLocked = false;
    e.color = null;
  });
  notify();
}

export function randomColors() {
  pushHistory("random colors");
  const isRandom =
    settings().palette === "random" || useBoardStore.getState().randomMode;
  const nextMode = !isRandom;
  settings().palette = nextMode ? "random" : "roles";
  useBoardStore.setState({ randomMode: nextMode } as any);
  if (nextMode) {
    const vibrant = COLOR_KEYS.filter((k) => k !== "gray" && k !== "ink");
    const keys = [...vibrant].sort(() => Math.random() - 0.5);
    elements()
      .filter(
        (e) =>
          e.type === "shape" ||
          e.type === "container" ||
          e.type === "arrow" ||
          e.type === "freehand",
      )
      .forEach((e, i) => {
        e.color = keys[i % keys.length];
        e.colorLocked = true;
      });
    toast("Random colors");
  } else {
    elements().forEach((e) => {
      e.colorLocked = false;
      e.color = null;
    });
    toast("Random colors off");
  }
  notify();
  persist();
}

export function toggleNoFill() {
  pushHistory("fill");
  const shapes = selectionElements().filter((e) => e.type === "shape");
  const all = shapes.every((e) => e.noFill);
  shapes.forEach((e) => {
    e.noFill = !all;
  });
  notify();
}

/** Automatically ensures enclosing shapes have noFill: true and sit behind their inner shapes. */
export function syncEnclosedShapes(targetEl?: any) {
  const shapes = elements().filter((x) => x.type === "shape");
  if (shapes.length < 2) return;

  if (targetEl && targetEl.type === "shape") {
    const contained = shapes.filter(
      (s) => s.id !== targetEl.id && shapeEncloses(targetEl, s),
    );
    if (contained.length > 0) {
      targetEl.noFill = true;
      const sorted = sortedElements();
      const elIdx = sorted.findIndex((x) => x.id === targetEl.id);
      if (elIdx !== -1) {
        sorted.splice(elIdx, 1);
        const insertIdx = sorted.findIndex((x) =>
          contained.some((c) => c.id === x.id),
        );
        if (insertIdx !== -1) {
          sorted.splice(insertIdx, 0, targetEl);
        } else {
          sorted.unshift(targetEl);
        }
        sorted.forEach((item, i) => {
          item.index = i + 1;
        });
      }
    }
    for (const other of shapes) {
      if (other.id !== targetEl.id && shapeEncloses(other, targetEl)) {
        other.noFill = true;
      }
    }
  } else {
    for (const outer of shapes) {
      const hasContained = shapes.some(
        (inner) => inner.id !== outer.id && shapeEncloses(outer, inner),
      );
      if (hasContained) {
        outer.noFill = true;
      }
    }
  }
}

export function setShape(shape: string) {
  pushHistory("shape");
  selectionElements()
    .filter((e) => e.type === "shape")
    .forEach((e) => {
      e.shape = shape;
    });
  notify();
}

export function setRoute(route: string) {
  pushHistory("route");
  selectionElements()
    .filter((e) => e.type === "arrow")
    .forEach((e) => {
      e.routeMode = route;
      // Switching modes returns to automatic routing (original: route auto).
      e.route = "auto";
      const pts = (e.points || []).map((p) => ({ x: e.x + p.x, y: e.y + p.y }));
      if (pts.length >= 2) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        e.points = [
          { x: a.x - e.x, y: a.y - e.y },
          { x: b.x - e.x, y: b.y - e.y },
        ];
      }
    });
  notify();
  persist();
}

export function toggleDash() {
  pushHistory("dash");
  const arrows = selectionElements().filter((e) => e.type === "arrow");
  const allDashed =
    arrows.length > 0 && arrows.every((e) => (e as any).dash === "dashed");
  arrows.forEach((e) => {
    (e as any).dash = allDashed ? "solid" : "dashed";
  });
  notify();
  persist();
}

/** Forget hand-made bends and route automatically around boxes (original Re-route). */
export function rerouteSelection() {
  const list = selectionElements().filter(
    (e) => e.type === "arrow" && !e.locked,
  );
  if (!list.length) return;
  pushHistory("re-route");
  for (const e of list) {
    const pts = (e.points || []).map((p) => ({ x: e.x + p.x, y: e.y + p.y }));
    if (pts.length < 2) continue;
    const a = pts[0];
    const b = pts[pts.length - 1];
    e.x = a.x;
    e.y = a.y;
    e.points = [
      { x: 0, y: 0 },
      { x: b.x - a.x, y: b.y - a.y },
    ];
    e.route = "auto";
  }
  notify();
  persist();
}

/* Live text-size step scales (see live bundle `Uj`/`Bj`). */
export const TEXT_STEPS = [12, 14, 16, 18, 22, 28, 36, 48, 64, 80, 96];
export const TEXT_SCALES = [0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/** Display value for the A-/A+ control: px for text, × factor otherwise. */
export function textSizeLabel(e: {
  type: string;
  fontSize?: number;
  textScale?: number;
}): string {
  return e.type === "text" ? `${e.fontSize ?? 18}px` : `${e.textScale ?? 1}×`;
}

export function bumpText(delta: number) {
  /* Live parity (`Im`): A-/A+ change text size only, never the box.
     Text elements step fontSize (box follows proportionally); shapes and
     stickies step a textScale factor applied to the label. */
  pushHistory(delta > 0 ? "bigger text" : "smaller text");
  const stepUp = (scale: number[], cur: number) =>
    scale.find((v) => v > cur + 1e-6) ?? scale[scale.length - 1];
  const stepDown = (scale: number[], cur: number) =>
    [...scale].reverse().find((v) => v < cur - 1e-6) ?? scale[0];
  const step = (scale: number[], cur: number) =>
    delta > 0 ? stepUp(scale, cur) : stepDown(scale, cur);
  selectionElements().forEach((e) => {
    if (e.locked) return;
    if (e.type === "text") {
      const next = step(TEXT_STEPS, e.fontSize ?? 18);
      if (next === (e.fontSize ?? 18)) return;
      const k = next / (e.fontSize ?? 18);
      e.fontSize = next;
      e.width = Math.max(16, Math.round(e.width * k));
      e.height = Math.max(16, Math.round(e.height * k));
      return;
    }
    if (e.type === "shape" || e.type === "sticky") {
      e.textScale = step(TEXT_SCALES, e.textScale ?? 1);
    }
  });
  notify();
}

/** Scale the selection to a target multiplier (e.g. 1x, 1.5x, 2x). */
export function scaleSelection(targetScale: number) {
  const selected = selectionElements().filter((e) => !e.locked);
  if (!selected.length) return;

  pushHistory("scale");
  const processed = new Set<string>();

  selected.forEach((e) => {
    if (processed.has(e.id)) return;

    // If element is a diagram or child of a diagram, scale the diagram and all its contents
    const diagramEl =
      e.type === "diagram"
        ? e
        : e.frameId && S.doc.elements[e.frameId]?.type === "diagram"
          ? S.doc.elements[e.frameId]
          : null;

    if (diagramEl) {
      if (processed.has(diagramEl.id)) return;
      processed.add(diagramEl.id);

      const currentScale = (diagramEl as any).scale ?? 1;
      const factor = targetScale / currentScale;
      (diagramEl as any).scale = targetScale;

      if (Math.abs(factor - 1) > 1e-4) {
        diagramEl.width = Math.max(16, Math.round(diagramEl.width * factor));
        diagramEl.height = Math.max(16, Math.round(diagramEl.height * factor));

        const children = elements().filter((c) => c.frameId === diagramEl.id);
        for (const c of children) {
          processed.add(c.id);
          c.x = Math.round(diagramEl.x + (c.x - diagramEl.x) * factor);
          c.y = Math.round(diagramEl.y + (c.y - diagramEl.y) * factor);
          c.width = Math.max(16, Math.round(c.width * factor));
          c.height = Math.max(16, Math.round(c.height * factor));
          if (c.type === "shape" || c.type === "sticky") {
            c.textScale = (c.textScale ?? 1) * factor;
          }
          if (typeof c.fontSize === "number") {
            c.fontSize = clamp(Math.round(c.fontSize * factor), 8, 160);
          }
          if (Array.isArray(c.points)) {
            c.points = c.points.map((pt) => ({
              x: Math.round(pt.x * factor),
              y: Math.round(pt.y * factor),
            }));
          }
          (c as any).scale = targetScale;
        }
      }
      return;
    }

    processed.add(e.id);
    const currentScale = (e as any).scale ?? 1;
    const factor = targetScale / currentScale;
    (e as any).scale = targetScale;

    if (Math.abs(factor - 1) > 1e-4) {
      if (e.type === "text") {
        e.fontSize = clamp(Math.round((e.fontSize ?? 18) * factor), 8, 160);
        return;
      }
      if (["shape", "sticky", "container", "image"].includes(e.type)) {
        e.width = Math.max(16, Math.round(e.width * factor));
        e.height = Math.max(16, Math.round(e.height * factor));
        if (e.type === "shape" || e.type === "sticky") {
          e.textScale = (e.textScale ?? 1) * factor;
        }
        if (typeof e.fontSize === "number")
          e.fontSize = clamp(Math.round(e.fontSize * factor), 8, 160);
      }
    }
  });

  notify();
  persist();
}

export type IconInsertMode = "box" | "icon";

const ICON_MODE_KEY = "jojopen:iconInsertMode";

export function getIconMode(): IconInsertMode {
  try {
    return localStorage.getItem(ICON_MODE_KEY) === "box" ? "box" : "icon";
  } catch {
    return "icon";
  }
}

export function setIconMode(mode: IconInsertMode) {
  try {
    localStorage.setItem(ICON_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  notify();
}

/** Box mode: an empty outline box with the icon on its edge (press Enter on it to type). */
export function insertIconBox(icon: string) {
  if (!resolveIcon(icon)) return;
  pushHistory("add icon box");
  const c = viewportCenter();
  const el = MAKE.shape({
    x: Math.round(c.x - 100),
    y: Math.round(c.y - 36),
    width: 200,
    height: 72,
    icon,
    iconEdge: true,
    label: "",
    shape: "rounded",
    noFill: true,
  });
  addElement(el);
  useBoardStore.setState({ selection: new Set([el.id]) } as any);
  useBoardStore.setState({ iconSearch: false } as any);
  useBoardStore.setState({ tool: "select" } as any);
  notify();
  persist();
}

/** Icon-only mode: just the icon as a standalone square image. */
export function insertIconOnly(icon: string) {
  const def = resolveIcon(icon);
  if (!def) return;
  pushHistory("add icon");
  const c = viewportCenter();
  const dark = document.querySelector?.('.app[data-theme="dark"]') != null;
  const ink = theme().ink || (dark ? "#ededec" : "#1c1b19");
  const dataUrl = iconDataURL(icon, ink, dark);
  if (!dataUrl) return;
  const fileId = `icon-${def.id}-ink`;
  S.doc.files[fileId] = dataUrl;
  const size = 96;
  const el = MAKE.image({
    x: Math.round(c.x - size / 2),
    y: Math.round(c.y - size / 2),
    width: size,
    height: size,
    fileId,
  });
  el.meta = { ...(el.meta || {}), icon: def.id };
  addElement(el);
  useBoardStore.setState({ selection: new Set([el.id]) } as any);
  useBoardStore.setState({ iconSearch: false } as any);
  useBoardStore.setState({ tool: "select" } as any);
  notify();
  persist();
}

export function insertIcon(icon: string) {
  if (getIconMode() === "box") return insertIconBox(icon);
  return insertIconOnly(icon);
}

/* ---------- images ---------- */

export function placeImage(
  dataUrl: string,
  naturalW: number,
  naturalH: number,
) {
  const c = viewportCenter();
  const maxW = 480;
  const maxH = 360;
  const k = Math.min(1, maxW / naturalW, maxH / naturalH);
  const w = Math.max(40, naturalW * k);
  const h = Math.max(40, naturalH * k);
  const fileId = uid();
  S.doc.files[fileId] = dataUrl;
  pushHistory("add image");
  const el = MAKE.image({
    x: Math.round(c.x - w / 2),
    y: Math.round(c.y - h / 2),
    width: Math.round(w),
    height: Math.round(h),
    fileId,
  });
  addElement(el);
  useBoardStore.setState({ selection: new Set([el.id]) } as any);
  notify();
  persist();
}

export function pickImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const f = input.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () =>
        placeImage(String(fr.result), img.naturalWidth, img.naturalHeight);
      img.src = String(fr.result);
    };
    fr.readAsDataURL(f);
  };
  input.click();
}

/* ---------- export ---------- */

export function exportState() {
  return {
    scope: "board",
    format: "png",
    scale: 2,
    bg: true,
    dark: false,
    ...(S.exportOpts || {}),
  } as any;
}

export function setExportOpts(patch: any) {
  useBoardStore.setState({ exportOpts: { ...exportState(), ...patch } } as any);
  if (patch.scope === "slides") S.exportOpts.format = "pdf";
  notify();
}

function withExportTheme<T>(fn: () => T): T {
  const prevTheme = S.themePref;
  const prevPal = S.doc.settings.palette;
  if (S.exportOpts?.dark) useBoardStore.setState({ themePref: "dark" } as any);
  if (S.exportOpts?.palette === "mono") S.doc.settings.palette = "mono";
  try {
    return fn();
  } finally {
    useBoardStore.setState({ themePref: prevTheme } as any);
    S.doc.settings.palette = prevPal;
  }
}

function exportEnv(): ExportEnv {
  return {
    th: theme(),
    clean: settings().style === "clean",
    colorFor,
    files: S.doc.files,
    slides: slides(),
    diagramFor: diagram,
    arrowGeom: (el) => arrowGeom(el, (id) => S.doc.elements[id], theme()),
  };
}

export function exportBounds(scope: string) {
  const list = scope === "selection" ? selectionElements() : elements();
  return boundsOf(list);
}

export function currentExportSVG(scope: string, opts: { bg?: boolean } = {}) {
  const list = scope === "selection" ? selectionElements() : sortedElements();
  return renderExportSVG(list, boundsOf(list), exportEnv(), opts);
}

export function exportSizeLabel(o: any) {
  const b = exportBounds(o.scope);
  if (!b) return "Nothing to export yet";
  const pad = 80;
  const k = o.format === "png" ? o.scale : 1;
  return `${Math.round((b.width + pad) * k)} × ${Math.round((b.height + pad) * k)} px`;
}

export function exportPreview() {
  const o = exportState();
  try {
    return withExportTheme(() => {
      if (o.scope === "slides") {
        const s = slides()[0];
        return s
          ? renderSlide(
              s,
              slideChildren(s).filter((e) => e.type !== "diagram"),
              exportEnv(),
            )
          : "";
      }
      const r = currentExportSVG(o.scope, { bg: o.bg });
      return r ? r.svg : "";
    });
  } catch {
    return "";
  }
}

export function downloadSVG() {
  const o = exportState();
  if (o.scope === "slides")
    return toast("SVG export is per board — slides use PNG or PDF");
  const r = withExportTheme(() => currentExportSVG(o.scope, { bg: o.bg }));
  if (!r) return toast("Nothing to export yet.");
  download(
    slug(S.doc.name || "board") + ".svg",
    new Blob([r.svg], { type: "image/svg+xml" }),
  );
}

export async function downloadPNG() {
  const o = exportState();
  if (o.scope === "slides") {
    const list = slides();
    if (!list.length) return toast("Nothing to export yet.");
    for (let i = 0; i < list.length; i++) {
      const svg = withExportTheme(() =>
        renderSlide(
          list[i],
          slideChildren(list[i]).filter((e) => e.type !== "diagram"),
          exportEnv(),
        ),
      );
      const canvas = await rasterize(svg, SLIDE_W, SLIDE_H, o.scale);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png"),
      );
      download(`${slug(S.doc.name || "deck")}-${i + 1}.png`, blob);
      await new Promise((r) => setTimeout(r, 400));
    }
    toast(`Downloaded ${plural(list.length, "PNG")}`);
    return;
  }
  const r = withExportTheme(() => currentExportSVG(o.scope, { bg: o.bg }));
  if (!r) return toast("Nothing to export yet.");
  const canvas = await rasterize(r.svg, r.width, r.height, o.scale);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/png"),
  );
  download(slug(S.doc.name || "board") + ".png", blob);
}

export async function copyExport() {
  const o = exportState();
  if (o.scope === "slides") return toast("Choose a board or selection to copy");
  const r = withExportTheme(() => currentExportSVG(o.scope, { bg: o.bg }));
  if (!r) return toast("Nothing to export yet.");
  const canvas = await rasterize(r.svg, r.width, r.height, o.scale);
  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob! }),
      ]);
      toast("Copied PNG to clipboard");
    } catch {
      toast("Clipboard not available — download instead");
    }
  }, "image/png");
}

export function printDeck() {
  const list = slides();
  if (!list.length) return toast("Add a slide first");
  const pages = withExportTheme(() =>
    list
      .map(
        (s) =>
          `<section class="page"><img src="${svgToDataURL(renderSlide(s, slideChildren(s).filter((e) => e.type !== "diagram"), exportEnv()))}"></section>`,
      )
      .join(""),
  );
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print the deck");
  w.document
    .write(`<!doctype html><html><head><title>${S.doc.name}</title><style>
  @page{size:1280px 720px;margin:0}
  html,body{margin:0;padding:0;background:#fff}
  .page{width:1280px;height:720px;page-break-after:always;display:flex;align-items:center;justify-content:center}
  .page img{width:1280px;height:720px;display:block}
  section:last-child{page-break-after:auto}
  </style></head><body>${pages}<script>window.onload=function(){setTimeout(function(){window.print()},350)}</script></body></html>`);
  w.document.close();
}

export function doExport() {
  const o = exportState();
  if (o.scope === "slides") {
    if (o.format === "pdf") printDeck();
    else downloadPNG();
  } else if (o.format === "svg") downloadSVG();
  else downloadPNG();
}

/* re-export a few things components need */
export { COLOR_KEYS, AI_META, roleColor, sotToggle, sotCloseReplay };
