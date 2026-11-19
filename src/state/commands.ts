/* The command table and global keyboard handling. */

import { clamp, isTextTarget } from "../lib/dom";
import { defaultIcons, resolveIcon, searchIcons } from "../lib/iconLibrary";
import {
  S,
  fitAll,
  fitSelection,
  notify,
  redo,
  setZoom,
  slides,
  toast,
  undo,
  zoomAt,
} from "./store";
import { useBoardStore } from "./boardStore";

import {
  arrangeSlides,
  buildAdd,
  buildReplay,
  cleanIt,
  clearSelection,
  closeOverlays,
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  duplicateSlide,
  deleteSlide,
  editLabel,
  exitPresent,
  getIconMode,
  groupSelection,
  insertIcon,
  nudge,
  openExport,
  openIconSearch,
  openPalette,
  openShortcuts,
  orderSelection,
  pasteClipboard,
  present,
  presentNav,
  selectionToSlide,
  selectAll,
  setIconMode,
  setPanel,
  setTool,
  toggleGrid,
  toggleLock,
  toggleSnap,
  toggleZen,
  ungroupSelection,
} from "./actions";
import { closeReplay, replayStep, replayToggle } from "./replay";
import {
  sotCloseReplay,
  sotCycleSpeed,
  sotOpenReplay,
  sotPlayToggle,
  sotRecList,
  sotSetIndex,
} from "./sot";

export type Command = {
  id: string;
  label: string;
  group: string;
  keys: string[];
  hidden?: boolean;
  repeat?: boolean;
  run: () => void;
};

export const COMMANDS: Command[] = [
  {
    id: "tool.select",
    label: "Select",
    group: "Tools",
    keys: ["V", "1"],
    run: () => setTool("select"),
  },
  {
    id: "tool.hand",
    label: "Hand (or hold Space)",
    group: "Tools",
    keys: ["H"],
    run: () => setTool("hand"),
  },
  {
    id: "tool.rectangle",
    label: "Rectangle",
    group: "Tools",
    keys: ["R"],
    run: () => setTool("rectangle"),
  },
  {
    id: "tool.ellipse",
    label: "Ellipse",
    group: "Tools",
    keys: ["O"],
    run: () => setTool("ellipse"),
  },
  {
    id: "tool.diamond",
    label: "Diamond",
    group: "Tools",
    keys: ["D"],
    run: () => setTool("diamond"),
  },
  {
    id: "tool.cylinder",
    label: "Cylinder (database)",
    group: "Tools",
    keys: ["C"],
    run: () => setTool("cylinder"),
  },
  {
    id: "tool.arrow",
    label: "Arrow",
    group: "Tools",
    keys: ["A"],
    run: () => setTool("arrow"),
  },
  {
    id: "tool.line",
    label: "Line",
    group: "Tools",
    keys: ["L"],
    run: () => setTool("line"),
  },
  {
    id: "tool.text",
    label: "Text",
    group: "Tools",
    keys: ["T"],
    run: () => setTool("text"),
  },
  {
    id: "tool.pen",
    label: "Pen",
    group: "Tools",
    keys: ["P"],
    run: () => setTool("pen"),
  },
  {
    id: "tool.sticky",
    label: "Sticky note",
    group: "Tools",
    keys: ["S"],
    run: () => setTool("sticky"),
  },
  {
    id: "tool.image",
    label: "Image",
    group: "Tools",
    keys: ["I"],
    run: () => setTool("image"),
  },
  {
    id: "tool.frame",
    label: "Diagram frame",
    group: "Tools",
    keys: ["F"],
    run: () => setTool("frame"),
  },
  {
    id: "tool.eraser",
    label: "Eraser",
    group: "Tools",
    keys: ["E"],
    run: () => setTool("eraser"),
  },
  {
    id: "tool.laser",
    label: "Laser pointer",
    group: "Tools",
    keys: ["K"],
    run: () => setTool("laser"),
  },
  {
    id: "tool.icon",
    label: "Insert icon (search)",
    group: "Tools",
    keys: ["/"],
    run: openIconSearch,
  },

  {
    id: "edit.undo",
    label: "Undo",
    group: "Edit",
    keys: ["Mod+Z"],
    repeat: true,
    run: undo,
  },
  {
    id: "edit.redo",
    label: "Redo",
    group: "Edit",
    keys: ["Mod+Shift+Z", "Mod+Y"],
    repeat: true,
    run: redo,
  },
  {
    id: "edit.copy",
    label: "Copy",
    group: "Edit",
    keys: ["Mod+C"],
    run: copySelection,
  },
  {
    id: "edit.cut",
    label: "Cut",
    group: "Edit",
    keys: ["Mod+X"],
    run: cutSelection,
  },
  {
    id: "edit.paste",
    label: "Paste",
    group: "Edit",
    keys: ["Mod+V"],
    run: pasteClipboard,
  },
  {
    id: "edit.duplicate",
    label: "Duplicate",
    group: "Edit",
    keys: ["Mod+D"],
    run: duplicateSelection,
  },
  {
    id: "edit.delete",
    label: "Delete",
    group: "Edit",
    keys: ["Delete", "Backspace"],
    run: deleteSelection,
  },
  {
    id: "edit.selectAll",
    label: "Select all",
    group: "Edit",
    keys: ["Mod+A"],
    run: selectAll,
  },
  {
    id: "edit.deselect",
    label: "Deselect / cancel",
    group: "Edit",
    keys: ["Escape"],
    run: () => {
      if (S.present) return exitPresent();
      if (
        S.palette ||
        S.exportOpen ||
        S.connectOpen ||
        S.iconSearch ||
        S.renameOpen ||
        S.mermaidOpen ||
        S.help ||
        S.shortcuts
      )
        return closeOverlays();
      if (S.sot.replay) return sotCloseReplay();
      if (S.replay) return closeReplay();
      if (S.sot.listOpen) {
        S.sot.listOpen = false;
        notify();
        return;
      }
      clearSelection();
    },
  },
  {
    id: "edit.editLabel",
    label: "Edit label",
    group: "Edit",
    keys: ["Enter"],
    run: editLabel,
  },

  {
    id: "arrange.nudgeLeft",
    label: "Nudge one dot (Shift: 1px)",
    group: "Arrange",
    keys: ["ArrowLeft"],
    repeat: true,
    run: () => nudge(-1, 0),
  },
  {
    id: "arrange.nudgeRight",
    label: "Nudge right",
    group: "Arrange",
    keys: ["ArrowRight"],
    repeat: true,
    hidden: true,
    run: () => nudge(1, 0),
  },
  {
    id: "arrange.nudgeUp",
    label: "Nudge up",
    group: "Arrange",
    keys: ["ArrowUp"],
    repeat: true,
    hidden: true,
    run: () => nudge(0, -1),
  },
  {
    id: "arrange.nudgeDown",
    label: "Nudge down",
    group: "Arrange",
    keys: ["ArrowDown"],
    repeat: true,
    hidden: true,
    run: () => nudge(0, 1),
  },
  {
    id: "arrange.group",
    label: "Group",
    group: "Arrange",
    keys: ["Mod+G"],
    run: groupSelection,
  },
  {
    id: "arrange.ungroup",
    label: "Ungroup",
    group: "Arrange",
    keys: ["Mod+Shift+G"],
    run: ungroupSelection,
  },
  {
    id: "arrange.forward",
    label: "Bring forward",
    group: "Arrange",
    keys: ["Mod+]"],
    run: () => orderSelection("forward"),
  },
  {
    id: "arrange.backward",
    label: "Send backward",
    group: "Arrange",
    keys: ["Mod+["],
    run: () => orderSelection("backward"),
  },
  {
    id: "arrange.front",
    label: "Bring to front",
    group: "Arrange",
    keys: ["Mod+Shift+]"],
    run: () => orderSelection("front"),
  },
  {
    id: "arrange.back",
    label: "Send to back",
    group: "Arrange",
    keys: ["Mod+Shift+["],
    run: () => orderSelection("back"),
  },
  {
    id: "arrange.lock",
    label: "Lock / unlock",
    group: "Arrange",
    keys: ["Mod+Shift+L"],
    run: toggleLock,
  },

  {
    id: "view.zoomIn",
    label: "Zoom in",
    group: "View",
    keys: ["Mod+=", "Mod++"],
    repeat: true,
    run: () => zoomAt(innerWidth / 2, innerHeight / 2, 1.15),
  },
  {
    id: "view.zoomOut",
    label: "Zoom out",
    group: "View",
    keys: ["Mod+-"],
    repeat: true,
    run: () => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.15),
  },
  {
    id: "view.zoomReset",
    label: "Zoom to 100%",
    group: "View",
    keys: ["Shift+0"],
    run: () => setZoom(1),
  },
  {
    id: "view.zoomFit",
    label: "Fit everything",
    group: "View",
    keys: ["Shift+1"],
    run: fitAll,
  },
  {
    id: "view.zoomSelection",
    label: "Fit selection",
    group: "View",
    keys: ["Shift+2"],
    run: fitSelection,
  },
  {
    id: "view.toggleSnap",
    label: "Snap to dots",
    group: "View",
    keys: ["Mod+'"],
    run: toggleSnap,
  },
  {
    id: "view.toggleGrid",
    label: "Show dots",
    group: "View",
    keys: ["Mod+Shift+'"],
    run: toggleGrid,
  },
  {
    id: "view.zen",
    label: "Zen mode (hide all controls)",
    group: "View",
    keys: ["Alt+Z"],
    run: toggleZen,
  },

  {
    id: "panel.palette",
    label: "Command palette",
    group: "Panels",
    keys: ["Mod+K"],
    run: openPalette,
  },
  {
    id: "panel.code",
    label: "Diagram code",
    group: "Panels",
    keys: ["Mod+E"],
    run: () => setPanel("code"),
  },
  {
    id: "panel.assistant",
    label: "Assistant",
    group: "Panels",
    keys: ["Mod+I"],
    run: () => setPanel("assistant"),
  },
  {
    id: "panel.export",
    label: "Export",
    group: "Panels",
    keys: ["Mod+Shift+E"],
    run: openExport,
  },
  {
    id: "panel.slides",
    label: "Slides",
    group: "Panels",
    keys: ["Mod+Shift+S"],
    run: () => setPanel("slides"),
  },
  {
    id: "slides.present",
    label: "Present slides",
    group: "Panels",
    keys: ["Mod+Enter"],
    run: () => present(S.present?.index || 0),
  },
  {
    id: "slides.fromSelection",
    label: "Selection to slide",
    group: "Panels",
    keys: ["Mod+Alt+S"],
    run: selectionToSlide,
  },
  {
    id: "ai.cleanIt",
    label: "Clean it (layout)",
    group: "Panels",
    keys: ["Mod+Shift+K"],
    run: cleanIt,
  },
  {
    id: "panel.shortcuts",
    label: "Keyboard shortcuts",
    group: "Panels",
    keys: ["?"],
    run: openShortcuts,
  },
];

export function prettyKey(k: string): string {
  return k
    .replace("Mod+", /mac/i.test(navigator.platform) ? "⌘" : "Ctrl+")
    .replace("Shift+", "⇧")
    .replace("Alt+", "⌥");
}

export function filteredCommands() {
  const q = (S.paletteQ || "").toLowerCase();
  return COMMANDS.filter(
    (c) =>
      !q ||
      c.label.toLowerCase().includes(q) ||
      c.id.includes(q) ||
      (c.group || "").toLowerCase().includes(q),
  );
}

export function filteredIcons(): string[] {
  const q = (S.iconQuery || "").trim();
  if (!q) return defaultIcons().map((e) => e.id);
  return searchIcons(q, 36).map((e) => e.id);
}

export function resolveIconName(id: string): string {
  return resolveIcon(id)?.id || id;
}

export function keyMatch(e: KeyboardEvent, spec: string): boolean {
  const parts = spec.split("+");
  const key = parts.pop()!;
  const mod = parts.includes("Mod");
  const shift = parts.includes("Shift");
  const alt = parts.includes("Alt");
  const mac = /mac/i.test(navigator.platform);
  const cmd = mac ? e.metaKey : e.ctrlKey;
  const other = mac ? e.ctrlKey : e.metaKey;
  if (cmd !== mod || other) return false;
  if (e.altKey !== alt) return false;
  const plain = !["?", "+"].includes(key);
  if (plain && e.shiftKey !== shift) return false;
  const k = e.key;
  if (key.length === 1) return k.toLowerCase() === key.toLowerCase();
  return k === key;
}

export function presentKey(e: KeyboardEvent) {
  if (!S.present) return;
  const k = e.key;
  if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter", "n"].includes(k)) {
    e.preventDefault();
    presentNav(1);
  } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p"].includes(k)) {
    e.preventDefault();
    presentNav(-1);
  } else if (k === "Home") {
    e.preventDefault();
    S.present.index = 0;
    S.present.steps = 0;
    notify();
  } else if (k === "End") {
    e.preventDefault();
    S.present.index = slides().length - 1;
    S.present.steps = 0;
    notify();
  } else if (k === "l" || k === "L") {
    S.present.laser = !S.present.laser;
    notify();
  } else if (k === "f" || k === "F") {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

function onKeyDown(e: KeyboardEvent) {
  const target = e.target;

  if (e.key === "Escape") {
    if (S.present) {
      e.preventDefault();
      return exitPresent();
    }
    if (S.sot.replay) {
      e.preventDefault();
      return sotCloseReplay();
    }
    if (S.replay) {
      e.preventDefault();
      return closeReplay();
    }
    if (
      S.palette ||
      S.exportOpen ||
      S.connectOpen ||
      S.iconSearch ||
      S.renameOpen ||
      S.mermaidOpen ||
      S.help ||
      S.shortcuts
    ) {
      e.preventDefault();
      return closeOverlays();
    }
    if (S.sot.listOpen) {
      e.preventDefault();
      S.sot.listOpen = false;
      notify();
      return;
    }
    if (S.selection.size) {
      e.preventDefault();
      return clearSelection();
    }
  }

  if (S.present) return presentKey(e);

  if (S.sot.replay) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      return sotSetIndex(S.sot.replay.index + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      return sotSetIndex(S.sot.replay.index - 1);
    }
    if (e.key === " ") {
      e.preventDefault();
      return sotPlayToggle();
    }
    if (e.key === "Home") {
      e.preventDefault();
      return sotSetIndex(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      const rec = sotRecList().find((r) => r.id === S.sot.replay?.id);
      return sotSetIndex(rec ? rec.frames.length - 1 : 0);
    }
    return;
  }

  if (S.replay) {
    if (e.key === "ArrowRight") return replayStep(1);
    if (e.key === "ArrowLeft") return replayStep(-1);
    if (e.key === " ") {
      e.preventDefault();
      return replayToggle();
    }
    return;
  }

  if (S.palette) {
    const list = filteredCommands();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      useBoardStore.setState({
        paletteIndex: clamp((S.paletteIndex || 0) + 1, 0, list.length - 1),
      } as any);
      return notify();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      useBoardStore.setState({
        paletteIndex: clamp((S.paletteIndex || 0) - 1, 0, list.length - 1),
      } as any);
      return notify();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const c = list[S.paletteIndex || 0];
      closeOverlays();
      c?.run?.();
      return;
    }
    return;
  }

  if (S.iconSearch) {
    const list = filteredIcons();
    const step = (d: number) => {
      e.preventDefault();
      useBoardStore.setState({
        iconCursor: clamp((S.iconCursor || 0) + d, 0, list.length - 1),
      } as any);
      return notify();
    };
    if (e.key === "ArrowRight") return step(1);
    if (e.key === "ArrowLeft") return step(-1);
    if (e.key === "ArrowDown") return step(6);
    if (e.key === "ArrowUp") return step(-6);
    if (e.key === "Tab") {
      e.preventDefault();
      setIconMode(getIconMode() === "box" ? "icon" : "box");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const icon = list[S.iconCursor || 0];
      if (icon) insertIcon(icon);
      return;
    }
    return;
  }

  if (
    S.connectOpen ||
    S.exportOpen ||
    S.help ||
    S.shortcuts ||
    S.renameOpen ||
    S.mermaidOpen
  )
    return;
  if (isTextTarget(target)) return;

  if (e.key === " " && !e.repeat) {
    e.preventDefault();
    useBoardStore.setState({ space: true } as any);
    notify();
    return;
  }

  useBoardStore.setState({ _shift: e.shiftKey } as any);
  for (const c of COMMANDS) {
    if (e.repeat && !c.repeat) continue;
    if (c.keys.some((k) => keyMatch(e, k))) {
      e.preventDefault();
      c.run();
      return;
    }
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === " ") {
    useBoardStore.setState({ space: false } as any);
    notify();
  }
  if (e.key === "Shift") useBoardStore.setState({ _shift: false } as any);
}

export function installKeyboard(): () => void {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  return () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  };
}

/* Re-exported for the replay surface's action buttons. */
export {
  sotOpenReplay,
  sotCycleSpeed,
  buildAdd,
  buildReplay,
  duplicateSlide,
  deleteSlide,
  arrangeSlides,
  toast,
};
