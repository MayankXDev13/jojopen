import { useEffect, useRef } from "react";
import { arrowGeom, elementBounds } from "../lib/geometry";
import { S, colorFor, fontFor, notify, theme } from "../state/store";
import { useBoardStore } from "../state/boardStore";
import { commitEdit } from "../state/actions";
import { useVersion } from "../state/boardStore";

export function TextEditor() {
  useVersion();
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const el = S.editingId ? S.doc.elements[S.editingId] : null;

  useEffect(() => {
    done.current = false;
    const ta = ref.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    // Original selects all text on open for immediate retype.
    ta.select();
    grow(ta);
  }, [S.editingId]);

  if (!el) return null;

  const isArrow = el.type === "arrow";
  const isContainer = el.type === "container";
  const b = elementBounds(el);
  const z = S.camera.zoom;
  const isText = el.type === "text";
  const isSticky = el.type === "sticky";
  // Editor sizes match each renderer: board text owns its size, sticky 16,
  // shape/container 14 base, arrow pill 11.
  const fs = isText ? el.fontSize || 18 : isArrow ? 11 : isSticky ? 16 : 14;
  const fontPx = fs * (isText ? 1 : (el.textScale ?? 1));
  // Arrow labels edit at their path midpoint.
  let left = b.minX * z + S.camera.x;
  let top = b.minY * z + S.camera.y;
  let wpx = Math.max(60, (b.maxX - b.minX) * z);
  let hpx = Math.max(28, (b.maxY - b.minY) * z);
  if (isArrow) {
    try {
      const geom = arrowGeom(el, (id) => S.doc.elements[id], theme());
      left = geom.labelPoint.x * z + S.camera.x - 80;
      top = geom.labelPoint.y * z + S.camera.y - 16;
      wpx = 160;
    } catch {
      /* fallback to bbox */
    }
  }
  // Original container editor is a 32px title strip at the top (left aligned).
  if (isContainer) hpx = 32 * z;
  // Original shape/container editors are fixed boxes (no autogrow); the text
  // starts vertically centered via padding like the rendered label.
  const fixedBox = el.type === "shape" || isContainer;
  const lineH = 1.25;
  const vPad = fixedBox ? Math.max(0, (hpx - fontPx * z * lineH) / 2) : 0;

  /* The box grows to its text instead of scrolling (not for fixed editors). */
  const grow = (ta: HTMLTextAreaElement) => {
    if (fixedBox) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(28, ta.scrollHeight)}px`;
  };

  const finish = (cancel: boolean) => {
    if (done.current) return;
    done.current = true;
    const v = ref.current?.value ?? "";
    if (cancel) {
      useBoardStore.setState({ editingId: null } as any);
      notify();
      return;
    }
    commitEdit(el.id, v);
  };

  return (
    <textarea
      key={el.id}
      ref={ref}
      className="texteditor"
      defaultValue={
        el.type === "arrow" ? el.label || "" : (el.text ?? el.label ?? "")
      }
      spellCheck={false}
      style={{
        left,
        top,
        width: isArrow ? wpx : Math.max(60, (b.maxX - b.minX) * z),
        height: isArrow ? Math.max(28, (b.maxY - b.minY) * z) : hpx,
        fontSize: fontPx * z,
        lineHeight: lineH,
        fontFamily:
          isText || isSticky || el.type === "shape" || isContainer
            ? fontFor(el)
            : "var(--sans)",
        textAlign: (isText
          ? el.align || "left"
          : el.type === "shape"
            ? "center"
            : "left") as any,
        // Shape/container: caret starts vertically centered via padding,
        // matching the centered label (original). Sticky gets 18/16.
        padding: fixedBox
          ? `${vPad}px ${12 * z}px`
          : isSticky
            ? `${18 * z}px ${16 * z}px`
            : isText
              ? 0
              : "6px 10px",
        background: isSticky ? "#fff3b8" : undefined,
        // Tinted while typing like the committed label (original uses g.text).
        color: isSticky ? undefined : colorFor(el).text,
      }}
      onBlur={() => finish(false)}
      onInput={(e) => {
        const ta = e.currentTarget;
        /* Normalize newlines so metrics and rendering agree. */
        if (/\r/.test(ta.value)) {
          const pos = ta.selectionStart;
          ta.value = ta.value.replace(/\r\n?/g, "\n");
          ta.selectionStart = ta.selectionEnd = Math.min(pos, ta.value.length);
        }
        grow(ta);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          // Original commits on Escape (trailing-trimmed), never discards.
          e.preventDefault();
          finish(false);
        }
        if (e.key === "Tab") {
          /* Excalidraw-style: indent inside the editor, never leave it. */
          e.preventDefault();
          const ta = e.currentTarget;
          const { selectionStart: s, selectionEnd: t, value } = ta;
          ta.value = `${value.slice(0, s)}  ${value.slice(t)}`;
          ta.selectionStart = ta.selectionEnd = s + 2;
          grow(ta);
        }
        /* Original: Enter = newline, Cmd/Ctrl+Enter or Escape commit, blur commits. */
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          finish(false);
        }
      }}
    />
  );
}
