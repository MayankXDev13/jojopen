import { useEffect, useRef } from "react";
import { TOOLBAR } from "../lib/templates";
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
  roleColor,
  roleOf,
  setZoom,
  settings,
  undo,
  zoomAt,
} from "../state/store";
import { COLOR_TO_ROLE } from "../lib/palette";
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
  scaleSelection,
  setPanel,
  setRoute,
  rerouteSelection,
  setShape,
  setTool,
  textSizeLabel,
  toggleBw,
  toggleDash,
  toggleFont,
  toggleGrid,
  toggleLock,
  toggleNoFill,
  toggleSnap,
  toggleTheme,
  applyTemplate,
  COLOR_KEYS,
} from "../state/actions";
import {
  sotDelete,
  sotFmtMs,
  sotOpenReplay,
  sotRecList,
  sotStart,
  sotStepWord,
  sotToggle,
} from "../state/sot";
import { Icon } from "./Icon";
import { useVersion } from "../state/boardStore";

const KEY_HINT: Record<string, string> = {
  select: "V",
  hand: "H",
  rectangle: "R",
  ellipse: "O",
  diamond: "D",
  cylinder: "C",
  arrow: "A",
  line: "L",
  text: "T",
  pen: "P",
  sticky: "S",
  image: "I",
  frame: "F",
  eraser: "E",
  laser: "K",
};

/* The live main menu: a 230 px popover anchored at 16,66 below the hamburger.
   It closes on outside click and on the trigger; Escape is kept as an extra. */
function MainMenu() {
  useVersion();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (ref.current && ref.current.contains(target)) return;
      if (target.closest('[data-act="menu"]')) return;
      closeOverlays();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      const active = document.activeElement;
      if (
        !active ||
        active === document.body ||
        !document.body.contains(active)
      ) {
        (
          document.querySelector('[data-act="menu"]') as HTMLElement | null
        )?.focus();
      }
    };
  }, []);

  const open = (run: () => void) => () => {
    closeOverlays();
    run();
  };
  const external = (path: string) => () => {
    closeOverlays();
    window.open(`https://jojopen.com/${path}`, "_blank", "noopener,noreferrer");
  };
  const docs = (path: string) => () => {
    closeOverlays();
    window.open(`/${path}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mainmenu" ref={ref} role="menu" aria-label="Main menu">
      <button
        role="menuitem"
        type="button"
        onClick={open(() => setPanel("boards"))}
      >
        My boards
      </button>
      <button
        role="menuitem"
        type="button"
        onClick={open(() => setPanel("none"))}
      >
        Scratch board
      </button>
      <button role="menuitem" type="button" onClick={open(openConnect)}>
        Connect AI
      </button>
      <span className="menu-sep" />
      <button role="menuitem" type="button" onClick={open(openShortcuts)}>
        Keyboard shortcuts <span className="menu-hint">?</span>
      </button>
      <button role="menuitem" type="button" onClick={docs("docs/mcp/")}>
        Connect your AI app (guide)
      </button>
      <span className="menu-sep" />
      <button
        role="menuitem"
        type="button"
        className="menu-signin"
        onClick={open(copyBoardLink)}
      >
        <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
          />
        </svg>
        Sign in
      </button>
      <span className="menu-sep" />
      <div className="menu-row">
        <button role="menuitem" type="button" onClick={docs("privacy/")}>
          Privacy
        </button>
        <button role="menuitem" type="button" onClick={docs("terms/")}>
          Terms
        </button>
      </div>
    </div>
  );
}

export function TopBar() {
  useVersion();
  if (S.zen) return null;
  return (
    <>
      <div className="topleft">
        <button
          className="iconbtn"
          data-act="menu"
          onClick={openMenu}
          title="Main menu"
          aria-label="Main menu"
          aria-expanded={!!S.help}
        >
          <Icon name="menu" size={18} />
        </button>
        {S.help ? <MainMenu /> : null}
        <div className="pill">
          <span className="brand">
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
            >
              <g transform="rotate(35 10 10)">
                <path
                  d="M10 1.8 14.6 8.4 12.4 15H7.6L5.4 8.4Z"
                  fill="currentColor"
                />
                <path
                  d="M10 8.6V14.8"
                  stroke="var(--chrome,#191919)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <circle
                  cx="10"
                  cy="8.4"
                  r="1.25"
                  fill="var(--chrome,#191919)"
                />
              </g>
            </svg>
            JojoPen
          </span>
          <span className="divider" />
          <button
            className="boardname boardname-btn"
            id="boardName"
            data-act="rename"
            onClick={openRename}
            title="Rename or change link"
          >
            <span>{S.doc.name || "Untitled board"}</span>
            <Icon name="pencil" size={12} />
          </button>
          <span className="saved" id="saved">
            <span className="dot-ok" /> Saved to your boards
          </span>
        </div>
      </div>

      <div className="topright collapsible">
        <div className="viewgroup">
          <div className="seg" role="group" aria-label="Board style">
            {(["sketch", "clean", "chalkboard"] as const).map((style) => (
              <button
                key={style}
                className={
                  settings().style === style
                    ? `is-on${style !== "clean" ? " is-hand" : ""}`
                    : `more${style !== "clean" ? " is-hand" : ""}`
                }
                data-act="style"
                data-style={style}
                onClick={() => {
                  settings().style = style;
                  S.startOpen = true;
                  persist();
                  notify();
                }}
              >
                {style === "sketch"
                  ? "Sketch"
                  : style === "clean"
                    ? "Clean"
                    : "Chalkboard"}
              </button>
            ))}
          </div>
          <span className="vsep more" />
          <button
            className="iconbtn more"
            data-act="font"
            onClick={toggleFont}
            title="Font: Excalifont"
            aria-label="Board font"
          >
            <span
              style={{ fontFamily: "var(--hand)", fontSize: 17, lineHeight: 1 }}
            >
              Aa
            </span>
          </button>
          <button
            className={`bwtoggle more${paletteOn() ? "" : " is-active"}`}
            id="bwBtn"
            data-act="bw"
            onClick={toggleBw}
            title="Black & white — turn every color off"
            aria-label="Black and white"
          >
            <Icon name="contrast" size={16} /> B/W
          </button>
          <button
            className="iconbtn more"
            id="themeBtn"
            data-act="theme"
            onClick={toggleTheme}
            title={`Theme: ${S.themePref}`}
            aria-label="Switch theme"
          >
            <Icon
              name={resolvedTheme() === "dark" ? "sun" : "moon"}
              size={17}
            />
          </button>
        </div>
        <button className="primary" data-act="export" onClick={openExport}>
          <Icon name="download" size={15} sw={1.9} /> Export
        </button>
        <button
          className="chipbtn signin"
          data-act="share"
          onClick={copyBoardLink}
        >
          <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
            />
          </svg>{" "}
          Sign in
        </button>
      </div>
    </>
  );
}

export function Toolbar() {
  useVersion();
  if (S.zen) return null;
  const activeTool = TOOLBAR.some((t) => t !== "sep" && t.tool === S.tool)
    ? S.tool
    : "select";
  return (
    <div
      className="toolbar collapsible"
      id="toolbar"
      role="toolbar"
      aria-label="Tools"
    >
      {TOOLBAR.map((t, i) =>
        t === "sep" ? (
          <span className="sep more" key={"sep" + i} />
        ) : (
          <button
            key={t.tool}
            className={`iconbtn${t.tool !== activeTool ? " more" : ""}${activeTool === t.tool ? " is-active" : ""}`}
            data-act="tool"
            data-tool={t.tool}
            title={`${t.label}${KEY_HINT[t.tool] ? ` (${KEY_HINT[t.tool]})` : ""}`}
            aria-label={t.label}
            aria-pressed={activeTool === t.tool}
            onClick={() => setTool(t.tool)}
          >
            <Icon name={t.icon} size={18} />
            {KEY_HINT[t.tool] ? (
              <span className="keyhint" aria-hidden="true">
                {KEY_HINT[t.tool]}
              </span>
            ) : null}
          </button>
        ),
      )}
      <span className="peekhint" aria-hidden="true" />
    </div>
  );
}

export function Rail() {
  useVersion();
  if (S.zen) return null;
  const recs = (S.doc.recordings || []).length;
  const items = [
    {
      act: "assistant",
      text: "AI",
      icon: null,
      label: "AI assistant",
      title: "AI assistant (Ctrl+I)",
      active: S.panel === "assistant",
      className: "cp-aibtn",
    },
    {
      act: "sot",
      icon: "hourglass",
      count: recs,
      label: S.rec
        ? `Stop recording (${S.rec.steps} step${S.rec.steps === 1 ? "" : "s"} so far)`
        : recs
          ? `Sands of Time — ${recs} recording${recs === 1 ? "" : "s"}`
          : "Sands of Time — record what you draw",
      title: S.rec
        ? `Stop recording (${S.rec.steps} step${S.rec.steps === 1 ? "" : "s"} so far)`
        : recs
          ? `Sands of Time — ${recs} recording${recs === 1 ? "" : "s"}`
          : "Sands of Time — record what you draw",
      active: !!S.sot.replay,
      className: `sotbtn cp-sotbtn ${S.rec ? "is-recording is-rec" : "is-off"}${recs && !S.rec ? " has-saved" : ""}`,
    },
    {
      act: "slides",
      icon: "slides",
      label: "Slides",
      title: "Slides (Ctrl+Shift+S)",
      active: S.panel === "slides",
    },
    {
      act: "boards",
      icon: "boards",
      label: "My boards",
      title: "My boards",
      active: S.panel === "boards",
    },
    {
      act: "code",
      icon: "code",
      label: "Diagram code",
      title: "Diagram code (Ctrl+E)",
      active: S.panel === "code",
      more: true,
    },
    {
      act: "shortcuts",
      icon: "help",
      label: "Keyboard shortcuts",
      title: "Keyboard shortcuts (?)",
      more: true,
    },
  ];

  return (
    <div
      className="rail cp-rail cp-panel collapsible cp-collapsible"
      id="rail"
      style={{ right: S.panel === "none" ? 16 : 416 }}
    >
      {items.map((i) => (
        <button
          key={i.act}
          data-act={i.act}
          className={`iconbtn cp-iconbtn${i.active ? " is-active" : ""}${i.more ? " more cp-more" : ""}${i.className ? " " + i.className : ""}`}
          title={i.title || i.label}
          aria-label={i.label}
          aria-pressed={!!(i.active || (i.act === "sot" && S.rec))}
          onClick={() => {
            if (i.act === "sot") return sotToggle();
            if (i.act === "shortcuts") return openShortcuts();
            setPanel(i.act);
          }}
        >
          {i.text ? (
            i.text
          ) : (
            <Icon name={i.icon!} size={18} />
          )}
          {i.count && !S.rec ? (
            <span className="sotbadge railcount cp-sotbadge" aria-hidden="true">
              {i.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

type BottomItem = {
  id: string;
  group: 0 | 1;
  kind: "icon" | "text" | "zoom" | "sep";
  icon?: string;
  label?: string;
  title: string;
  act?: string;
  run?: () => void;
  active?: boolean;
  disabled?: boolean;
};

/* Live order at 1440x900: zoom out, zoom label, zoom in, Fit, Snap, Dots,
   Random colors, then Undo/Redo in a second group. Zooming stays on the
   "-" / "+" buttons; the label just resets to 100%. */

function bottomItems(): BottomItem[] {
  return [
    {
      id: "zoomout",
      group: 0,
      kind: "icon",
      icon: "minus",
      title: "Zoom out (Ctrl+-)",
      act: "zoomout",
      run: () => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.2),
    },
    {
      id: "zoomlabel",
      group: 0,
      kind: "zoom",
      title: "Zoom to 100% (Shift+0)",
      act: "zoomreset",
      run: () => setZoom(1),
    },
    {
      id: "zoomin",
      group: 0,
      kind: "icon",
      icon: "plus",
      title: "Zoom in (Ctrl+=)",
      act: "zoomin",
      run: () => zoomAt(innerWidth / 2, innerHeight / 2, 1.2),
    },
    { id: "sep-zoom", group: 0, kind: "sep", title: "" },
    {
      id: "fit",
      group: 0,
      kind: "icon",
      icon: "fit",
      title: "Fit everything (Shift+1)",
      act: "fit",
      run: fitAll,
    },
    { id: "sep-fit", group: 0, kind: "sep", title: "" },
    {
      id: "snap",
      group: 0,
      kind: "text",
      icon: "dots",
      label: "Snap",
      title: "Snap to dots — hold Alt to place freely (Ctrl+')",
      act: "snap",
      run: toggleSnap,
      active: !!settings().snapToGrid,
    },
    {
      id: "dots",
      group: 0,
      kind: "text",
      label: "Dots",
      title: "Show background dots (Ctrl+Shift+')",
      act: "dots",
      run: toggleGrid,
      active: !!settings().showGrid,
    },
    {
      id: "random",
      group: 0,
      kind: "text",
      label: "Random colors",
      title: "Random colors — every shape and arrow gets its own color",
      act: "random",
      run: randomColors,
      active: (settings().palette ?? "roles") === "random",
    },
    {
      id: "undo",
      group: 1,
      kind: "icon",
      icon: "undo",
      title: "Undo (Ctrl+Z)",
      act: "undo",
      run: undo,
      disabled: !S.history.length,
    },
    {
      id: "redo",
      group: 1,
      kind: "icon",
      icon: "redo",
      title: "Redo (Ctrl+Shift+Z)",
      act: "redo",
      run: redo,
      disabled: !S.future.length,
    },
  ];
}

function BottomIcon({ item }: { item: BottomItem }) {
  useVersion();
  if (item.id === "random") {
    return (
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5.5 3.5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM7.25 7.25h.01M12.75 7.25h.01M10 10h.01M7.25 12.75h.01M12.75 12.75h.01" />
      </svg>
    );
  }
  return item.icon ? (
    <Icon name={item.icon} size={item.kind === "text" ? 15 : 16} />
  ) : null;
}

export function BottomBar() {
  useVersion();
  if (S.zen) return null;
  const items = bottomItems();
  const curZoom = S.camera.zoom;
  return (
    <div className="bottomleft collapsible">
      {([0, 1] as const).map((group) => (
        <div className={`group${group === 1 ? " more" : ""}`} key={group}>
          {items
            .filter((i) => i.group === group)
            .map((item) => {
              if (item.kind === "sep")
                return <span className="vsep more" key={item.id} />;
              if (item.kind === "zoom") {
                return (
                  <span
                    className="zoomwrap"
                    key={item.id}
                    style={{ position: "relative" }}
                  >
                    <button
                      className="zoomlabel"
                      id="zoomLabel"
                      data-act={item.act}
                      type="button"
                      onClick={item.run}
                      title={item.title}
                    >
                      {Math.round(curZoom * 100)}%
                    </button>
                  </span>
                );
              }
              const cls =
                item.kind === "text"
                  ? `textbtn more${item.active ? " is-active" : ""}`
                  : `iconbtn more`;
              return (
                <button
                  key={item.id}
                  className={cls}
                  id={
                    item.id === "undo"
                      ? "undoBtn"
                      : item.id === "redo"
                        ? "redoBtn"
                        : item.id === "snap"
                          ? "snapBtn"
                          : item.id === "dots"
                            ? "gridBtn"
                            : undefined
                  }
                  data-act={item.act}
                  type="button"
                  onClick={item.run}
                  title={item.title}
                  aria-pressed={item.kind === "text" ? item.active : undefined}
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

const ROLE_LABELS: Record<string, string> = {
  actor: "Actor",
  network: "Edge",
  compute: "Service",
  data: "Data",
  cache: "Cache",
  messaging: "Queue",
  storage: "Storage",
  security: "Auth",
  analytics: "Analytics",
  observability: "Logs",
  neutral: "Neutral",
  custom: "Custom",
};

export function ContextBar() {
  useVersion();
  const list = selectionElementsSafe();
  if (!list.length) return null;
  const el = list[0];
  const c = colorFor(el);
  const locked = list.every((e) => e.locked);
  const shapeBtns: [string, string, string][] = [
    ["rounded", "rectangle", "Box"],
    ["ellipse", "ellipse", "Ellipse"],
    ["diamond", "diamond", "Diamond (decision)"],
    ["cylinder", "cylinder", "Cylinder (data)"],
    ["person", "person", "Pill (person / actor)"],
    ["document", "docshape", "Document"],
  ];
  const layer = (kind: string) => {
    S.layerPop = false;
    orderSelection(kind);
    notify();
  };
  const role = roleOf(el);
  const roleName =
    ROLE_LABELS[role] ||
    (role ? role.charAt(0).toUpperCase() + role.slice(1) : "Neutral");

  const hasColor = list.some(
    (e) =>
      e.type === "shape" ||
      e.type === "container" ||
      (e.type === "image" && typeof (e as any).meta?.icon === "string"),
  );
  const hasShape = list.some((e) => e.type === "shape");
  const hasArrow = list.some((e) => e.type === "arrow");
  const hasText = list.some(
    (e) => e.type === "shape" || e.type === "sticky" || e.type === "text",
  );
  const hasScale = list.some(
    (e) =>
      e.type !== "slide" &&
      (e.type === "diagram" ||
        e.type === "shape" ||
        e.type === "text" ||
        (e.type === "image" && typeof (e as any).meta?.icon === "string")),
  );

  return (
    <div className="contextbar" id="contextbar">
      {list.length > 1 ? (
        <span className="count">{list.length} selected</span>
      ) : null}
      {hasColor ? (
        <>
          {(settings().palette ?? "roles") === "roles" ? (
            <button
              className="chip"
              onClick={autoColor}
              title={
                el.colorLocked
                  ? "Color locked — click to return to auto"
                  : "Color picked automatically from the name"
              }
            >
              <span
                className="swatch"
                style={{
                  background: c.fill === "transparent" ? "transparent" : c.fill,
                  borderColor: c.stroke,
                }}
              />
              <span>{el.colorLocked ? "Fixed" : "Auto"}</span>
              <span className="muted">· {roleName}</span>
            </button>
          ) : null}
          <span className="colorwrap">
            <button
              className={`colordot${S.colorPop ? " is-on" : ""}`}
              type="button"
              title="Color"
              aria-label="Color"
              aria-expanded={!!S.colorPop}
              onClick={() => {
                S.colorPop = !S.colorPop;
                notify();
              }}
            >
              <span
                className="swatch"
                style={{
                  background: c.fill === "transparent" ? "transparent" : c.fill,
                  borderColor: c.stroke,
                }}
              />
            </button>
            {S.colorPop ? (
              <span className="colorpop" role="menu" aria-label="Colors">
                <button
                  className={`palchip${!el.colorLocked ? " is-active" : ""}`}
                  type="button"
                  onClick={() => {
                    S.colorPop = false;
                    autoColor();
                  }}
                  title="Automatic color"
                  data-act="color-auto"
                >
                  Auto
                </button>
                {COLOR_KEYS.map((k) => {
                  const paint =
                    k === "ink"
                      ? roleColor("ink")
                      : roleColor(COLOR_TO_ROLE[k] || "neutral");
                  const active = !!el.colorLocked && el.color === k;
                  return (
                    <button
                      key={k}
                      className={`paldot${active ? " is-active" : ""}`}
                      type="button"
                      style={{ background: paint.stroke }}
                      onClick={() => {
                        S.colorPop = false;
                        applyColor(k);
                      }}
                      title={k}
                      aria-label={k}
                      aria-pressed={active}
                      data-act="color"
                      data-color={k}
                    />
                  );
                })}
                {list.some((e) => e.type === "shape" && !e.locked) ? (
                  <button
                    className={`paldot nofill${list.filter((e) => e.type === "shape").every((e) => e.noFill) ? " is-active" : ""}`}
                    type="button"
                    onClick={() => {
                      S.colorPop = false;
                      toggleNoFill();
                    }}
                    title="No fill — outline only, see through"
                    aria-label="No fill"
                    data-act="color-nofill"
                  />
                ) : null}
              </span>
            ) : null}
          </span>
        </>
      ) : null}
      {hasShape ? (
        <>
          {hasColor ? <span className="vsep more" /> : null}
          {shapeBtns.map(([shape, icon, title]) => (
            <button
              key={shape}
              className="iconbtn"
              onClick={() => setShape(shape)}
              title={title}
              aria-label={title}
              style={{ width: 30, height: 30 }}
            >
              <Icon name={icon} size={15} />
            </button>
          ))}
        </>
      ) : null}
      {hasArrow ? (
        <>
          {[
            ["orthogonal", "route", "Elbow route"],
            ["curved", "curve", "Curved route"],
            ["straight", "straight", "Straight route"],
          ].map(([r, icon, title]) => {
            const active = list
              .filter((e) => e.type === "arrow")
              .every((e) => (e.routeMode || "orthogonal") === r);
            return (
              <button
                key={r}
                className={"iconbtn" + (active ? " is-active" : "")}
                onClick={() => setRoute(r)}
                title={title}
                aria-label={title}
                style={{ width: 30, height: 30 }}
              >
                <Icon name={icon} size={15} />
              </button>
            );
          })}
          <button
            className={
              "iconbtn" +
              (list
                .filter((e) => e.type === "arrow")
                .every((e) => (e as any).dash === "dashed")
                ? " is-active"
                : "")
            }
            onClick={toggleDash}
            title="Dashed (async)"
            aria-label="Dashed (async)"
            style={{ width: 30, height: 30 }}
          >
            <Icon name="dash" size={15} />
          </button>
          {list.some(
            (e) => e.type === "arrow" && (e as any).route === "manual",
          ) ? (
            <button
              className="iconbtn"
              onClick={() => rerouteSelection()}
              title="Forget the hand-made shape and route automatically"
              aria-label="Re-route"
              style={{ width: "auto", padding: "0 8px" }}
            >
              Re-route
            </button>
          ) : null}
        </>
      ) : null}
      {hasText || hasScale ? <span className="vsep more" /> : null}
      {hasText ? (
        <>
          <button
            className="iconbtn textsize"
            onClick={() => bumpText(-1)}
            title={`Smaller text (now ${textSizeLabel(el)})`}
            aria-label="Smaller text"
          >
            <span style={{ fontSize: 11 }}>A</span>
            <span className="textsize-sign">−</span>
          </button>
          <button
            className="iconbtn textsize"
            onClick={() => bumpText(1)}
            title={`Bigger text (now ${textSizeLabel(el)})`}
            aria-label="Bigger text"
          >
            <span style={{ fontSize: 15 }}>A</span>
            <span className="textsize-sign">+</span>
          </button>
        </>
      ) : null}
      {hasScale ? (
        <span className="layerwrap">
          <button
            className="textbtn"
            onClick={() => {
              S.sizePop = !S.sizePop;
              notify();
            }}
            title="Scale selection — 2x doubles the size"
            aria-label="Scale selection"
            aria-expanded={!!S.sizePop}
          >
            <span>Size {(el as any).scale ?? 1}x</span>
          </button>
          {S.sizePop ? (
            <div className="layerpop" role="menu" aria-label="Scale selection">
              {[0.75, 0.9, 1, 1.25, 1.5, 1.75, 2].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    S.sizePop = false;
                    scaleSelection(p);
                  }}
                  title={
                    p === 1 ? "Keep current size" : `Scale selection to ${p}x`
                  }
                >
                  <span>{p}x</span>
                </button>
              ))}
            </div>
          ) : null}
        </span>
      ) : null}
      <span className="vsep more" />
      <span className="layerwrap">
        <button
          className="iconbtn"
          onClick={() => {
            S.layerPop = !S.layerPop;
            notify();
          }}
          title="Layer order"
          aria-label="Layer order"
          aria-expanded={!!S.layerPop}
        >
          <Icon name="layers" size={15} />
        </button>
        {S.layerPop ? (
          <div className="layerpop" role="menu" aria-label="Layer order">
            <button type="button" onClick={() => layer("front")}>
              Bring to front
            </button>
            <button type="button" onClick={() => layer("forward")}>
              Bring forward
            </button>
            <button type="button" onClick={() => layer("backward")}>
              Send backward
            </button>
            <button type="button" onClick={() => layer("back")}>
              Send to back
            </button>
          </div>
        ) : null}
      </span>
      <button
        className="iconbtn"
        onClick={toggleLock}
        title={locked ? "Unlock (Ctrl+Shift+L)" : "Lock (Ctrl+Shift+L)"}
        aria-label={locked ? "Unlock" : "Lock"}
        style={{ background: locked ? "var(--raised)" : undefined }}
      >
        <Icon name={locked ? "lock" : "unlock"} size={15} />
      </button>
      <button
        className="iconbtn"
        onClick={deleteSelection}
        title="Delete (Del)"
        aria-label="Delete"
      >
        <Icon name="trash" size={15} />
      </button>
      <button
        className="cleanit"
        data-act="clean"
        onClick={cleanIt}
        title="Clean it — AI presentation layout (Ctrl+Shift+K)"
      >
        <Icon name="sparkles" size={15} /> Clean it
      </button>
    </div>
  );
}

function selectionElementsSafe() {
  return [...S.selection]
    .map((id) => S.doc.elements[id])
    .filter(Boolean) as any[];
}

export function StartCard() {
  useVersion();
  const show =
    elements().length === 0 &&
    (S.panel === "none" || S.panel === "boards") &&
    !S.present &&
    !S.replay &&
    !S.zen &&
    !S.startOpen;
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
        <button className="start-card" onClick={() => applyTemplate("system")}>
          <span className="start-icon">
            <Icon name="cylinder" size={18} />
          </span>
          <span className="start-title">System design</span>
          <span className="start-blurb">
            Client → edge → services → data, like an interview whiteboard.
          </span>
        </button>
        <button className="start-card" onClick={() => applyTemplate("flow")}>
          <span className="start-icon">
            <Icon name="diamond" size={18} />
          </span>
          <span className="start-title">Flowchart</span>
          <span className="start-blurb">
            Steps and decisions, top to bottom.
          </span>
        </button>
        <button className="start-card" onClick={() => applyTemplate("deck")}>
          <span className="start-icon">
            <Icon name="slides" size={18} />
          </span>
          <span className="start-title">Slide deck</span>
          <span className="start-blurb">
            Title, agenda and a diagram slide to present from.
          </span>
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
  useVersion();
  if (!S.toast) return null;
  return <div className="toast">{S.toast}</div>;
}

export function SotCard() {
  useVersion();
  if (!S.sot.listOpen || S.rec || S.sot.replay) return null;
  const list = [...sotRecList()].reverse();
  return (
    <div id="sotRoot">
      <div className="sotcard" role="dialog" aria-label="Sands of Time">
        <div className="sotcard-head">
          <span className="sotcard-title">
            <Icon name="hourglass" size={13} /> Sands of Time
          </span>
          {list.length ? (
            <span className="sotcard-count">{list.length}</span>
          ) : null}
          <button
            className="sotghost"
            onClick={() => {
              S.sot.listOpen = false;
              notify();
            }}
            aria-label="Close"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
        {list.length ? (
          <ul className="sotlist">
            {list.map((r) => (
              <li className="sotrow" key={r.id}>
                <button
                  className="sotrow-main"
                  onClick={() => sotOpenReplay(r.id)}
                  title={`Replay ${r.name}`}
                >
                  <span className="sotrow-play" aria-hidden="true">
                    <Icon name="play" size={12} />
                  </span>
                  <span className="sotrow-name">{r.name}</span>
                  <span className="sotrow-meta">
                    {sotStepWord(r.steps.length)} · {sotFmtMs(r.duration)}
                  </span>
                </button>
                <button
                  className="sotrow-del"
                  onClick={() => sotDelete(r.id)}
                  aria-label={`Delete ${r.name}`}
                  title={`Delete ${r.name}`}
                >
                  <Icon name="trash" size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sotempty">
            Record what you draw, then rewind and watch it come back.
          </p>
        )}
        <button className="sotnew" onClick={sotStart}>
          <span className="recdot" /> Record new
        </button>
      </div>
    </div>
  );
}
