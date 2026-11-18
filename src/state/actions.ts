/* User-level actions. Components call these directly; they mutate the store,
   persist and notify as needed. */

import { deep, download, plural, slug, uid } from '../lib/dom';
import { boundsOf, arrowGeom } from '../lib/geometry';
import { layoutDiagram } from '../lib/layout';
import { parseDSL } from '../lib/dsl';
import { MAKE, SLIDE_H, SLIDE_W, blankDoc, normalizeDoc } from '../lib/model';
import { COLOR_KEYS } from '../lib/palette';
import { callAI, currentAI, extractJSON, loadAIConfig, saveAIConfig, AI_META } from '../lib/ai';
import { mermaidToDSL } from '../lib/mermaid';
import { AI_SUGGESTIONS, SLIDE_TITLES, TEMPLATES, estimateTextHeight, slideGeometry } from '../lib/templates';
import {
  exportSVG as renderExportSVG,
  renderSlideSVG as renderSlide,
  rasterize,
  svgToDataURL,
  type ExportEnv,
} from '../lib/exportSvg';
import {
  S,
  addElement,
  boardsList,
  colorFor,
  diagram,
  elements,
  fitAll,
  notify,
  paletteOn,
  persist,
  pushHistory,
  removeElements,
  saveBoardCopy,
  selectionElements,
  settings,
  slideChildren,
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
} from './store';
import { sotToggle, sotCloseReplay } from './sot';

export { AI_SUGGESTIONS };

/* ---------- panels + overlays ---------- */

export function closeOverlays() {
  S.help = false;
  S.shortcuts = false;
  S.palette = false;
  S.exportOpen = false;
  S.connectOpen = false;
  S.iconSearch = false;
  S.renameOpen = false;
  S.mermaidOpen = false;
  S.paletteQ = '';
  notify();
}

export function setPanel(name: Exclude<any, 'none'> | any) {
  S.panel = S.panel === name ? 'none' : name;
  S.colorPop = false;
  notify();
}

export function openMenu() {
  S.help = !S.help;
  notify();
}
export function openShortcuts() {
  S.shortcuts = true;
  notify();
}
export function openPalette() {
  S.palette = true;
  S.paletteQ = '';
  S.paletteIndex = 0;
  notify();
}
export function openExport() {
  S.exportOpen = true;
  notify();
}
export function openConnect() {
  S.connectOpen = true;
  notify();
}
export function openIconSearch() {
  S.iconSearch = true;
  S.iconQuery = '';
  S.iconCursor = 0;
  notify();
}
export function openRename() {
  S.renameOpen = true;
  notify();
}
export function openMermaid() {
  S.mermaidOpen = true;
  if (!S.mermaidText) {
    S.mermaidText =
      'flowchart LR\n  Browser[Browser] --> CDN[CDN]\n  CDN --> API(API gateway)\n  API --> DB[(URL database)]\n  API --> Cache[(Redis cache)]\n  API -.-> Queue[Kafka queue]';
  }
  S.mermaidError = '';
  notify();
}

/* ---------- tools ---------- */

export function setTool(tool: string) {
  if (tool === 'image') return pickImage();
  S.tool = tool;
  S.colorPop = false;
  if (S.panel === 'none' && tool !== 'select') S.startOpen = true;
  notify();
}

/* ---------- slides ---------- */

export function nextSlidePos() {
  const list = slides();
  if (!list.length) return { x: 64, y: 64 };
  const last = list[list.length - 1];
  return { x: last.x + last.width + 160, y: last.y };
}

export function addSlide(layout = 'blank', opts: any = {}) {
  pushHistory('add slide');
  const pos = opts.pos || nextSlidePos();
  const order = nextSlideOrder();
  const slide = MAKE.slide({ x: pos.x, y: pos.y, title: opts.title || SLIDE_TITLES[layout] || 'Slide', layout, order });
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
  if (geo.diagramArea && (opts.diagram || layout === 'diagram' || layout === 'diagram-bullets')) {
    const a = geo.diagramArea;
    const dsl = opts.diagram || TEMPLATES.slideDiagram;
    const r = diagram(dsl);
    addElement(
      MAKE.diagram({
        x: slide.x + a.x,
        y: slide.y + a.y,
        width: a.w,
        height: a.h,
        title: opts.title || 'Diagram',
        dsl,
        frameId: slide.id,
        index: slide.index + 0.002,
      }),
    );
    void r;
  }
  S.selection = new Set([slide.id]);
  persist();
  notify();
  return slide;
}

export function duplicateSlide(id: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  pushHistory('duplicate slide');
  const pos = nextSlidePos();
  const copy = MAKE.slide({ ...deep(sl), id: uid(), x: pos.x, y: pos.y, order: nextSlideOrder(), index: nextIndex() });
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
  S.selection = new Set([copy.id]);
  notify();
  persist();
}

export function deleteSlide(id: string) {
  pushHistory('delete slide');
  const ids = new Set([id, ...slideChildren(S.doc.elements[id] || ({} as any)).map((e) => e.id)]);
  removeElements([...ids]);
  S.selection.clear();
  notify();
  persist();
}

export function selectionToSlide() {
  const list = selectionElements().filter((e) => e.type !== 'slide');
  if (!list.length) return toast('Select something to put on a slide');
  const b = boundsOf(list)!;
  const pos = nextSlidePos();
  pushHistory('selection to slide');
  const slide = MAKE.slide({ x: pos.x, y: pos.y, title: list.find((e) => e.type === 'diagram')?.title || 'Untitled slide', order: nextSlideOrder() });
  addElement(slide);
  const area = { x: 80, y: 100, w: SLIDE_W - 160, h: SLIDE_H - 160 };
  const scale = Math.max(0.2, Math.min(1, area.w / Math.max(1, b.width), area.h / Math.max(1, b.height)));
  for (const e of list) {
    const c = deep(e);
    if (c.type === 'arrow') {
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
  S.selection = new Set([slide.id]);
  persist();
  notify();
  toast('Moved selection to a slide');
}

export function arrangeSlides() {
  pushHistory('arrange slides');
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
  if (!sl || sl.type !== 'slide') return;
  pushHistory('builds');
  sl.builds = checked ? slideChildren(sl).map((e) => e.id) : [];
  persist();
  notify();
  toast(checked ? `Builds on · ${plural(sl.builds.length, 'step')}` : 'Builds off');
}

export function buildAdd(id: string, mode: 'appear' | 'highlight') {
  const sl = S.doc.elements[id];
  if (!sl) return;
  const selected = selectionElements()
    .filter((e) => e.frameId === id && e.id !== id)
    .map((e) => e.id);
  const ids = selected.length ? selected : slideChildren(sl).map((e) => e.id);
  if (!ids.length) return toast('Draw something on the slide first');
  pushHistory(mode === 'highlight' ? 'highlight build' : 'appear build');
  const ex = new Set(sl.builds || []);
  for (const x of ids) ex.add(x);
  sl.builds = [...ex];
  persist();
  notify();
  toast(`${mode === 'highlight' ? 'Highlight' : 'Appear'} build added · ${plural(sl.builds.length, 'step')}`);
}

export function buildReplay(id: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  sl.builds = slideChildren(sl).map((e) => e.id);
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
  pushHistory('rename slide');
  sl.title = title.trim() || 'Slide';
  persist();
  notify();
}

export function setNotes(id: string, notes: string) {
  const sl = S.doc.elements[id];
  if (!sl) return;
  pushHistory('notes');
  sl.notes = notes;
  persist();
  notify();
}

/* ---------- presentation ---------- */

export function present(index = 0) {
  const list = slides();
  if (!list.length) return toast('Add a slide first');
  S.present = { index: Math.max(0, Math.min(index, list.length - 1)), steps: 0, chrome: true, laser: false };
  notify();
  document.documentElement.requestFullscreen?.().catch(() => {});
}

export function exitPresent() {
  S.present = null;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  notify();
}

export function presentNav(delta: number) {
  if (!S.present) return;
  const list = slides();
  const p = S.present;
  if (delta > 0) {
    const sl = list[p.index];
    if (sl && (sl.builds || []).length > p.steps) {
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
      p.steps = 0;
      notify();
    }
  }
}

/* ---------- diagram code ---------- */

export function codeTarget() {
  const sel = selectionElements().find((e) => e.type === 'diagram');
  if (sel) return sel;
  const id = S.codeFor;
  return id ? S.doc.elements[id] : null;
}

export function syncCodeDraft() {
  const target = codeTarget();
  if (S.codeDraft == null || S.codeFor !== (target?.id || null)) {
    S.codeFor = target?.id || null;
    S.codeDraft = target?.dsl || TEMPLATES.demo;
  }
}

export function setCodeDraft(v: string) {
  S.codeDraft = v;
  notify();
}

export function applyCode() {
  const src = S.codeDraft || '';
  const parsed = parseDSL(src);
  if (parsed.diagnostics.some((d) => d.severity === 'error')) {
    notify();
    return toast('Fix the errors first');
  }
  pushHistory('code');
  const target = codeTarget();
  const layout = layoutDiagram(parsed);
  if (target) {
    target.dsl = src;
    target.title = parsed.title || target.title;
    if (target.width < 40 || target.height < 40) {
      target.width = layout.width;
      target.height = layout.height;
    }
    S.selection = new Set([target.id]);
  } else {
    const c = viewportCenter();
    const el = MAKE.diagram({
      x: c.x - layout.width / 2,
      y: c.y - layout.height / 2,
      width: layout.width,
      height: layout.height,
      title: parsed.title || 'Diagram',
      dsl: src,
    });
    addElement(el);
    S.selection = new Set([el.id]);
    S.codeFor = el.id;
  }
  persist();
  notify();
  toast(target ? 'Diagram updated' : 'Diagram added');
}

export function validateCode() {
  const d = parseDSL(S.codeDraft || '').diagnostics;
  notify();
  toast(d.some((x) => x.severity === 'error') ? 'Fix the errors to apply' : 'Looks good');
}

export function newDiagram() {
  S.selection.clear();
  S.codeFor = null;
  S.codeDraft = `title: New diagram
direction: right

Client [actor]
API [compute]
Database [data]

Client -> API: request
API -> Database: read`;
  S.panel = 'code';
  notify();
  toast('New diagram — edit the code, then Apply');
}

export function exampleCode() {
  S.codeDraft = TEMPLATES.demo;
  notify();
}

export function mermaidConvert() {
  const src = S.mermaidText || '';
  const res = mermaidToDSL(src);
  if (res.error) {
    S.mermaidError = res.error;
    notify();
    return;
  }
  S.mermaidError = '';
  S.mermaidOpen = false;
  pushHistory('import mermaid');
  S.selection.clear();
  S.codeFor = null;
  S.codeDraft = res.dsl!;
  const parsed = parseDSL(res.dsl!);
  const layout = layoutDiagram(parsed);
  const el = MAKE.diagram({
    x: 80,
    y: 80,
    width: Math.max(240, layout.width),
    height: Math.max(180, layout.height),
    title: parsed.title || 'Imported diagram',
    dsl: res.dsl!,
  });
  addElement(el);
  S.selection = new Set([el.id]);
  S.codeFor = el.id;
  notify();
  persist();
  fitAll();
  toast('Converted Mermaid to a diagram');
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
  pushMsg({ kind: 'user', text });
  S.assistant.busy = true;
  S.assistant.abort = new AbortController();
  notify();
  try {
    const history = S.assistant.messages
      .filter((m: any) => m.kind === 'user' || m.kind === 'ai')
      .slice(-8)
      .map((m: any) => `${m.kind === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');
    const content = await callAI(ai, text, history, S.assistant.abort.signal);
    let data: any = null;
    try {
      data = JSON.parse(extractJSON(content));
    } catch {
      data = null;
    }
    if (!data) {
      pushMsg({ kind: 'ai', text: String(content).slice(0, 1400) });
    } else {
      if (data.reply) pushMsg({ kind: 'ai', text: data.reply });
      for (const a of data.actions || []) {
        if (a.type === 'diagram' && a.dsl) {
          pushMsg({ kind: 'tool', text: `Created diagram “${a.title || 'Diagram'}”` });
          addDiagramFromAI(a.dsl, a.title);
        } else if (a.type === 'deck' && Array.isArray(a.slides)) {
          addDeckFromAI(a.slides);
          pushMsg({ kind: 'tool', text: `Created ${plural(a.slides.length, 'slide')}` });
        }
      }
      notify();
    }
  } catch (err: any) {
    pushMsg({ kind: 'error', text: err?.name === 'AbortError' ? 'Stopped.' : err?.message || 'Request failed' });
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
  pushHistory('ai diagram');
  const parsed = parseDSL(dsl);
  const layout = layoutDiagram(parsed);
  const c = viewportCenter();
  const el = MAKE.diagram({
    x: Math.round(c.x - layout.width / 2),
    y: Math.round(c.y - layout.height / 2),
    width: layout.width,
    height: layout.height,
    title: title || parsed.title || 'Diagram',
    dsl,
  });
  addElement(el);
  S.selection = new Set([el.id]);
  persist();
  notify();
}

export function addDeckFromAI(slidesIn: any[]) {
  pushHistory('ai deck');
  for (const s of slidesIn) {
    const layout = ['title', 'section', 'bullets', 'diagram', 'diagram-bullets', 'blank'].includes(s.layout) ? s.layout : 'bullets';
    const texts: string[] = [];
    if (layout === 'title') texts.push(s.title || 'Presentation title', s.subtitle || '');
    else if (layout === 'section') texts.push(s.title || 'Section title', s.subtitle || '');
    else if (layout === 'bullets') texts.push(s.title || 'Slide title', (s.bullets || []).map((b: string) => '•  ' + b).join('\n'));
    else if (layout === 'diagram') texts.push(s.title || 'How it works');
    else if (layout === 'diagram-bullets') texts.push(s.title || 'How it works', (s.bullets || []).map((b: string) => '•  ' + b).join('\n'));
    addSlide(layout, { title: s.title, texts, diagram: s.diagram, notes: s.notes });
  }
}

export function saveAIKey(provider: string, key: string, model: string, baseUrl: string) {
  const cfg = loadAIConfig();
  cfg.provider = provider;
  cfg.model = model || AI_META[provider].model;
  cfg.baseUrl = baseUrl;
  cfg.keys = { ...(cfg.keys || {}), [provider]: key };
  saveAIConfig(cfg);
  S.connectOpen = false;
  S.connectProvider = null;
  S.connectModel = null;
  notify();
  toast('AI connected');
}

export function forgetKey() {
  const cfg = loadAIConfig();
  const provider = cfg.provider || 'anthropic';
  if (cfg.keys) delete cfg.keys[provider];
  saveAIConfig(cfg);
  notify();
  toast('Key forgotten');
}

/* ---------- boards ---------- */

export function saveRename(name: string) {
  const v = name.trim();
  if (v) {
    S.doc.name = v;
    persist(true);
  }
  S.renameOpen = false;
  notify();
}

export function copyBoardLink() {
  saveBoardCopy();
  const link = location.origin + location.pathname + '#/b/' + S.doc.id;
  navigator.clipboard?.writeText(link).then(() => toast('Board link copied')).catch(() => toast(link));
}

export function newBoard() {
  saveBoardCopy();
  S.doc = blankDoc('Untitled board');
  S.selection.clear();
  S.history = [];
  S.future = [];
  S.timeline = [];
  S.camera = { x: 80, y: 80, zoom: 1 };
  S.startOpen = false;
  S.panel = 'none';
  location.hash = '';
  notify();
  persist(true);
  toast('New board');
}

export function openBoard(id: string) {
  try {
    const raw = localStorage.getItem('jojopen.board.' + id) || (S.doc.id === id ? JSON.stringify(S.doc) : null);
    if (!raw) return toast('Board not found');
    S.doc = normalizeDoc(JSON.parse(raw));
    S.selection.clear();
    S.history = [];
    S.future = [];
    S.timeline = [];
    S.camera = { x: 0, y: 0, zoom: 1 };
    history.replaceState(null, '', '#/b/' + id);
    notify();
    persist();
    toast('Opened ' + S.doc.name);
  } catch {
    toast('Could not open board');
  }
}

export function deleteBoard(id: string) {
  if (!confirm('Delete this board? This cannot be undone.')) return;
  const list = boardsList().filter((b: any) => b.id !== id);
  localStorage.setItem(KEY_BOARDS, JSON.stringify(list));
  localStorage.removeItem('jojopen.board.' + id);
  if (id === S.doc.id) newBoard();
  notify();
}

export function downloadJSON() {
  const data = { app: 'JojoPen', exportedAt: new Date().toISOString(), doc: S.doc };
  download(slug(S.doc.name || 'board') + '.jojopen.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
}

export function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const doc = j.doc || j;
      if (!doc.elements) throw new Error('Not a JojoPen file');
      saveBoardCopy();
      S.doc = normalizeDoc({ ...doc, id: uid(), name: doc.name || f.name.replace(/\.json$/, '') });
      S.selection.clear();
      S.history = [];
      S.future = [];
      S.timeline = [];
      S.camera = { x: 0, y: 0, zoom: 1 };
      notify();
      persist(true);
      fitAll();
      toast('Imported ' + S.doc.name);
    } catch {
      toast('Could not read that file');
    }
  };
  input.click();
}

export function applyTemplate(id: string) {
  S.startOpen = true;
  if (id === 'system' || id === 'flow') {
    pushHistory('template');
    const dsl = id === 'system' ? TEMPLATES.system : TEMPLATES.flow;
    const parsed = parseDSL(dsl);
    const layout = layoutDiagram(parsed);
    const el = MAKE.diagram({
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
      title: parsed.title || (id === 'system' ? 'URL shortener' : 'Sign-up flow'),
      dsl,
    });
    addElement(el);
    S.doc.name = id === 'system' ? 'URL shortener' : 'Sign-up flow';
    S.selection = new Set([el.id]);
    notify();
    persist(true);
    fitAll();
    return toast('Added ' + el.title);
  }
  if (id === 'deck') {
    S.doc.name = 'Slide deck';
    addSlide('title', { title: 'Your talk title', texts: ['Your talk title', 'A short subtitle'] });
    addSlide('bullets', { title: 'Agenda', texts: ['Agenda', '•  The problem\n•  How it works\n•  What we learned'] });
    addSlide('diagram-bullets', {
      title: 'How it works',
      texts: ['How it works', '•  Reads hit the cache first\n•  Misses fall back to the database'],
      diagram: TEMPLATES.slideDiagram,
    });
    setPanel('slides');
    notify();
    persist(true);
    setTimeout(fitAll, 30);
  }
}

/* ---------- editing ---------- */

export function copySelection() {
  const list = selectionElements();
  if (!list.length) return toast('Select something first');
  S.clipboard = { elements: deep(list), files: {} };
  for (const e of list) if (e.type === 'image' && S.doc.files[e.fileId]) S.clipboard.files[e.fileId] = S.doc.files[e.fileId];
  toast(`${plural(list.length, 'element')} copied`);
}

export function cutSelection() {
  copySelection();
  deleteSelection();
}

export function pasteClipboard() {
  if (!S.clipboard?.elements?.length) return toast('Nothing to paste');
  pushHistory('paste');
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
    if (e.type === 'arrow') {
      if (e.start?.elementId && map.has(e.start.elementId)) e.start = { ...e.start, elementId: map.get(e.start.elementId) };
      if (e.end?.elementId && map.has(e.end.elementId)) e.end = { ...e.end, elementId: map.get(e.end.elementId) };
    }
    S.doc.elements[e.id] = e;
    ids.push(e.id);
  }
  S.selection = new Set(ids);
  notify();
  persist();
  toast('Pasted');
}

export function duplicateSelection() {
  if (!S.selection.size) return toast('Select something first');
  copySelection();
  pasteClipboard();
}

export function deleteSelection() {
  if (!S.selection.size) return;
  pushHistory('delete');
  const ids = [...S.selection];
  for (const id of ids) {
    const e = S.doc.elements[id];
    if (e?.type === 'slide') for (const c of slideChildren(e)) ids.push(c.id);
  }
  removeElements([...new Set(ids)]);
  S.selection.clear();
  notify();
  persist();
}

export function selectAll() {
  S.selection = new Set(elements().map((e) => e.id));
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
  pushHistory('move');
  for (const e of list) {
    e.x += dx * step;
    e.y += dy * step;
    if (e.type === 'slide')
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
  S.editingId = id;
  notify();
}

export function editLabel() {
  if (S.selection.size !== 1) return;
  const e = selectionElements()[0];
  if (!e || e.locked) return;
  if (e.type === 'diagram') {
    S.codeFor = e.id;
    S.codeDraft = e.dsl;
    setPanel('code');
    return;
  }
  if (e.type === 'slide') return present(slides().findIndex((s) => s.id === e.id));
  beginEdit(e.id);
}

/** Commit the inline text editor's value back into the element. */
export function commitEdit(id: string, value: string) {
  const el = S.doc.elements[id];
  S.editingId = null;
  if (!el) {
    notify();
    return;
  }
  pushHistory('edit text');
  if (el.type === 'arrow') el.label = value.trim();
  else if (el.type === 'text') {
    if (value.trim()) el.text = value;
    else removeElements([id]);
  } else if (el.type === 'sticky') {
    /* Legacy wrote sticky edits to `label`, which the sticky renderer never
       read. Notes render `text`, so commit there. */
    el.text = value;
  } else el.label = value;
  notify();
  persist();
}

export function groupSelection() {
  if (S.selection.size < 2) return toast('Select two or more elements');
  pushHistory('group');
  const gid = uid();
  for (const e of selectionElements()) e.groupIds = [...(e.groupIds || []), gid];
  notify();
  persist();
  toast('Grouped');
}

export function ungroupSelection() {
  const gids = new Set(selectionElements().flatMap((e) => e.groupIds || []));
  if (!gids.size) return toast('Nothing is grouped');
  pushHistory('ungroup');
  for (const e of elements()) e.groupIds = (e.groupIds || []).filter((g) => !gids.has(g));
  notify();
  persist();
  toast('Ungrouped');
}

export function orderSelection(kind: string) {
  const sel = selectionElements();
  if (!sel.length) return;
  pushHistory('arrange');
  const list = sortedElements();
  const set = new Set(sel.map((e) => e.id));
  if (kind === 'front') {
    for (const e of sel) list.splice(list.indexOf(e), 1);
    list.push(...sel);
  } else if (kind === 'back') {
    for (const e of sel) list.splice(list.indexOf(e), 1);
    list.unshift(...sel);
  } else if (kind === 'forward') {
    for (let i = list.length - 2; i >= 0; i--) if (set.has(list[i].id) && !set.has(list[i + 1].id)) [list[i], list[i + 1]] = [list[i + 1], list[i]];
  } else {
    for (let i = 1; i < list.length; i++) if (set.has(list[i].id) && !set.has(list[i - 1].id)) [list[i], list[i - 1]] = [list[i - 1], list[i]];
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
  pushHistory('lock');
  list.forEach((e) => {
    e.locked = lock;
  });
  notify();
  persist();
  toast(lock ? 'Locked' : 'Unlocked');
}

export function toggleTheme() {
  S.themePref = S.themePref === 'system' ? 'dark' : S.themePref === 'dark' ? 'light' : 'system';
  notify();
  persist();
}

export function toggleBw() {
  settings().palette = paletteOn() ? 'mono' : 'roles';
  notify();
  persist();
}

export function toggleSnap() {
  settings().snapToGrid = !settings().snapToGrid;
  notify();
  persist();
  toast(settings().snapToGrid ? 'Snap to dots on' : 'Snap off');
}

export function toggleGrid() {
  settings().showGrid = !settings().showGrid;
  notify();
  persist();
}

export function toggleZen() {
  S.zen = !S.zen;
  notify();
}

export function toggleFont() {
  settings().handFont = settings().handFont === 'kalam' ? 'excalifont' : 'kalam';
  notify();
  persist();
  toast(settings().handFont === 'kalam' ? 'Kalam' : 'Excalifont');
}

export function cleanIt() {
  const diagrams = (S.selection.size ? selectionElements().filter((e) => e.type === 'diagram') : elements().filter((e) => e.type === 'diagram'));
  if (!diagrams.length) return toast('Add a diagram first');
  pushHistory('clean it');
  let n = 0;
  for (const d of diagrams) {
    const parsed = parseDSL(d.dsl || '');
    if (parsed.diagnostics.some((x) => x.severity === 'error')) continue;
    const layout = layoutDiagram(parsed);
    d.width = layout.width;
    d.height = layout.height;
    n++;
  }
  notify();
  persist();
  toast(n ? `Cleaned up ${plural(n, 'diagram')}` : 'Fix diagram errors first');
}

export function applyColor(color: string) {
  pushHistory('color');
  selectionElements().forEach((e) => {
    e.color = color;
    e.colorLocked = true;
  });
  persist();
  notify();
  toast(color.startsWith('#') ? 'Custom color' : 'Color');
}

export function autoColor() {
  pushHistory('auto color');
  selectionElements().forEach((e) => {
    e.colorLocked = false;
    e.color = null;
  });
  notify();
}

export function randomColors() {
  pushHistory('random colors');
  if (!paletteOn()) settings().palette = 'roles';
  /* Store colour keys, not resolved paints: `colorFor()` maps them through
     COLOR_TO_ROLE so the colours follow the active theme. */
  const keys = [...COLOR_KEYS].sort(() => Math.random() - 0.5);
  elements()
    .filter((e) => e.type === 'shape' || e.type === 'arrow')
    .forEach((e, i) => {
      e.color = keys[i % keys.length];
      e.colorLocked = true;
    });
  persist();
  notify();
  toast('Random colors');
}

export function toggleNoFill() {
  pushHistory('fill');
  const shapes = selectionElements().filter((e) => e.type === 'shape');
  const all = shapes.every((e) => e.noFill);
  shapes.forEach((e) => {
    e.noFill = !all;
  });
  notify();
}

export function setShape(shape: string) {
  pushHistory('shape');
  selectionElements()
    .filter((e) => e.type === 'shape')
    .forEach((e) => {
      e.shape = shape;
    });
  notify();
}

export function setRoute(route: string) {
  pushHistory('route');
  selectionElements()
    .filter((e) => e.type === 'arrow')
    .forEach((e) => {
      e.routeMode = route;
    });
  notify();
}

export function bumpText(delta: number) {
  pushHistory('text size');
  selectionElements().forEach((e) => {
    if (e.type === 'text') e.fontSize = Math.max(8, Math.min(160, e.fontSize + delta));
  });
  notify();
}

export function insertIcon(icon: string) {
  pushHistory('add icon');
  const c = viewportCenter();
  const label = icon
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ');
  const el = MAKE.shape({ x: Math.round(c.x - 80), y: Math.round(c.y - 32), width: 170, height: 64, icon, label, shape: 'rounded' });
  addElement(el);
  S.selection = new Set([el.id]);
  S.iconSearch = false;
  notify();
  persist();
}

/* ---------- images ---------- */

export function placeImage(dataUrl: string, naturalW: number, naturalH: number) {
  const c = viewportCenter();
  const maxW = 480;
  const maxH = 360;
  const k = Math.min(1, maxW / naturalW, maxH / naturalH);
  const w = Math.max(40, naturalW * k);
  const h = Math.max(40, naturalH * k);
  const fileId = uid();
  S.doc.files[fileId] = dataUrl;
  pushHistory('add image');
  const el = MAKE.image({ x: Math.round(c.x - w / 2), y: Math.round(c.y - h / 2), width: Math.round(w), height: Math.round(h), fileId });
  addElement(el);
  S.selection = new Set([el.id]);
  notify();
  persist();
}

export function pickImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const f = input.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => placeImage(String(fr.result), img.naturalWidth, img.naturalHeight);
      img.src = String(fr.result);
    };
    fr.readAsDataURL(f);
  };
  input.click();
}

/* ---------- export ---------- */

export function exportState() {
  return { scope: 'board', format: 'png', scale: 2, bg: true, dark: false, ...(S.exportOpts || {}) } as any;
}

export function setExportOpts(patch: any) {
  S.exportOpts = { ...exportState(), ...patch };
  if (patch.scope === 'slides') S.exportOpts.format = 'pdf';
  notify();
}

function withExportTheme<T>(fn: () => T): T {
  const prevTheme = S.themePref;
  const prevPal = S.doc.settings.palette;
  if (S.exportOpts?.dark) S.themePref = 'dark';
  if (S.exportOpts?.palette === 'mono') S.doc.settings.palette = 'mono';
  try {
    return fn();
  } finally {
    S.themePref = prevTheme;
    S.doc.settings.palette = prevPal;
  }
}

function exportEnv(): ExportEnv {
  return {
    th: theme(),
    clean: settings().style === 'clean',
    colorFor,
    files: S.doc.files,
    slides: slides(),
    diagramFor: diagram,
    arrowGeom: (el) => arrowGeom(el, (id) => S.doc.elements[id], theme()),
  };
}

export function exportBounds(scope: string) {
  const list = scope === 'selection' ? selectionElements() : elements();
  return boundsOf(list);
}

export function currentExportSVG(scope: string, opts: { bg?: boolean } = {}) {
  const list = scope === 'selection' ? selectionElements() : sortedElements();
  return renderExportSVG(list, boundsOf(list), exportEnv(), opts);
}

export function exportSizeLabel(o: any) {
  const b = exportBounds(o.scope);
  if (!b) return 'Nothing to export yet';
  const pad = 80;
  const k = o.format === 'png' ? o.scale : 1;
  return `${Math.round((b.width + pad) * k)} × ${Math.round((b.height + pad) * k)} px`;
}

export function exportPreview() {
  const o = exportState();
  try {
    return withExportTheme(() => {
      if (o.scope === 'slides') {
        const s = slides()[0];
        return s ? renderSlide(s, slideChildren(s), exportEnv()) : '';
      }
      const r = currentExportSVG(o.scope, { bg: o.bg });
      return r ? r.svg : '';
    });
  } catch {
    return '';
  }
}

export function downloadSVG() {
  const o = exportState();
  if (o.scope === 'slides') return toast('SVG export is per board — slides use PNG or PDF');
  const r = withExportTheme(() => currentExportSVG(o.scope, { bg: o.bg }));
  if (!r) return toast('Nothing to export yet.');
  download(slug(S.doc.name || 'board') + '.svg', new Blob([r.svg], { type: 'image/svg+xml' }));
}

export async function downloadPNG() {
  const o = exportState();
  if (o.scope === 'slides') {
    const list = slides();
    if (!list.length) return toast('Nothing to export yet.');
    for (let i = 0; i < list.length; i++) {
      const svg = withExportTheme(() => renderSlide(list[i], slideChildren(list[i]), exportEnv()));
      const canvas = await rasterize(svg, SLIDE_W, SLIDE_H, o.scale);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      download(`${slug(S.doc.name || 'deck')}-${i + 1}.png`, blob);
      await new Promise((r) => setTimeout(r, 400));
    }
    toast(`Downloaded ${plural(list.length, 'PNG')}`);
    return;
  }
  const r = withExportTheme(() => currentExportSVG(o.scope, { bg: o.bg }));
  if (!r) return toast('Nothing to export yet.');
  const canvas = await rasterize(r.svg, r.width, r.height, o.scale);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  download(slug(S.doc.name || 'board') + '.png', blob);
}

export async function copyExport() {
  const o = exportState();
  if (o.scope === 'slides') return toast('Choose a board or selection to copy');
  const r = withExportTheme(() => currentExportSVG(o.scope, { bg: o.bg }));
  if (!r) return toast('Nothing to export yet.');
  const canvas = await rasterize(r.svg, r.width, r.height, o.scale);
  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob! })]);
      toast('Copied PNG to clipboard');
    } catch {
      toast('Clipboard not available — download instead');
    }
  }, 'image/png');
}

export function printDeck() {
  const list = slides();
  if (!list.length) return toast('Add a slide first');
  const pages = withExportTheme(() => list.map((s) => `<section class="page"><img src="${svgToDataURL(renderSlide(s, slideChildren(s), exportEnv()))}"></section>`).join(''));
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print the deck');
  w.document.write(`<!doctype html><html><head><title>${S.doc.name}</title><style>
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
  if (o.scope === 'slides') {
    if (o.format === 'pdf') printDeck();
    else downloadPNG();
  } else if (o.format === 'svg') downloadSVG();
  else downloadPNG();
}

/* re-export a few things components need */
export { COLOR_KEYS, AI_META, roleColor, sotToggle, sotCloseReplay };
