import { useEffect, useRef, useState } from "react";
import { SLIDE_H, SLIDE_W, type BoardElement } from "../lib/model";
import { parseDSL } from "../lib/dsl";
import { currentAI } from "../lib/ai";
import { AI_SUGGESTIONS } from "../state/actions";
import {
  S,
  boardsList,
  elements,
  notify,
  slideChildren,
  slides,
} from "../state/store";
import {
  addSlide,
  applyCode,
  arrangeSlides,
  buildAdd,
  buildReplay,
  cleanIt,
  copyBoardLink,
  deleteBoard,
  deleteSlide,
  downloadJSON,
  duplicateSlide,
  exampleCode,
  forgetKey,
  importJSON,
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
  toggleBuilds,
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
  children,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <span className="sidetitle">
        <Icon name={icon} size={16} /> {title}
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
  return (
    <aside className="sidepanel" aria-label="Slides">
      <PanelHeader icon="slides" title="Slides">
        <button
          className="slides-present"
          data-act="present"
          onClick={() => present(0)}
          disabled={!list.length}
        >
          <Icon name="present" size={14} sw={2} /> Present
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
              Add one from a layout, turn a selection into a slide, or press
              Mod+Enter to present.
            </p>
          </div>
        ) : (
          list.map((sl, i) => (
            <div
              className={`slidecard${S.selection.has(sl.id) ? " is-active" : ""}`}
              key={sl.id}
              data-slide={sl.id}
            >
              <div className="slidecard-head">
                <span className="slidecard-num">{i + 1}</span>
                <input
                  className="slidecard-title"
                  defaultValue={sl.title || ""}
                  aria-label="Slide title"
                  onBlur={(e) => renameSlide(sl.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                />
                <div className="slidecard-actions">
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
                    data-act="duplicateSlide"
                    data-id={sl.id}
                    onClick={() => duplicateSlide(sl.id)}
                    title="Duplicate"
                  >
                    <Icon name="duplicate" size={13} />
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
              <div className="builds">
                <label className="builds-check">
                  <input
                    type="checkbox"
                    data-act="toggleBuilds"
                    data-id={sl.id}
                    checked={(sl.builds || []).length > 0}
                    onChange={(e) => toggleBuilds(sl.id, e.target.checked)}
                  />{" "}
                  Replay how it was drawn, step by step (
                  {slideChildren(sl).length} steps)
                </label>
                <div className="builds-actions">
                  <button
                    data-act="buildAdd"
                    data-mode="appear"
                    data-id={sl.id}
                    onClick={() => buildAdd(sl.id, "appear")}
                    title="Reveal the selected items one by one"
                  >
                    + Appear
                  </button>
                  <button
                    data-act="buildAdd"
                    data-mode="highlight"
                    data-id={sl.id}
                    onClick={() => buildAdd(sl.id, "highlight")}
                    title="Emphasise the selected items"
                  >
                    + Highlight
                  </button>
                  <button
                    data-act="buildReplay"
                    data-id={sl.id}
                    onClick={() => buildReplay(sl.id)}
                    title="Replay the build from the start"
                  >
                    <Icon name="play" size={11} /> Replay
                  </button>
                </div>
              </div>
              <div className="notes">
                <textarea
                  defaultValue={sl.notes || ""}
                  placeholder="Speaker notes…"
                  onBlur={(e) => setNotes(sl.id, e.target.value)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

/* ---------- code ---------- */

export function CodePanel() {
  useEffect(() => {
    syncCodeDraft();
  });
  const target = S.codeFor ? S.doc.elements[S.codeFor] : null;
  const draft = S.codeDraft ?? "";
  const parsed = parseDSL(draft);
  return (
    <aside className="sidepanel" aria-label="Diagram code">
      <PanelHeader icon="code" title="Diagram code" />
      <div className="sidebody">
        <p className="note" style={{ marginTop: 0 }}>
          JojoPen diagrams are written in a small, forgiving text language.
          Describe structure only — layout and colors are automatic.
        </p>
        <textarea
          className="input codearea"
          id="codeArea"
          spellCheck={false}
          aria-label="Diagram source"
          value={draft}
          onChange={(e) => setCodeDraft(e.target.value)}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" data-act="applyCode" onClick={applyCode}>
            <Icon name="check" size={15} />{" "}
            {target ? "Apply to diagram" : "Add diagram"}
          </button>
          <button
            className="secondary"
            data-act="validateCode"
            onClick={validateCode}
          >
            Validate
          </button>
          <button
            className="secondary"
            data-act="newDiagram"
            onClick={newDiagram}
          >
            <Icon name="plus" size={14} /> New diagram
          </button>
          <button
            className="secondary"
            data-act="mermaid"
            onClick={openMermaid}
          >
            <Icon name="upload" size={14} /> Import Mermaid
          </button>
          <button
            className="secondary"
            data-act="exampleCode"
            onClick={exampleCode}
          >
            Example
          </button>
        </div>
        <div className="section-label">Structure</div>
        <div className="kv">
          <span>Title</span>
          <b>{parsed.title || "—"}</b>
        </div>
        <div className="kv">
          <span>Direction</span>
          <b>{parsed.direction}</b>
        </div>
        <div className="kv">
          <span>Nodes</span>
          <b>{parsed.nodes.size}</b>
        </div>
        <div className="kv">
          <span>Groups</span>
          <b>{parsed.groups.size}</b>
        </div>
        <div className="kv">
          <span>Edges</span>
          <b>{parsed.edges.length}</b>
        </div>
        <div className="section-label">Diagnostics</div>
        {parsed.diagnostics.length ? (
          parsed.diagnostics.map((d, i) => (
            <div className={`diag ${d.severity}`} key={i}>
              Line {d.line}: {d.message}
            </div>
          ))
        ) : (
          <div className="diag info">No problems found.</div>
        )}
        <p className="note">
          Tip: <code>A -&gt; B</code> sync · <code>--&gt;</code> async ·{" "}
          <code>&lt;-&gt;</code> bidirectional · <code>-.&gt;</code> optional ·{" "}
          <code>--</code> plain line. Groups nest with{" "}
          <code>group Name {"{ }"}</code>.
        </p>
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
  const list = boardsList();
  const q = S.boardQuery || "";
  const filtered = list.filter(
    (b: any) => !q || b.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <aside className="sidepanel" aria-label="My boards">
      <PanelHeader icon="docshape" title="My boards" />
      <div className="sidebody">
        <div className="row">
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Search all boards"
            value={q}
            onChange={(e) => {
              S.boardQuery = e.target.value;
              notify();
            }}
          />
          <Icon name="search" size={15} />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="primary" data-act="newBoard" onClick={newBoard}>
            <Icon name="plus" size={14} sw={2} /> New board
          </button>
          <button className="secondary" data-act="import" onClick={importJSON}>
            Import
          </button>
          <button
            className="secondary"
            data-act="backup"
            onClick={downloadJSON}
          >
            Backup
          </button>
        </div>
        <div className="section-label">Boards</div>
        <ul className="boardlist">
          {filtered.length ? (
            filtered.map((b: any) => (
              <li
                className={`boarditem${b.id === S.doc.id ? " is-current" : ""}`}
                key={b.id}
                data-act="openBoard"
                data-id={b.id}
                onClick={() => openBoard(b.id)}
              >
                <span className="thumbmini">
                  <Icon name="board" size={18} />
                </span>
                <span className="bt">
                  <b>{b.name}</b>
                  <small>
                    {b.kind === "deck" ? "Slides · " : ""}
                    {new Date(b.updatedAt).toLocaleDateString()}
                  </small>
                </span>
                {b.id === S.doc.id ? (
                  <span className="small muted">open</span>
                ) : null}
                <button
                  className="iconbtn small"
                  data-act="deleteBoard"
                  data-id={b.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBoard(b.id);
                  }}
                  title="Delete"
                >
                  <Icon name="trash" size={13} />
                </button>
              </li>
            ))
          ) : (
            <li className="muted" style={{ padding: "10px 8px", fontSize: 12 }}>
              {list.length ? "No boards match." : "No saved boards yet."}
            </li>
          )}
        </ul>
        <div className="section-label">This board</div>
        <div className="kv">
          <span>Name</span>
          <b>{S.doc.name}</b>
        </div>
        <div className="kv">
          <span>Elements</span>
          <b>{elements().length}</b>
        </div>
        <div className="kv">
          <span>Slides</span>
          <b>{slides().length}</b>
        </div>
        <div className="kv">
          <span>Storage</span>
          <b>This device</b>
        </div>
        <button
          className="secondary"
          style={{ marginTop: 12 }}
          onClick={copyBoardLink}
        >
          <Icon name="link" size={14} /> Copy board link
        </button>
      </div>
    </aside>
  );
}
