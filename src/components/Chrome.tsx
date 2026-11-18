import { useEffect, useRef } from 'react';
import { TOOLBAR } from '../lib/templates';
import {
  S,
  colorFor,
  elements,
  fitAll,
  notify,
  paletteOn,
  persist,
  redo,
  resolvedTheme,
  roleOf,
  setZoom,
  settings,
  undo,
  zoomAt,
} from '../state/store';
import {
  applyColor,
  autoColor,
  bumpText,
  cleanIt,
  closeOverlays,
  copyBoardLink,
  deleteSelection,
  duplicateSelection,
  openConnect,
  openExport,
  openMenu,
  openRename,
  openShortcuts,
  orderSelection,
  randomColors,
  setPanel,
  setRoute,
  setShape,
  setTool,
  toggleBw,
  toggleFont,
  toggleGrid,
  toggleLock,
  toggleSnap,
  toggleTheme,
  applyTemplate,
} from '../state/actions';
import { sotDelete, sotFmtMs, sotOpenReplay, sotRecList, sotStart, sotStepWord, sotToggle } from '../state/sot';
import { Icon } from './Icon';

const KEY_HINT: Record<string, string> = {
  select: 'V', hand: 'H', rectangle: 'R', ellipse: 'O', diamond: 'D', cylinder: 'C',
  arrow: 'A', line: 'L', text: 'T', pen: 'P', sticky: 'S', image: 'I',
  frame: 'F', eraser: 'E', laser: 'K',
};

/* The live main menu: a 230 px popover anchored at 16,66 below the hamburger.
   It closes on outside click and on the trigger; Escape is kept as an extra. */
function MainMenu() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (ref.current && ref.current.contains(target)) return;
      if (target.closest('[data-act="menu"]')) return;
      closeOverlays();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      const active = document.activeElement;
      if (!active || active === document.body || !document.body.contains(active)) {
        (document.querySelector('[data-act="menu"]') as HTMLElement | null)?.focus();
      }
    };
  }, []);

  const open = (run: () => void) => () => {
    closeOverlays();
    run();
  };
  const external = (path: string) => () => {
    closeOverlays();
    window.open(`https://jojopen.com/${path}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mainmenu" ref={ref} role="menu" aria-label="Main menu">
      <button role="menuitem" type="button" onClick={open(() => setPanel('boards'))}>My boards</button>
      <button role="menuitem" type="button" onClick={open(() => setPanel('none'))}>Scratch board</button>
      <button role="menuitem" type="button" onClick={open(openConnect)}>Connect AI</button>
      <span className="menu-sep" />
      <button role="menuitem" type="button" onClick={open(openShortcuts)}>
        Keyboard shortcuts <span className="menu-hint">?</span>
      </button>
      <button role="menuitem" type="button" onClick={open(openConnect)}>Connect your AI app (guide)</button>
      <span className="menu-sep" />
      <button role="menuitem" type="button" className="menu-signin" onClick={open(copyBoardLink)}>
        <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Sign in
      </button>
      <span className="menu-sep" />
      <div className="menu-row">
        <button role="menuitem" type="button" onClick={external('privacy')}>Privacy</button>
        <button role="menuitem" type="button" onClick={external('terms')}>Terms</button>
      </div>
    </div>
  );
}

export function TopBar() {
  if (S.zen) return null;
  return (
    <>
      <div className="topleft">
        <button className="iconbtn" data-act="menu" onClick={openMenu} title="Main menu" aria-label="Main menu" aria-expanded={!!S.help}>
          <Icon name="menu" size={18} />
        </button>
        {S.help ? <MainMenu /> : null}
        <div className="pill">
          <span className="brand">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none">
              <g transform="rotate(35 10 10)">
                <path d="M10 1.8 14.6 8.4 12.4 15H7.6L5.4 8.4Z" fill="currentColor" />
                <path d="M10 8.6V14.8" stroke="var(--chrome,#191919)" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="10" cy="8.4" r="1.25" fill="var(--chrome,#191919)" />
              </g>
            </svg>
            JojoPen
          </span>
          <span className="divider" />
          <button className="boardname boardname-btn" id="boardName" data-act="rename" onClick={openRename} title="Rename or change link">
            {S.doc.name || 'Untitled board'}
          </button>
          <span className="saved" id="saved">
            <span className="dot-ok" /> Saved on this device
          </span>
        </div>
      </div>

      <div className="topright collapsible">
        <div className="viewgroup">
          <div className="seg" role="group" aria-label="Board style">
            {(['sketch', 'clean', 'chalkboard'] as const).map((style) => (
              <button
                key={style}
                className={settings().style === style ? `is-on${style !== 'clean' ? ' is-hand' : ''}` : `more${style !== 'clean' ? ' is-hand' : ''}`}
                data-act="style"
                data-style={style}
                onClick={() => {
                  settings().style = style;
                  S.startOpen = true;
                  persist();
                  notify();
                }}
              >
                {style === 'sketch' ? 'Sketch' : style === 'clean' ? 'Clean' : 'Chalkboard'}
              </button>
            ))}
          </div>
          <span className="vsep more" />
          <button className="iconbtn more" data-act="font" onClick={toggleFont} title="Font: Excalifont" aria-label="Board font">
            <span style={{ fontFamily: 'var(--hand)', fontSize: 17, lineHeight: 1 }}>Aa</span>
          </button>
          <button className={`bwtoggle more${paletteOn() ? '' : ' is-active'}`} id="bwBtn" data-act="bw" onClick={toggleBw} title="Black & white — turn every color off" aria-label="Black and white">
            <Icon name="contrast" size={16} /> B/W
          </button>
          <button className="iconbtn more" id="themeBtn" data-act="theme" onClick={toggleTheme} title={`Theme: ${S.themePref}`} aria-label="Switch theme">
            <Icon name={resolvedTheme() === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>
        <button className="primary" data-act="export" onClick={openExport}>
          <Icon name="download" size={15} sw={1.9} /> Export
        </button>
        <button className="chipbtn signin" data-act="share" onClick={copyBoardLink}>
          <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Sign in
        </button>
      </div>
    </>
  );
}

export function Toolbar() {
  if (S.zen) return null;
  return (
    <div className="toolbar collapsible" id="toolbar" role="toolbar" aria-label="Tools">
      {TOOLBAR.map((t, i) =>
        t === 'sep' ? (
          <span className="sep more" key={'sep' + i} />
        ) : (
          <button
            key={t.tool}
            className={`iconbtn${i > 0 ? ' more' : ''}${S.tool === t.tool ? ' is-active' : ''}`}
            data-act="tool"
            data-tool={t.tool}
            title={`${t.label}${KEY_HINT[t.tool] ? ` (${KEY_HINT[t.tool]})` : ''}`}
            aria-label={t.label}
            aria-pressed={S.tool === t.tool}
            onClick={() => setTool(t.tool)}
          >
            <Icon name={t.icon} size={18} />
            {KEY_HINT[t.tool] ? <span className="keyhint" aria-hidden="true">{KEY_HINT[t.tool]}</span> : null}
          </button>
        ),
      )}
      <span className="peekhint" aria-hidden="true" />
    </div>
  );
}

export function Rail() {
  if (S.zen) return null;
  const recs = (S.doc.recordings || []).length;
  const items = [
    { act: 'assistant', text: 'AI', icon: null, label: 'AI assistant', active: S.panel === 'assistant' },
    {
      act: 'sot',
      icon: 'hourglass',
      red: !!S.rec,
      count: recs,
      label: S.rec
        ? `Stop recording (${S.rec.steps} step${S.rec.steps === 1 ? '' : 's'} so far)`
        : recs
          ? `Sands of Time — ${recs} recording${recs === 1 ? '' : 's'}`
          : 'Sands of Time — record what you draw',
      active: !!S.sot.replay,
    },
    { act: 'slides', icon: 'slides', label: 'Slides', active: S.panel === 'slides' },
    { act: 'boards', icon: 'docshape', label: 'My boards', active: S.panel === 'boards' },
    { act: 'code', icon: 'code', label: 'Diagram code', active: S.panel === 'code' },
    { act: 'shortcuts', icon: 'help', label: 'Keyboard shortcuts' },
  ] as any[];

  return (
    <div className="rail collapsible" id="rail" style={{ right: S.panel === 'none' ? 16 : 416 }}>
      {items.map((i) => (
        <button
          key={i.act}
          data-act={i.act}
          className={`iconbtn${i.active ? ' is-active' : ''}${i.act === 'code' || i.act === 'shortcuts' ? ' more' : ''}${i.red ? ' is-rec' : ''}${i.count && !S.rec ? ' has-saved' : ''}`}
          title={i.label}
          aria-label={i.label}
          aria-pressed={!!(i.active || (i.act === 'sot' && S.rec))}
          onClick={() => {
            if (i.act === 'sot') return sotToggle();
            if (i.act === 'shortcuts') return openShortcuts();
            setPanel(i.act);
          }}
        >
          {i.text ? <span className="aibtn">{i.text}</span> : <Icon name={i.icon} size={18} />}
          {i.count && !S.rec ? <span className="railcount">{i.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

type BottomItem = {
  id: string;
  group: 0 | 1;
  kind: 'icon' | 'text' | 'zoom' | 'sep';
  icon?: string;
  label?: string;
  title: string;
  act?: string;
  run?: () => void;
  active?: boolean;
  disabled?: boolean;
};

/* Live order at 1440x900: zoom out, zoom label, zoom in, Fit, Snap, Dots,
   Random colors, then Undo/Redo in a second group. The zoom label is the only
   control that stays visible while the cluster is collapsed. */
function bottomItems(): BottomItem[] {
  return [
    { id: 'zoomout', group: 0, kind: 'icon', icon: 'minus', title: 'Zoom out (Ctrl+-)', act: 'zoomout', run: () => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.2) },
    { id: 'zoomlabel', group: 0, kind: 'zoom', title: 'Zoom to 100% (Shift+0)', act: 'zoomreset', run: () => setZoom(1) },
    { id: 'zoomin', group: 0, kind: 'icon', icon: 'plus', title: 'Zoom in (Ctrl+=)', act: 'zoomin', run: () => zoomAt(innerWidth / 2, innerHeight / 2, 1.2) },
    { id: 'sep-zoom', group: 0, kind: 'sep', title: '' },
    { id: 'fit', group: 0, kind: 'icon', icon: 'fit', title: 'Fit everything (Shift+1)', act: 'fit', run: fitAll },
    { id: 'sep-fit', group: 0, kind: 'sep', title: '' },
    { id: 'snap', group: 0, kind: 'text', icon: 'dots', label: 'Snap', title: "Snap to dots — hold Alt to place freely (Ctrl+')", act: 'snap', run: toggleSnap, active: !!settings().snapToGrid },
    { id: 'dots', group: 0, kind: 'text', label: 'Dots', title: "Show background dots (Ctrl+Shift+')", act: 'dots', run: toggleGrid, active: !!settings().showGrid },
    { id: 'random', group: 0, kind: 'text', label: 'Random colors', title: 'Random colors — every shape and arrow gets its own color', act: 'random', run: randomColors },
    { id: 'undo', group: 1, kind: 'icon', icon: 'backward', title: 'Undo (Ctrl+Z)', act: 'undo', run: undo, disabled: !S.history.length },
    { id: 'redo', group: 1, kind: 'icon', icon: 'forward', title: 'Redo (Ctrl+Shift+Z)', act: 'redo', run: redo, disabled: !S.future.length },
  ];
}

function BottomIcon({ item }: { item: BottomItem }) {
  if (item.id === 'random') {
    return (
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 3.5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM7.25 7.25h.01M12.75 7.25h.01M10 10h.01M7.25 12.75h.01M12.75 12.75h.01"/></svg>
    );
  }
  return item.icon ? <Icon name={item.icon} size={item.kind === 'text' ? 15 : 16} /> : null;
}

export function BottomBar() {
  if (S.zen) return null;
  const items = bottomItems();
  return (
    <div className="bottomleft collapsible">
      {([0, 1] as const).map((group) => (
        <div className={`group${group === 1 ? ' more' : ''}`} key={group}>
          {items
            .filter((i) => i.group === group)
            .map((item) => {
              if (item.kind === 'sep') return <span className="vsep more" key={item.id} />;
              if (item.kind === 'zoom') {
                return (
                  <button
                    key={item.id}
                    className="zoomlabel"
                    id="zoomLabel"
                    data-act={item.act}
                    type="button"
                    onClick={item.run}
                    title={item.title}
                  >
                    {Math.round(S.camera.zoom * 100)}%
                  </button>
                );
              }
              const cls =
                item.kind === 'text'
                  ? `textbtn more${item.active ? ' is-active' : ''}`
                  : `iconbtn more`;
              return (
                <button
                  key={item.id}
                  className={cls}
                  id={item.id === 'undo' ? 'undoBtn' : item.id === 'redo' ? 'redoBtn' : item.id === 'snap' ? 'snapBtn' : item.id === 'dots' ? 'gridBtn' : undefined}
                  data-act={item.act}
                  type="button"
                  onClick={item.run}
                  title={item.title}
                  aria-pressed={item.kind === 'text' ? item.active : undefined}
                  disabled={item.disabled}
                >
                  <BottomIcon item={item} />
                  {item.label ? <span>{item.label}</span> : null}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export function ContextBar() {
  const list = selectionElementsSafe();
  if (!list.length) return null;
  const el = list[0];
  const c = colorFor(el);
  const locked = list.every((e) => e.locked);
  const shapeBtns: [string, string, string][] = [
    ['rectangle', 'rectangle', 'Box'],
    ['ellipse', 'ellipse', 'Ellipse'],
    ['diamond', 'diamond', 'Diamond (decision)'],
    ['cylinder', 'cylinder', 'Cylinder (data)'],
    ['person', 'user', 'Pill (person / actor)'],
    ['document', 'note', 'Document'],
  ];
  const layer = (kind: string) => {
    S.layerPop = false;
    orderSelection(kind);
    notify();
  };
  return (
    <div className="contextbar" id="contextbar">
      {list.length > 1 ? <span className="count">{list.length} selected</span> : null}
      {paletteOn() ? (
        <button className="chip" onClick={autoColor} title="Color picked automatically from the name">
          <span className="swatch" style={{ background: c.fill === 'transparent' ? '#fff' : c.fill, borderColor: c.stroke }} />
          <span>{el.colorLocked ? 'Fixed' : 'Auto'}</span>
          <span className="muted">· {roleOf(el)}</span>
        </button>
      ) : null}
      <label
        className="colordot"
        title="Color"
        aria-label="Color"
        style={{ background: c.fill === 'transparent' ? '#fff' : c.fill, borderColor: c.stroke }}
      >
        <input type="color" value={toHex(c.stroke)} onChange={(e) => applyColor(e.target.value)} aria-label="Color" />
      </label>
      {list.some((e) => e.type === 'shape') ? (
        <>
          <span className="vsep more" />
          {shapeBtns.map(([shape, icon, title]) => (
            <button key={shape} className="iconbtn" onClick={() => setShape(shape)} title={title} aria-label={title} style={{ width: 30, height: 30 }}>
              <Icon name={icon} size={15} />
            </button>
          ))}
        </>
      ) : null}
      {list.some((e) => e.type === 'arrow') ? (
        <>
          {['orthogonal', 'curved', 'straight'].map((r) => (
            <button key={r} className="iconbtn" onClick={() => setRoute(r)} title={`${r} route`} style={{ width: 30, height: 30 }}>
              <Icon name={r === 'orthogonal' ? 'route' : r === 'curved' ? 'curve' : 'straight'} size={15} />
            </button>
          ))}
        </>
      ) : null}
      <span className="vsep more" />
      <button className="iconbtn" onClick={() => bumpText(-2)} title={`Smaller text (now ${el.fontSize ?? 18}px)`} aria-label="Smaller text">
        <Icon name="minus" size={14} />
      </button>
      <button className="iconbtn" onClick={() => bumpText(2)} title={`Bigger text (now ${el.fontSize ?? 18}px)`} aria-label="Bigger text">
        <Icon name="plus" size={14} />
      </button>
      <button className="chip sizelabel" title="Size of this item only">Size 1×</button>
      <span className="vsep more" />
      <span className="layerwrap">
        <button className="iconbtn" onClick={() => { S.layerPop = !S.layerPop; notify(); }} title="Layer order" aria-label="Layer order" aria-expanded={!!S.layerPop}>
          <Icon name="layers" size={15} />
        </button>
        {S.layerPop ? (
          <div className="layerpop" role="menu" aria-label="Layer order">
            <button type="button" onClick={() => layer('front')}>Bring to front</button>
            <button type="button" onClick={() => layer('forward')}>Bring forward</button>
            <button type="button" onClick={() => layer('backward')}>Send backward</button>
            <button type="button" onClick={() => layer('back')}>Send to back</button>
          </div>
        ) : null}
      </span>
      <button className="iconbtn" onClick={toggleLock} title={locked ? 'Unlock (Ctrl+Shift+L)' : 'Lock (Ctrl+Shift+L)'} aria-label={locked ? 'Unlock' : 'Lock'} style={{ background: locked ? 'var(--raised)' : undefined }}>
        <Icon name={locked ? 'lock' : 'unlock'} size={15} />
      </button>
      <button className="iconbtn" onClick={deleteSelection} title="Delete (Del)" aria-label="Delete">
        <Icon name="trash" size={15} />
      </button>
      <button className="cleanit" data-act="clean" onClick={cleanIt} title="Clean it — AI presentation layout (Ctrl+Shift+K)">
        <Icon name="spark" size={15} /> Clean it
      </button>
    </div>
  );
}

/** `<input type="color">` only accepts `#rrggbb`; paints may be rgb() or color-mix(). */
function toHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) return '#' + color.slice(1).split('').map((ch) => ch + ch).join('');
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('');
  return '#808080';
}

function selectionElementsSafe() {
  return [...S.selection].map((id) => S.doc.elements[id]).filter(Boolean) as any[];
}

export function StartCard() {
  const show = elements().length === 0 && S.panel === 'none' && !S.present && !S.replay && !S.zen && !S.startOpen;
  if (!show) return null;
  return (
    <div className="start" id="start">
      <div className="start-head">
        <strong>Start with</strong>
        <span className="muted">
          or just start drawing, or press <kbd>/</kbd> to drop an icon
        </span>
      </div>
      <div className="start-grid">
        <button className="start-card" onClick={() => applyTemplate('system')}>
          <span className="start-icon">
            <Icon name="cylinder" size={18} />
          </span>
          <span className="start-title">System design</span>
          <span className="start-blurb">Client → edge → services → data, like an interview whiteboard.</span>
        </button>
        <button className="start-card" onClick={() => applyTemplate('flow')}>
          <span className="start-icon">
            <Icon name="diamond" size={18} />
          </span>
          <span className="start-title">Flowchart</span>
          <span className="start-blurb">Steps and decisions, top to bottom.</span>
        </button>
        <button className="start-card" onClick={() => applyTemplate('deck')}>
          <span className="start-icon">
            <Icon name="slides" size={18} />
          </span>
          <span className="start-title">Slide deck</span>
          <span className="start-blurb">Title, agenda and a diagram slide to present from.</span>
        </button>
      </div>
      <button
        className="start-blank"
        onClick={() => {
          S.startOpen = true;
          notify();
        }}
      >
        Blank canvas
      </button>
    </div>
  );
}

export function Toast() {
  if (!S.toast) return null;
  return <div className="toast">{S.toast}</div>;
}

export function SotCard() {
  if (!S.sot.listOpen || S.rec || S.sot.replay) return null;
  const list = [...sotRecList()].reverse();
  return (
    <div id="sotRoot">
      <div className="sotcard" role="dialog" aria-label="Sands of Time">
        <div className="sotcard-head">
          <span className="sotcard-title">
            <Icon name="hourglass" size={13} /> Sands of Time
          </span>
          {list.length ? <span className="sotcard-count">{list.length}</span> : null}
          <button className="sotghost" onClick={() => { S.sot.listOpen = false; notify(); }} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>
        {list.length ? (
          <ul className="sotlist">
            {list.map((r) => (
              <li className="sotrow" key={r.id}>
                <button className="sotrow-main" onClick={() => sotOpenReplay(r.id)} title={`Replay ${r.name}`}>
                  <span className="sotrow-play" aria-hidden="true">
                    <Icon name="play" size={12} />
                  </span>
                  <span className="sotrow-name">{r.name}</span>
                  <span className="sotrow-meta">
                    {sotStepWord(r.steps.length)} · {sotFmtMs(r.duration)}
                  </span>
                </button>
                <button className="sotrow-del" onClick={() => sotDelete(r.id)} aria-label={`Delete ${r.name}`} title={`Delete ${r.name}`}>
                  <Icon name="trash" size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sotempty">Record what you draw, then rewind and watch it come back.</p>
        )}
        <button className="sotnew" onClick={sotStart}>
          <span className="recdot" /> Record new
        </button>
      </div>
    </div>
  );
}
