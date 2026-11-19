import { useEffect, useRef, useState } from "react";
import { SLIDE_H, SLIDE_W, type BoardElement } from "../lib/model";
import { parseDSL } from "../lib/dsl";
import { currentAI } from "../lib/ai";
import { AI_SUGGESTIONS } from "../state/actions";
import {
  S,
  boardsList,
  collectionsList,
  createCollection,
  elements,
  notify,
  slideChildren,
  slides,
} from "../state/store";
import { useBoardStore, useVersion } from "../state/boardStore";
import {
  addSlide,
  applyCode,
  arrangeSlides,
  buildAdd,
  buildReplay,
  cleanIt,
  codeTarget,
  copyBoardLink,
  copyCode,
  deleteBoard,
  deleteSlide,
  downloadJSON,
  duplicateSlide,
  exampleCode,
  forgetKey,
  importJSON,
  mermaidConvert,
  newBoard,
  newDiagram,
  openBoard,
  openConnect,
  openMermaid,
  present,
  renameSlide,
  selectionToSlide,
  sendAI,
  setCodeDraft,
  setNotes,
  setPanel,
  stopAI,
  syncCodeDraft,
  tidyCode,
  toggleBuilds,
  updateCodeDraftAndSync,
  validateCode,
} from "../state/actions";
import { Icon } from "./Icon";
import { SceneView } from "./SceneView";

export function PanelRoot() {
  if (S.panel === "none") return null;
  if (S.panel === "slides") return <SlidesPanel />;
  if (S.panel === "code") return <CodePanel />;
  if (S.panel === "assistant") return <AssistantPanel />;
  if (S.panel === "boards") return <BoardsPanel />;
  return null;
}

function PanelHeader({
  icon,
  title,
  count,
  children,
}: {
  icon: string;
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <span className="sidetitle">
        <Icon name={icon} size={16} /> {title}
        {typeof count === "number" ? (
          <span className="slides-count">{count}</span>
        ) : null}
      </span>
      <div className="sidehead-actions">
        {children}
        <button
          className="iconbtn"
          onClick={() => setPanel(S.panel)}
          aria-label="Close panel"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </header>
  );
}

/* ---------- slides ---------- */

function LayoutGlyph({ id }: { id: string }) {
  const bar = (l: number, t: number, w: number, h = 2, key?: number) => (
    <i
      key={key}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}px` }}
    />
  );
  let children: React.ReactNode = null;
  if (id === "title") children = [bar(20, 34, 60, 3, 0), bar(28, 50, 44, 2, 1)];
  else if (id === "section")
    children = [bar(12, 30, 46, 3, 0), bar(12, 46, 32, 2, 1)];
  else if (id === "bullets")
    children = [
      bar(10, 14, 52, 3, 0),
      bar(12, 34, 66, 2, 1),
      bar(12, 48, 60, 2, 2),
      bar(12, 62, 64, 2, 3),
    ];
  else if (id === "diagram")
    children = [
      bar(10, 12, 44, 3, 0),
      bar(14, 32, 20, 24, 1),
      bar(42, 32, 20, 24, 2),
      bar(70, 32, 20, 24, 3),
    ];
  else if (id === "diagram-bullets")
    children = [
      bar(10, 12, 44, 3, 0),
      bar(10, 34, 28, 2, 1),
      bar(10, 48, 26, 2, 2),
      bar(10, 62, 24, 2, 3),
      bar(52, 32, 36, 34, 4),
    ];
  return <span className="layoutglyph">{children}</span>;
}

function SlideThumb({ slide }: { slide: BoardElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const width = w || 340;
  return (
    <div
      className="slidethumb"
      ref={ref}
      onClick={() => present(slides().findIndex((s) => s.id === slide.id))}
    >
      <SceneView
        elements={slideChildren(slide)}
        ox={slide.x}
        oy={slide.y}
        width={SLIDE_W}
        height={SLIDE_H}
        scale={width / SLIDE_W}
      />
      <div className="slidethumb-badge" />
    </div>
  );
}

export function SlidesPanel() {
  const list = slides();
  const activeSlide = list.find((s) => S.selection.has(s.id)) || list[0];
  const activeIdx = activeSlide
    ? list.findIndex((s) => s.id === activeSlide.id)
    : 0;

  return (
    <aside className="sidepanel slides-sidepanel" aria-label="Slides">
      <PanelHeader icon="slides" title="Slides" count={list.length}>
        <button
          className="slides-present"
          data-act="present"
          onClick={() => present(0)}
          disabled={!list.length}
        >
          <Icon name="play" size={12} /> Present
        </button>
      </PanelHeader>
      <div className="slides-tools">
        <div className="slides-add">
          <button
            className="slides-tool is-primary"
            data-act="layoutPicker"
            onClick={() => {
              S.layoutPicker = !S.layoutPicker;
              notify();
            }}
          >
            <Icon name="plus" size={14} sw={2} /> Add slide
          </button>
          {S.layoutPicker ? (
            <div className="layoutpicker" role="menu">
              {[
                ["blank", "Empty"],
                ["title", "Title"],
                ["section", "Section"],
                ["bullets", "Bullets"],
                ["diagram", "Diagram"],
                ["diagram-bullets", "Diagram + bullets"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  data-act="addSlide"
                  data-layout={id}
                  onClick={() => {
                    S.layoutPicker = false;
                    addSlide(id);
                  }}
                >
                  <LayoutGlyph id={id} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          className="slides-tool"
          data-act="selectionSlide"
          onClick={selectionToSlide}
          disabled={!S.selection.size}
        >
          <Icon name="frame" size={14} /> Selection → slide
        </button>
        {list.length > 1 ? (
          <button
            className="slides-tool is-ghost"
            data-act="arrangeSlides"
            onClick={arrangeSlides}
          >
            Arrange
          </button>
        ) : null}
      </div>
      <div className="slides-list" id="slidesList">
        {!list.length ? (
          <div className="slides-empty">
            <p>
              Slides are 16:9 frames on your board. Anything you draw inside one
              is on the slide.
            </p>
            <p className="muted">
              Add one from a layout, turn a selection into a slide, or ask the
              assistant for a deck.
            </p>
          </div>
        ) : (
          list.map((sl, i) => (
            <div
              className={`slidecard${activeSlide?.id === sl.id ? " is-active" : ""}`}
              key={sl.id}
              data-slide={sl.id}
              onClick={() => {
                S.selection = new Set([sl.id]);
                notify();
              }}
            >
              <div className="slidecard-head">
                <span className="slidecard-num">{i + 1}</span>
                <input
                  className="slidecard-title"
                  defaultValue={sl.title || "Untitled slide"}
                  key={sl.id + ":" + (sl.title || "")}
                  aria-label="Slide title"
                  onBlur={(e) => renameSlide(sl.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  className="slidecard-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="iconbtn"
                    data-act="presentFromThumb"
                    data-index={i}
                    onClick={() => present(i)}
                    title="Present from here"
                  >
                    <Icon name="play" size={13} />
                  </button>
                  <button
                    className="iconbtn"
                    data-act="deleteSlide"
                    data-id={sl.id}
                    onClick={() => deleteSlide(sl.id)}
                    title="Delete"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
              <SlideThumb slide={sl} />
            </div>
          ))
        )}
      </div>
      {activeSlide ? (
        <div className="slide-inspector">
          <div className="slide-inspector-title">
            SLIDE {activeIdx + 1} · BUILDS
          </div>
          <label className="builds-check">
            <input
              type="checkbox"
              data-act="toggleBuilds"
              data-id={activeSlide.id}
              checked={(activeSlide.builds || []).length > 0}
              onChange={(e) => toggleBuilds(activeSlide.id, e.target.checked)}
            />{" "}
            Replay how it was drawn, step by step (
            {slideChildren(activeSlide).length} steps)
          </label>
          <div className="builds-hint">
            Or add your own builds: select things on the slide, then add one
            (custom builds replace the replay).
          </div>
          <div className="builds-actions">
            <button
              className="build-btn"
              data-act="buildAdd"
              data-mode="appear"
              data-id={activeSlide.id}
              onClick={() => buildAdd(activeSlide.id, "appear")}
              title="Reveal the selected items one by one"
            >
              + Appear
            </button>
            <button
              className="build-btn"
              data-act="buildAdd"
              data-mode="highlight"
              data-id={activeSlide.id}
              onClick={() => buildAdd(activeSlide.id, "highlight")}
              title="Emphasise the selected items"
            >
              + Highlight
            </button>
            <button
              className="build-btn"
              data-act="buildReplay"
              data-id={activeSlide.id}
              onClick={() => buildReplay(activeSlide.id)}
              title="Replay the build from the start"
            >
              <Icon name="hourglass" size={12} /> + Replay
            </button>
          </div>
          <div className="slide-inspector-title" style={{ marginTop: 14 }}>
            SPEAKER NOTES
          </div>
          <textarea
            className="speaker-notes-area"
            defaultValue={activeSlide.notes || ""}
            key={activeSlide.id + ":notes"}
            placeholder="What to say on this slide..."
            onBlur={(e) => setNotes(activeSlide.id, e.target.value)}
          />
        </div>
      ) : null}
    </aside>
  );
}

/* ---------- code ---------- */

function renderSyntax(line: string): React.ReactNode {
  if (!line) return "";

  // Comment
  const hashIdx = line.indexOf("#");
  if (hashIdx !== -1) {
    const before = line.slice(0, hashIdx);
    const comment = line.slice(hashIdx);
    return (
      <>
        {before ? renderSyntax(before) : null}
        <span style={{ color: "var(--code-comment)" }}>{comment}</span>
      </>
    );
  }

  // Directives
  const dirMatch = line.match(/^(\s*)(direction|title)(:)(\s*)(.*)$/);
  if (dirMatch) {
    const [, indent, kw, colon, sp, val] = dirMatch;
    return (
      <>
        {indent}
        <span style={{ color: "var(--code-kw)" }}>
          {kw}
          {colon}
        </span>
        {sp}
        <span style={{ color: "var(--code-str)" }}>{val}</span>
      </>
    );
  }

  // Group
  const grpMatch = line.match(/^(\s*)(group)(\b[\s\S]*)$/);
  if (grpMatch) {
    const [, indent, kw, rest] = grpMatch;
    return (
      <>
        {indent}
        <span style={{ color: "var(--code-kw)" }}>{kw}</span>
        {renderSyntaxInline(rest)}
      </>
    );
  }

  return renderSyntaxInline(line);
}

function renderSyntaxInline(text: string): React.ReactNode {
  const tokenRegex =
    /(\[[^\]]*\]|-->|->|<->|<--|<-|-\.\.->|-\.\.>|-\.->|---|--|:\s*[^[\]\-><]+)/g;
  let lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("[")) {
      parts.push(
        <span key={match.index} style={{ color: "var(--code-attr)" }}>
          {token}
        </span>,
      );
    } else if (token.startsWith(":")) {
      parts.push(
        <span key={match.index} style={{ color: "var(--code-str)" }}>
          {token}
        </span>,
      );
    } else {
      parts.push(
        <span key={match.index} style={{ color: "var(--code-op)" }}>
          {token}
        </span>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function DiagramCodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = value.split("\n");

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const top = e.currentTarget.scrollTop;
    const left = e.currentTarget.scrollLeft;
    if (preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = top;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const next = val.substring(0, start) + "  " + val.substring(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="code">
      <div className="cm-editor">
        <div
          className="cm-scroller"
          style={{
            display: "flex",
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            ref={gutterRef}
            className="cm-gutters"
            aria-hidden="true"
            style={{
              flex: "0 0 auto",
              padding: "10px 10px 10px 14px",
              textAlign: "right",
              userSelect: "none",
              color: "var(--subtle)",
              minWidth: 34,
              overflow: "hidden",
            }}
          >
            {lines.map((_, i) => (
              <div
                key={i}
                className="cm-gutterElement"
                style={{ height: 22, lineHeight: "22px" }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div
            className="cm-content"
            style={{
              flex: "1 1 auto",
              position: "relative",
              height: "100%",
              overflow: "hidden",
              padding: "10px 14px 10px 6px",
            }}
          >
            <pre
              ref={preRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 10,
                left: 6,
                right: 14,
                bottom: 10,
                margin: 0,
                padding: 0,
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 12.5,
                lineHeight: "22px",
                whiteSpace: "pre",
                overflow: "hidden",
                pointerEvents: "none",
                tabSize: 2,
              }}
            >
              {lines.map((line, i) => (
                <div key={i} style={{ height: 22, lineHeight: "22px" }}>
                  {renderSyntax(line) || "\u00A0"}
                </div>
              ))}
            </pre>
            <textarea
              ref={textareaRef}
              id="codeArea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              aria-label="Diagram source"
              style={{
                position: "absolute",
                top: 10,
                left: 6,
                right: 14,
                bottom: 10,
                margin: 0,
                padding: 0,
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                color: "transparent",
                caretColor: "var(--text)",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 12.5,
                lineHeight: "22px",
                whiteSpace: "pre",
                overflow: "auto",
                tabSize: 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CodePanel() {
  useVersion();
  useEffect(() => {
    syncCodeDraft();
  });
  const target = codeTarget();
  const draft = S.codeDraft ?? "";
  const parsed = parseDSL(draft);
  const hasError = parsed.diagnostics.some((d) => d.severity === "error");

  return (
    <aside className="sidepanel code-sidepanel" aria-label="Diagram code">
      <PanelHeader icon="code" title="Diagram code" />
      {!target ? (
        <div className="sideempty">
          <p>
            Select a diagram to edit its code, or start one. Write structure
            only — colors and layout are automatic.
          </p>
          <div className="code-actions">
            <button
              className="primary"
              data-act="newDiagram"
              onClick={newDiagram}
            >
              New diagram
            </button>
            <button
              className="secondary"
              data-act="mermaid"
              onClick={openMermaid}
            >
              Import Mermaid
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="code-meta">
            <span className="framechip" title={target.title || "Diagram"}>
              {target.title ? `# ${target.title}` : "# Diagram"}
            </span>
            <span className={`sync${hasError ? " is-error" : ""}`}>
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: hasError ? "var(--danger)" : "#10b981",
                }}
              />{" "}
              {hasError ? "Syntax error" : "Synced with canvas"}
            </span>
          </div>
          <DiagramCodeEditor value={draft} onChange={updateCodeDraftAndSync} />
        </>
      )}

      {S.mermaidOpen ? (
        <div className="mermaid">
          <label>Paste a Mermaid flowchart</label>
          <textarea
            value={S.mermaidText || ""}
            onChange={(e) => {
              useBoardStore.setState({ mermaidText: e.target.value } as any);
              notify();
            }}
            placeholder="flowchart LR&#10;  A[Browser] --> B(API)&#10;  B --> C[(Postgres)]&#10;  B -..-> D{{Queue}}"
            spellCheck={false}
          />
          {S.mermaidError ? (
            <div className="diag error" style={{ margin: "6px 0" }}>
              {S.mermaidError}
            </div>
          ) : null}
          <div className="row end" style={{ gap: 8, marginTop: 4 }}>
            <button
              className="cancel-btn"
              onClick={() => {
                useBoardStore.setState({ mermaidOpen: false } as any);
                notify();
              }}
            >
              Cancel
            </button>
            <button className="primary convert-btn" onClick={mermaidConvert}>
              Convert to diagram
            </button>
          </div>
        </div>
      ) : null}

      <div className="code-foot">
        <button className="secondary" data-act="mermaid" onClick={openMermaid}>
          Import Mermaid
        </button>
        {target ? (
          <>
            <button
              className="secondary"
              data-act="copyCode"
              onClick={copyCode}
            >
              Copy
            </button>
            <button
              className="secondary"
              data-act="tidyCode"
              onClick={tidyCode}
            >
              Tidy up
            </button>
          </>
        ) : null}
      </div>
    </aside>
  );
}

/* ---------- assistant ---------- */

function Message({ m }: { m: any }) {
  if (m.kind === "user") return <div className="msg-user">{m.text}</div>;
  if (m.kind === "ai") return <div className="msg-ai">{m.text}</div>;
  if (m.kind === "tool")
    return (
      <div className="msg-tool">
        <Icon name="sparkles" size={12} /> {m.text}
      </div>
    );
  if (m.kind === "error") return <div className="msg-error">{m.text}</div>;
  return null;
}

export function AssistantPanel() {
  const ai = currentAI(S.assistant.provider, S.assistant.model);
  const hasKey = !!ai.key;
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const c = chatRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [S.assistant.messages.length, S.assistant.busy]);

  const send = () => {
    const v = inputRef.current?.value || "";
    if (inputRef.current) inputRef.current.value = "";
    sendAI(v);
  };

  return (
    <aside className="sidepanel" aria-label="Assistant">
      <header>
        <span className="sidetitle">
          <Icon name="sparkles" size={16} /> Assistant
        </span>
        <div className="sidehead-actions">
          <button
            className="secondary modelchip"
            onClick={openConnect}
            title="Change provider or model"
          >
            {hasKey ? ai.model : "Connect AI"}{" "}
            <Icon name="chevron" size={12} sw={2} />
          </button>
          <button
            className="iconbtn"
            onClick={() => setPanel(S.panel)}
            aria-label="Close panel"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>
      <div className="chat" id="chat" ref={chatRef}>
        {!S.assistant.messages.length ? (
          <div className="chat-empty">
            <p>
              Ask for a diagram, or select one and ask to change, explain or
              review it.
            </p>
            <div className="suggest">
              {AI_SUGGESTIONS.map((t) => (
                <button
                  className="suggest-chip"
                  key={t}
                  onClick={() => sendAI(t)}
                >
                  {t}
                </button>
              ))}
              <button className="suggest-chip" onClick={cleanIt}>
                Clean up my sketch
              </button>
            </div>
          </div>
        ) : (
          S.assistant.messages.map((m: any, i: number) => (
            <Message m={m} key={i} />
          ))
        )}
      </div>
      <div className="composer">
        <textarea
          id="askInput"
          rows={2}
          ref={inputRef}
          placeholder={
            hasKey
              ? "Ask, or select a diagram to edit it…"
              : "Connect your AI to start…"
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="composer-row">
          <span className="hint">
            {hasKey
              ? `Your ${ai.meta.label} key · sent only to ${ai.meta.label}`
              : "Bring your own key — nothing goes through JojoPen"}
          </span>
          {S.assistant.busy ? (
            <button className="secondary" onClick={stopAI}>
              Stop
            </button>
          ) : (
            <button className="sendbtn" onClick={send} aria-label="Send">
              <Icon name="arrowup" size={15} sw={2} />
            </button>
          )}
        </div>
        {hasKey ? (
          <button className="linkbtn" onClick={forgetKey}>
            Forget key
          </button>
        ) : null}
      </div>
    </aside>
  );
}

/* ---------- boards ---------- */

export function BoardsPanel() {
  useVersion();
  const collections = collectionsList();
  const allBoards = boardsList();
  const q = S.boardQuery || "";
  const activeColId = S.activeCollection || (collections[0]?.id ?? "col-jojo");
  const activeCol =
    collections.find((c) => c.id === activeColId) || collections[0];

  const [newColName, setNewColName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const collectionCounts: Record<string, number> = {};
  for (const b of allBoards) {
    const colId = b.collectionId || "col-jojo";
    collectionCounts[colId] = (collectionCounts[colId] || 0) + 1;
  }

  const filtered = allBoards.filter((b: any) => {
    if (q) {
      return b.name.toLowerCase().includes(q.toLowerCase());
    }
    return (b.collectionId || "col-jojo") === activeColId;
  });

  const handleAddCollection = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newColName.trim()) {
      e.preventDefault();
      const created = createCollection(newColName.trim());
      if (created) {
        useBoardStore.setState({ activeCollection: created.id } as any);
        setNewColName("");
        notify();
      }
    }
  };

  return (
    <aside className="sidepanel" aria-label="My boards">
      <header
        style={{
          padding: "0 14px 0 18px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          className="sidetitle"
          style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          My boards
        </span>
        <div className="sidehead-actions">
          <button
            className="iconbtn"
            onClick={() => setPanel("none")}
            aria-label="Close panel"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      <div
        className="sidebody boardspanel"
        style={{
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Search */}
        <div className="boardsearch">
          <Icon name="search" size={15} />
          <input
            placeholder="Search all boards"
            value={q}
            onChange={(e) => {
              S.boardQuery = e.target.value;
              notify();
            }}
          />
          {q ? (
            <button
              className="iconbtn small"
              style={{ padding: 2 }}
              onClick={() => {
                S.boardQuery = "";
                notify();
              }}
              title="Clear search"
            >
              <Icon name="close" size={12} />
            </button>
          ) : null}
        </div>

        {/* Collections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="section-label"
            style={{
              padding: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Collections
          </div>

          <div
            className="collections"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 0,
            }}
          >
            {collections.map((col) => {
              const isOn = activeColId === col.id;
              return (
                <button
                  key={col.id}
                  className={isOn ? "is-on" : ""}
                  onClick={() => {
                    useBoardStore.setState({ activeCollection: col.id } as any);
                    notify();
                  }}
                >
                  <span>{col.name}</span>
                  <small>{collectionCounts[col.id] || 0}</small>
                </button>
              );
            })}
          </div>

          <div className="newcollection" style={{ padding: 0 }}>
            <input
              className="input"
              style={{
                height: 32,
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--text) 3%, transparent)",
              }}
              placeholder="+ New collection..."
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={handleAddCollection}
            />
          </div>

          <button
            className="btn is-primary"
            data-act="newBoard"
            style={{
              width: "100%",
              height: 36,
              borderRadius: 10,
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              marginTop: 4,
            }}
            onClick={newBoard}
          >
            <Icon name="plus" size={14} sw={2.2} /> New board
          </button>
        </div>

        {/* Boards in Collection / Matching Boards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            className="section-label"
            style={{
              padding: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {q
              ? "Matching boards"
              : `BOARDS IN ${(activeCol?.name || "COLLECTION").toUpperCase()}`}
          </div>

          <ul
            className="boardlist"
            style={{
              padding: 0,
              margin: 0,
              listStyle: "none",
              display: "grid",
              gap: 2,
            }}
          >
            {filtered.length ? (
              filtered.map((b: any) => {
                const isCurrent = b.id === S.doc.id;
                if (confirmDeleteId === b.id) {
                  return (
                    <li key={b.id} className="boardrow is-confirm">
                      <div className="boardconfirm">
                        Delete “{b.name}”? This can’t be undone.
                      </div>
                      <div className="boardconfirm-actions">
                        <button
                          className="btn"
                          style={{
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn is-danger"
                          style={{
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            background: "#e5484d",
                            borderColor: "#e5484d",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBoard(b.id);
                            setConfirmDeleteId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={b.id}
                    className="boardrow"
                    style={{ position: "relative" }}
                  >
                    <a
                      href={`#/b/${b.id}`}
                      className={`boardlink${isCurrent ? " is-current" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        openBoard(b.id);
                      }}
                    >
                      <div className="boardtitle">{b.name}</div>
                      <div className="boardmeta">
                        <span>
                          {new Date(b.updatedAt).toLocaleDateString()}
                        </span>
                        <Icon name="lock" size={11} />
                      </div>
                    </a>
                    <div className="boardrow-actions">
                      <button
                        className="iconbtn small"
                        data-act="deleteBoard"
                        data-id={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(b.id);
                        }}
                        title="Delete"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </li>
                );
              })
            ) : (
              <li
                className="muted"
                style={{ padding: "10px 8px", fontSize: 12 }}
              >
                {q ? "No boards match." : "No boards in this collection."}
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}
