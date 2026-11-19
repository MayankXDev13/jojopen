import { useEffect, useRef, useState } from "react";
import { AI_META, loadAIConfig } from "../lib/ai";
import { svgToDataURL } from "../lib/exportSvg";
import {
  COMMANDS,
  filteredCommands,
  filteredIcons,
  prettyKey,
} from "../state/commands";
import { S, collectionsList, notify, slides, toast } from "../state/store";
import {
  closeOverlays,
  copyExport,
  doExport,
  exportPreview,
  exportSizeLabel,
  exportState,
  getIconMode,
  insertIcon,
  mermaidConvert,
  saveAIKey,
  saveRename,
  setExportOpts,
  setIconMode,
} from "../state/actions";
import { Icon, LibraryIcon } from "./Icon";
import { resolveIcon, loadIconLibrary } from "../lib/iconLibrary";
import { useVersion } from "../state/boardStore";

function Scrim({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: string;
}) {
  return (
    <div
      className="scrim"
      style={
        align ? { alignItems: "flex-start", paddingTop: align } : undefined
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlays();
      }}
    >
      {children}
    </div>
  );
}

function Sheet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sheet" role="dialog" aria-label={label}>
      {children}
    </div>
  );
}

export function Overlays() {
  useVersion();
  if (S.shortcuts) return <ShortcutsSheet />;
  if (S.palette) return <CommandPalette />;
  if (S.exportOpen) return <ExportDialog />;
  if (S.connectOpen) return <ConnectDialog />;
  if (S.mermaidOpen) return <MermaidDialog />;
  if (S.iconSearch) return <IconSearch />;
  if (S.renameOpen) return <BoardSettings />;
  return null;
}

function ShortcutsSheet() {
  useVersion();
  return (
    <Scrim>
      <Sheet label="Keyboard shortcuts">
        <div
          className="row"
          style={{ justifyContent: "space-between", marginBottom: 8 }}
        >
          <h2 style={{ margin: 0 }}>Keyboard shortcuts</h2>
          <button className="iconbtn" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-grid">
          {["Tools", "Edit", "Arrange", "View", "Panels"].map((group) => (
            <div key={group}>
              <h3>{group}</h3>
              <dl>
                {COMMANDS.filter((c) => c.group === group && !c.hidden).map(
                  (c) => (
                    <div className="row2" key={c.id}>
                      <dt>{c.label}</dt>
                      <dd>
                        {c.keys.map((k) => (
                          <kbd key={k}>{prettyKey(k)}</kbd>
                        ))}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          ))}
        </div>
        <p className="sheet-foot">
          Hold <kbd>Space</kbd> to pan · hold <kbd>Alt</kbd> while dragging to
          duplicate · scroll to pan, pinch or <kbd>⌘/Ctrl</kbd>+scroll to zoom.
        </p>
      </Sheet>
    </Scrim>
  );
}

function CommandPalette() {
  useVersion();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const list = filteredCommands();
  const cur = Math.max(0, Math.min(S.paletteIndex || 0, list.length - 1));
  return (
    <Scrim align="12vh">
      <div className="palette" role="dialog" aria-label="Command palette">
        <input
          ref={ref}
          id="paletteInput"
          placeholder="Type a command…"
          autoComplete="off"
          value={S.paletteQ || ""}
          onChange={(e) => {
            S.paletteQ = e.target.value;
            S.paletteIndex = 0;
            notify();
          }}
        />
        <div className="palette-list">
          {list.length ? (
            list.map((c, i) => (
              <button
                key={c.id}
                className={`palette-item${i === cur ? " is-cursor" : ""}`}
                onClick={() => {
                  closeOverlays();
                  c.run();
                }}
              >
                <span>{c.label}</span>
                <span className="g">{c.group}</span>
              </button>
            ))
          ) : (
            <div className="palette-empty">
              No commands match “{S.paletteQ || ""}”.
            </div>
          )}
        </div>
      </div>
    </Scrim>
  );
}

function ExportDialog() {
  useVersion();
  const o = exportState();
  const hasSel = S.selection.size > 0;
  const deck = slides().length;
  const scopeOpts: [string, string][] = [
    ["board", "Whole board"],
    ...(hasSel ? ([["selection", "Selection"]] as [string, string][]) : []),
    ...(deck ? ([["slides", `Slides (${deck})`]] as [string, string][]) : []),
  ];
  const fmtOpts: [string, string][] =
    o.scope === "slides"
      ? [
          ["pdf", "PDF deck"],
          ["png", "PNG per slide"],
        ]
      : [
          ["png", "PNG"],
          ["svg", "SVG"],
        ];
  const preview = exportPreview();
  return (
    <Scrim>
      <div className="modal wide" role="dialog" aria-label="Export">
        <header>
          <h2>Export</h2>
          <button className="iconbtn" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="export-body">
          <div className="export-preview">
            {preview ? (
              <img alt="Export preview" src={svgToDataURL(preview)} />
            ) : (
              <span className="muted small">Nothing to export yet</span>
            )}
          </div>
          <div className="export-opts">
            <fieldset>
              <legend>What</legend>
              <div className="seginline">
                {scopeOpts.map(([v, l]) => (
                  <button
                    key={v}
                    data-act="expScope"
                    data-scope={v}
                    className={o.scope === v ? "is-on" : ""}
                    onClick={() => setExportOpts({ scope: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Format</legend>
              <div className="seginline">
                {fmtOpts.map(([v, l]) => (
                  <button
                    key={v}
                    data-act="expFormat"
                    data-format={v}
                    className={o.format === v ? "is-on" : ""}
                    onClick={() => setExportOpts({ format: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            {o.format === "png" ? (
              <fieldset>
                <legend>Scale</legend>
                <div className="seginline">
                  {[1, 2, 3, 4].map((v) => (
                    <button
                      key={v}
                      data-act="expScale"
                      data-scale={v}
                      className={o.scale === v ? "is-on" : ""}
                      onClick={() => setExportOpts({ scale: v })}
                    >
                      {v}×
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <label className="check">
              <input
                type="checkbox"
                data-act="expBg"
                checked={!!o.bg}
                onChange={(e) => setExportOpts({ bg: e.target.checked })}
              />{" "}
              Background
            </label>
            <label className="check">
              <input
                type="checkbox"
                data-act="expDark"
                checked={!!o.dark}
                onChange={(e) => setExportOpts({ dark: e.target.checked })}
              />{" "}
              Dark mode
            </label>
            <p className="export-size">
              {o.scope === "slides"
                ? `${deck} slide${deck === 1 ? "" : "s"} · 1280 × 720`
                : exportSizeLabel(o)}
            </p>
          </div>
        </div>
        <div className="modal-foot">
          {o.scope !== "slides" && o.format !== "svg" ? (
            <button
              className="secondary"
              data-act="copyExport"
              onClick={copyExport}
            >
              Copy
            </button>
          ) : null}
          <button className="primary" data-act="doExport" onClick={doExport}>
            <Icon name="download" size={15} sw={1.9} />{" "}
            {o.scope === "slides"
              ? o.format === "pdf"
                ? "Print / save PDF"
                : `Download ${deck} PNG${deck === 1 ? "" : "s"}`
              : `Download ${String(o.format).toUpperCase()}`}
          </button>
        </div>
      </div>
    </Scrim>
  );
}

function ConnectDialog() {
  useVersion();
  const cfg = loadAIConfig();
  const [provider, setProvider] = useState(
    S.connectProvider || cfg.provider || "anthropic",
  );
  const [model, setModel] = useState(
    (S.connectModel ??
      (cfg.provider === (S.connectProvider || cfg.provider)
        ? cfg.model
        : "")) ||
      AI_META[provider].model,
  );
  const [key, setKey] = useState((cfg.keys || {})[provider] || "");
  const [baseUrl, setBaseUrl] = useState(
    cfg.baseUrl || "https://openrouter.ai/api/v1",
  );
  const meta = AI_META[provider];

  return (
    <Scrim>
      <div className="modal" role="dialog" aria-label="Connect AI">
        <header>
          <h2>Connect your AI</h2>
          <button className="iconbtn" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">
          <p className="note" style={{ marginTop: 0 }}>
            Bring your own key. Requests go straight from this browser to the
            provider you pick — nothing is sent to JojoPen.{" "}
            <a
              href="/docs/mcp/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline", color: "inherit" }}
            >
              Or connect via MCP
            </a>
            .
          </p>
          <div className="provider-grid">
            {Object.entries(AI_META).map(([id, m]) => (
              <button
                key={id}
                className={`provider${provider === id ? " is-on" : ""}`}
                onClick={() => {
                  setProvider(id);
                  setModel(AI_META[id].model);
                }}
              >
                <span className="provider-name">{m.label}</span>
                <span className="provider-sub">{m.sub}</span>
              </button>
            ))}
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Model</span>
            <input
              className="input"
              data-role="aiModel"
              value={model}
              placeholder={meta.model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          {provider === "openai-compatible" ? (
            <label className="field">
              <span>Base URL</span>
              <input
                className="input"
                data-role="aiBase"
                value={baseUrl}
                placeholder="https://openrouter.ai/api/v1"
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </label>
          ) : null}
          <label className="field">
            <span>API key</span>
            <input
              className="input"
              type="password"
              data-role="aiKey"
              value={key}
              placeholder="sk-…"
              autoComplete="off"
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <p className="note">
            {provider === "openai-compatible"
              ? "Works with OpenRouter, Ollama, LM Studio and any OpenAI-compatible endpoint."
              : "Your key is stored only in this browser’s local storage."}
          </p>
          <div className="row end" style={{ marginTop: 14 }}>
            <button
              className="secondary"
              data-act="closeOverlay"
              onClick={closeOverlays}
            >
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                if (!key.trim()) return toast("Paste an API key first");
                saveAIKey(
                  provider,
                  key.trim(),
                  model.trim() || meta.model,
                  baseUrl.trim(),
                );
              }}
            >
              <Icon name="check" size={15} /> Connect
            </button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}

function MermaidDialog() {
  useVersion();
  return (
    <Scrim>
      <div className="modal wide" role="dialog" aria-label="Import Mermaid">
        <header>
          <h2>Import Mermaid</h2>
          <button className="iconbtn" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">
          <p className="note" style={{ marginTop: 0 }}>
            Paste a Mermaid flowchart. Node shapes, labels, dashed links and
            subgraphs are converted to JojoPen's diagram language.
          </p>
          <textarea
            className="input codearea"
            id="mermaidInput"
            data-role="mermaid"
            spellCheck={false}
            aria-label="Mermaid source"
            style={{ minHeight: 230 }}
            value={S.mermaidText || ""}
            onChange={(e) => {
              S.mermaidText = e.target.value;
              notify();
            }}
          />
          {S.mermaidError ? (
            <div className="diag error">{S.mermaidError}</div>
          ) : null}
          <p className="note">
            Supported: <code>flowchart LR|RL|TD|TB</code>, <code>A[Box]</code>,{" "}
            <code>A(Round)</code>, <code>A((Circle))</code>,{" "}
            <code>A{"{Decision}"}</code>, <code>A[(Database)]</code>,{" "}
            <code>--&gt;</code>, <code>-.&gt;</code>, <code>---</code>,{" "}
            <code>|labels|</code> and <code>subgraph</code>.
          </p>
          <div className="row end" style={{ marginTop: 14 }}>
            <button
              className="secondary"
              data-act="closeOverlay"
              onClick={closeOverlays}
            >
              Cancel
            </button>
            <button
              className="primary"
              data-act="mermaidConvert"
              onClick={mermaidConvert}
            >
              <Icon name="check" size={15} /> Convert to diagram
            </button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}

function IconSearch() {
  useVersion();
  const ref = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    loadIconLibrary().then(() => notify());
  }, []);
  const list = filteredIcons();
  const cur = Math.max(0, Math.min(S.iconCursor || 0, list.length - 1));
  const mode = getIconMode();
  useEffect(() => {
    gridRef.current
      ?.querySelector(`[data-i="${cur}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cur]);
  return (
    <Scrim align="10vh">
      <div className="iconsearch" role="dialog" aria-label="Insert icon">
        <div className="iconsearch-field">
          <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <circle
              cx="9"
              cy="9"
              r="5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m13.2 13.2 3.6 3.6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={ref}
            id="iconSearchInput"
            placeholder="Search icons: user, database, postgres, queue…"
            aria-label="Search icons"
            spellCheck={false}
            autoComplete="off"
            value={S.iconQuery || ""}
            onChange={(e) => {
              S.iconQuery = e.target.value;
              S.iconCursor = 0;
              notify();
            }}
          />
          <kbd>esc</kbd>
        </div>
        <div
          className="iconsearch-grid"
          id="iconGrid"
          ref={gridRef}
          role="listbox"
          aria-label="Icons"
        >
          {list.length ? (
            list.map((k, i) => {
              const def = resolveIcon(k);
              return (
                <button
                  key={k}
                  data-i={i}
                  role="option"
                  aria-selected={i === cur}
                  className={`iconsearch-glyph${i === cur ? " is-active" : ""}`}
                  title={def?.name || k}
                  onMouseEnter={() => {
                    S.iconCursor = i;
                    notify();
                  }}
                  onClick={() => insertIcon(k)}
                >
                  <span className="iconsearch-glyphicon">
                    <LibraryIcon name={k} size={26} />
                  </span>
                  <span className="iconsearch-name">{def?.name || k}</span>
                </button>
              );
            })
          ) : (
            <div className="iconsearch-empty">
              No icon matches “{S.iconQuery || ""}”.
            </div>
          )}
        </div>
        <div className="iconsearch-foot">
          <div
            className="iconsearch-mode"
            role="radiogroup"
            aria-label="Add as"
          >
            <button
              role="radio"
              aria-checked={mode === "box"}
              className={mode === "box" ? "is-on" : undefined}
              onClick={() => setIconMode("box")}
              title="An empty box with the icon on its edge; press Enter on it to type"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="5"
                  width="16"
                  height="10"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle cx="6.5" cy="10" r="1.6" fill="currentColor" />
              </svg>
              Box
            </button>
            <button
              role="radio"
              aria-checked={mode === "icon"}
              className={mode === "icon" ? "is-on" : undefined}
              onClick={() => setIconMode("icon")}
              title="Just the icon"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Icon only
            </button>
          </div>
          <span className="iconsearch-hint">
            <kbd>tab</kbd> switch
          </span>
          <span className="iconsearch-hint">
            <kbd>↵</kbd> add{mode === "box" ? ", then ↵ to type" : ""}
          </span>
        </div>
      </div>
    </Scrim>
  );
}

function BoardSettings() {
  useVersion();
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  // Compute clean link prefix without any erroneous leading slash
  const host = (
    typeof window !== "undefined"
      ? window.location.host || "jojopen.com"
      : "jojopen.com"
  ).replace(/^\/+/, "");
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const segments = pathname.split("/").filter(Boolean);

  let prefix = "";
  let initialSlug = S.doc.id;

  if (segments.length >= 2) {
    prefix = `${host}/${segments.slice(0, -1).join("/")}/`;
    initialSlug = segments[segments.length - 1] || S.doc.id;
  } else if (segments.length === 1 && segments[0] !== "b") {
    prefix = `${host}/${segments[0]}/`;
  } else {
    prefix = `${host}/`;
  }

  const handleSave = () => {
    const newName = nameRef.current?.value || "";
    const newSlug = slugRef.current?.value || "";
    saveRename(newName, newSlug);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Scrim>
      <div
        className="modal"
        style={{ width: "min(420px,100%)" }}
        role="dialog"
        aria-label="Board details"
      >
        <header>
          <h2>Board details</h2>
        </header>
        <div className="modal-body" style={{ display: "grid", gap: 12 }}>
          <label className="label-sm">
            <span>Name</span>
            <input
              ref={nameRef}
              className="input"
              id="renameInput"
              defaultValue={S.doc.name}
              placeholder="Board name"
              onKeyDown={onKey}
            />
          </label>
          <label className="label-sm">
            <span>Link</span>
            <div className="linkfield">
              <span className="linkprefix" title={prefix}>
                {prefix}
              </span>
              <input
                ref={slugRef}
                id="renameSlug"
                defaultValue={initialSlug}
                placeholder="slug"
                onKeyDown={onKey}
              />
            </div>
          </label>
          <div className="modal-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              data-act="closeOverlay"
              onClick={closeOverlays}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn is-primary"
              data-act="saveRename"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}
