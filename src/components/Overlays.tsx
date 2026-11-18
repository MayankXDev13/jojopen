import { useEffect, useRef, useState } from 'react';
import { AI_META, loadAIConfig } from '../lib/ai';
import { svgToDataURL } from '../lib/exportSvg';
import { COMMANDS, filteredCommands, filteredIcons, prettyKey } from '../state/commands';
import {
  S,
  notify,
  persist,
  settings,
  slides,
  toast,
} from '../state/store';
import {
  applyTemplate,
  closeOverlays,
  copyExport,
  doExport,
  downloadJSON,
  exportPreview,
  exportSizeLabel,
  exportState,
  importJSON,
  insertIcon,
  mermaidConvert,
  newBoard,
  openExport,
  openShortcuts,
  saveAIKey,
  saveRename,
  setPanel,
  setExportOpts,
  toggleBw,
  toggleTheme,
} from '../state/actions';
import { sotToggle } from '../state/sot';
import { Icon } from './Icon';

function Scrim({ children, align }: { children: React.ReactNode; align?: string }) {
  return (
    <div
      className="scrim"
      style={align ? { alignItems: 'flex-start', paddingTop: align } : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlays();
      }}
    >
      {children}
    </div>
  );
}

function Sheet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sheet" role="dialog" aria-label={label}>
      {children}
    </div>
  );
}

export function Overlays() {
  if (S.help) return <MenuSheet />;
  if (S.shortcuts) return <ShortcutsSheet />;
  if (S.palette) return <CommandPalette />;
  if (S.exportOpen) return <ExportDialog />;
  if (S.connectOpen) return <ConnectDialog />;
  if (S.mermaidOpen) return <MermaidDialog />;
  if (S.iconSearch) return <IconSearch />;
  if (S.renameOpen) return <BoardSettings />;
  return null;
}

function MenuSheet() {
  const pickPanel = (name: string) => {
    closeOverlays();
    setPanel(name);
  };
  return (
    <Scrim>
      <Sheet label="Main menu">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Main menu</h2>
          <button className="iconbtn" data-act="closeOverlay" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <button className="primary" onClick={() => { closeOverlays(); newBoard(); }}>
            <Icon name="plus" size={14} sw={2} /> New board
          </button>
          <button className="secondary" onClick={() => pickPanel('boards')}>
            <Icon name="docshape" size={14} /> My boards
          </button>
          <button className="secondary" onClick={() => { closeOverlays(); importJSON(); }}>
            <Icon name="upload" size={14} /> Import JSON
          </button>
          <button className="secondary" onClick={downloadJSON}>
            <Icon name="download" size={14} /> Backup JSON
          </button>
        </div>
        <div className="section-label">Templates</div>
        <div className="start-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <button className="start-card" onClick={() => { closeOverlays(); applyTemplate('system'); }}>
            <span className="start-icon"><Icon name="cylinder" size={18} /></span>
            <span className="start-title">System design</span>
            <span className="start-blurb">URL shortener architecture.</span>
          </button>
          <button className="start-card" onClick={() => { closeOverlays(); applyTemplate('flow'); }}>
            <span className="start-icon"><Icon name="diamond" size={18} /></span>
            <span className="start-title">Flowchart</span>
            <span className="start-blurb">Sign-up flow, top to bottom.</span>
          </button>
          <button className="start-card" onClick={() => { closeOverlays(); applyTemplate('deck'); }}>
            <span className="start-icon"><Icon name="slides" size={18} /></span>
            <span className="start-title">Slide deck</span>
            <span className="start-blurb">Title, agenda, diagram slide.</span>
          </button>
        </div>
        <div className="section-label">Workspace</div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={() => pickPanel('assistant')}>
            <Icon name="sparkles" size={14} /> Assistant
          </button>
          <button className="secondary" onClick={() => pickPanel('code')}>
            <Icon name="code" size={14} /> Diagram code
          </button>
          <button className="secondary" onClick={() => pickPanel('slides')}>
            <Icon name="slides" size={14} /> Slides
          </button>
          <button className="secondary" onClick={() => { closeOverlays(); sotToggle(); }}>
            <Icon name="hourglass" size={14} /> Sands of Time
          </button>
          <button className="secondary" onClick={() => { closeOverlays(); openShortcuts(); }}>
            <Icon name="help" size={14} /> Keyboard shortcuts
          </button>
          <button className="secondary" onClick={() => { closeOverlays(); openExport(); }}>
            <Icon name="download" size={14} /> Export
          </button>
        </div>
        <div className="section-label">Style</div>
        <div className="row" style={{ gap: 8 }}>
          {(['sketch', 'clean', 'chalkboard'] as const).map((style) => (
            <button
              key={style}
              className="secondary"
              onClick={() => {
                settings().style = style;
                persist();
                notify();
              }}
            >
              {style === 'sketch' ? 'Sketch' : style === 'clean' ? 'Clean' : 'Chalkboard'}
            </button>
          ))}
          <button className="secondary" onClick={toggleTheme}>
            <Icon name="moon" size={14} /> Light / dark
          </button>
          <button className="secondary" onClick={toggleBw}>
            <Icon name="contrast" size={14} /> Black &amp; white
          </button>
        </div>
        <p className="sheet-foot">
          JojoPen is an infinite whiteboard with slides and a diagram language. Everything here is saved on this device. Your AI key, if you
          connect one, never leaves your browser except to call the provider you chose.
        </p>
        <div className="row end" style={{ marginTop: 14 }}>
          <button className="secondary" onClick={closeOverlays}>
            Close
          </button>
        </div>
      </Sheet>
    </Scrim>
  );
}

function ShortcutsSheet() {
  return (
    <Scrim>
      <Sheet label="Keyboard shortcuts">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Keyboard shortcuts</h2>
          <button className="iconbtn" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-grid">
          {['Tools', 'Edit', 'Arrange', 'View', 'Panels'].map((group) => (
            <div key={group}>
              <h3>{group}</h3>
              <dl>
                {COMMANDS.filter((c) => c.group === group && !c.hidden).map((c) => (
                  <div className="row2" key={c.id}>
                    <dt>{c.label}</dt>
                    <dd>
                      {c.keys.map((k) => (
                        <kbd key={k}>{prettyKey(k)}</kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="sheet-foot">
          Hold <kbd>Space</kbd> to pan · hold <kbd>Alt</kbd> while dragging to place freely · scroll to pan, pinch or <kbd>⌘/Ctrl</kbd>+scroll
          to zoom.
        </p>
      </Sheet>
    </Scrim>
  );
}

function CommandPalette() {
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
          value={S.paletteQ || ''}
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
                className={`palette-item${i === cur ? ' is-cursor' : ''}`}
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
            <div className="palette-empty">No commands match “{S.paletteQ || ''}”.</div>
          )}
        </div>
      </div>
    </Scrim>
  );
}

function ExportDialog() {
  const o = exportState();
  const hasSel = S.selection.size > 0;
  const deck = slides().length;
  const scopeOpts: [string, string][] = [
    ['board', 'Whole board'],
    ...(hasSel ? ([['selection', 'Selection']] as [string, string][]) : []),
    ...(deck ? ([[ 'slides', `Slides (${deck})`]] as [string, string][]) : []),
  ];
  const fmtOpts: [string, string][] = o.scope === 'slides' ? [['pdf', 'PDF deck'], ['png', 'PNG per slide']] : [['png', 'PNG'], ['svg', 'SVG']];
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
            {preview ? <img alt="Export preview" src={svgToDataURL(preview)} /> : <span className="muted small">Nothing to export yet</span>}
          </div>
          <div className="export-opts">
            <fieldset>
              <legend>What</legend>
              <div className="seginline">
                {scopeOpts.map(([v, l]) => (
                  <button key={v} data-act="expScope" data-scope={v} className={o.scope === v ? 'is-on' : ''} onClick={() => setExportOpts({ scope: v })}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Format</legend>
              <div className="seginline">
                {fmtOpts.map(([v, l]) => (
                  <button key={v} data-act="expFormat" data-format={v} className={o.format === v ? 'is-on' : ''} onClick={() => setExportOpts({ format: v })}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            {o.format === 'png' ? (
              <fieldset>
                <legend>Scale</legend>
                <div className="seginline">
                  {[1, 2, 3, 4].map((v) => (
                    <button key={v} data-act="expScale" data-scale={v} className={o.scale === v ? 'is-on' : ''} onClick={() => setExportOpts({ scale: v })}>
                      {v}×
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <label className="check">
              <input type="checkbox" data-act="expBg" checked={!!o.bg} onChange={(e) => setExportOpts({ bg: e.target.checked })} /> Background
            </label>
            <label className="check">
              <input type="checkbox" data-act="expDark" checked={!!o.dark} onChange={(e) => setExportOpts({ dark: e.target.checked })} /> Dark mode
            </label>
            <p className="export-size">{o.scope === 'slides' ? `${deck} slide${deck === 1 ? '' : 's'} · 1280 × 720` : exportSizeLabel(o)}</p>
          </div>
        </div>
        <div className="modal-foot">
          {o.scope !== 'slides' && o.format !== 'svg' ? (
            <button className="secondary" data-act="copyExport" onClick={copyExport}>
              Copy
            </button>
          ) : null}
          <button className="primary" data-act="doExport" onClick={doExport}>
            <Icon name="download" size={15} sw={1.9} />{' '}
            {o.scope === 'slides'
              ? o.format === 'pdf'
                ? 'Print / save PDF'
                : `Download ${deck} PNG${deck === 1 ? '' : 's'}`
              : `Download ${String(o.format).toUpperCase()}`}
          </button>
        </div>
      </div>
    </Scrim>
  );
}

function ConnectDialog() {
  const cfg = loadAIConfig();
  const [provider, setProvider] = useState(S.connectProvider || cfg.provider || 'anthropic');
  const [model, setModel] = useState((S.connectModel ?? (cfg.provider === (S.connectProvider || cfg.provider) ? cfg.model : '')) || AI_META[provider].model);
  const [key, setKey] = useState((cfg.keys || {})[provider] || '');
  const [baseUrl, setBaseUrl] = useState(cfg.baseUrl || 'https://openrouter.ai/api/v1');
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
            Bring your own key. Requests go straight from this browser to the provider you pick — nothing is sent to JojoPen.
          </p>
          <div className="provider-grid">
            {Object.entries(AI_META).map(([id, m]) => (
              <button
                key={id}
                className={`provider${provider === id ? ' is-on' : ''}`}
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
            <input className="input" data-role="aiModel" value={model} placeholder={meta.model} onChange={(e) => setModel(e.target.value)} />
          </label>
          {provider === 'openai-compatible' ? (
            <label className="field">
              <span>Base URL</span>
              <input className="input" data-role="aiBase" value={baseUrl} placeholder="https://openrouter.ai/api/v1" onChange={(e) => setBaseUrl(e.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span>API key</span>
            <input className="input" type="password" data-role="aiKey" value={key} placeholder="sk-…" autoComplete="off" onChange={(e) => setKey(e.target.value)} />
          </label>
          <p className="note">
            {provider === 'openai-compatible'
              ? 'Works with OpenRouter, Ollama, LM Studio and any OpenAI-compatible endpoint.'
              : 'Your key is stored only in this browser’s local storage.'}
          </p>
          <div className="row end" style={{ marginTop: 14 }}>
            <button className="secondary" data-act="closeOverlay" onClick={closeOverlays}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                if (!key.trim()) return toast('Paste an API key first');
                saveAIKey(provider, key.trim(), model.trim() || meta.model, baseUrl.trim());
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
            Paste a Mermaid flowchart. Node shapes, labels, dashed links and subgraphs are converted to JojoPen's diagram language.
          </p>
          <textarea
            className="input codearea"
            id="mermaidInput"
            data-role="mermaid"
            spellCheck={false}
            aria-label="Mermaid source"
            style={{ minHeight: 230 }}
            value={S.mermaidText || ''}
            onChange={(e) => {
              S.mermaidText = e.target.value;
              notify();
            }}
          />
          {S.mermaidError ? <div className="diag error">{S.mermaidError}</div> : null}
          <p className="note">
            Supported: <code>flowchart LR|RL|TD|TB</code>, <code>A[Box]</code>, <code>A(Round)</code>, <code>A((Circle))</code>,{' '}
            <code>A{'{Decision}'}</code>, <code>A[(Database)]</code>, <code>--&gt;</code>, <code>-.&gt;</code>, <code>---</code>,{' '}
            <code>|labels|</code> and <code>subgraph</code>.
          </p>
          <div className="row end" style={{ marginTop: 14 }}>
            <button className="secondary" data-act="closeOverlay" onClick={closeOverlays}>
              Cancel
            </button>
            <button className="primary" data-act="mermaidConvert" onClick={mermaidConvert}>
              <Icon name="check" size={15} /> Convert to diagram
            </button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}

function IconSearch() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const list = filteredIcons();
  const cur = Math.max(0, Math.min(S.iconCursor || 0, list.length - 1));
  return (
    <Scrim align="10vh">
      <div className="iconsearch" role="dialog" aria-label="Insert icon">
        <div className="iconsearch-field">
          <Icon name="search" size={17} />
          <input
            ref={ref}
            id="iconSearchInput"
            placeholder="Search icons — server, database, cache, user…"
            value={S.iconQuery || ''}
            onChange={(e) => {
              S.iconQuery = e.target.value;
              S.iconCursor = 0;
              notify();
            }}
          />
        </div>
        <div className="iconsearch-grid" id="iconGrid">
          {list.length ? (
            list.map((k, i) => (
              <button key={k} className={`iconsearch-glyph${i === cur ? ' is-cursor' : ''}`} title={k} onClick={() => insertIcon(k)}>
                <Icon name={k} size={22} />
                <small>{k}</small>
              </button>
            ))
          ) : (
            <div className="iconsearch-empty">No icons match “{S.iconQuery || ''}”.</div>
          )}
        </div>
        <div className="iconsearch-foot">
          <span>Click to insert as a shape</span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </Scrim>
  );
}

function BoardSettings() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <Scrim>
      <div className="modal" style={{ width: 'min(420px,100%)' }} role="dialog" aria-label="Board settings">
        <header>
          <h2>Board settings</h2>
          <button className="iconbtn" onClick={closeOverlays}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">
          <label className="field">
            <span>Board name</span>
            <input ref={ref} className="input" id="renameInput" defaultValue={S.doc.name} />
          </label>
          <label className="field">
            <span>Board link</span>
            <div className="row">
              <input className="input" style={{ flex: 1 }} readOnly value={location.origin + location.pathname + '#/b/' + S.doc.id} />
              <button
                className="secondary"
                onClick={() => navigator.clipboard?.writeText(location.origin + location.pathname + '#/b/' + S.doc.id).then(() => toast('Board link copied')).catch(() => toast('Copy failed'))}
              >
                <Icon name="link" size={14} /> Copy
              </button>
            </div>
          </label>
          <div className="row end" style={{ marginTop: 16 }}>
            <button className="secondary" data-act="closeOverlay" onClick={closeOverlays}>
              Cancel
            </button>
            <button className="primary" data-act="saveRename" onClick={() => saveRename(ref.current?.value || '')}>
              Save
            </button>
          </div>
        </div>
      </div>
    </Scrim>
  );
}
