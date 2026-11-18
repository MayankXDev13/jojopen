import { useEffect, useRef } from 'react';
import { elementBounds } from '../lib/geometry';
import { S, fontFor, notify } from '../state/store';
import { useBoardStore } from '../state/boardStore';
import { commitEdit } from '../state/actions';
import { useVersion } from '../state/boardStore';

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
    ta.select();
    grow(ta);
  }, [S.editingId]);

  if (!el) return null;

  const b = elementBounds(el);
  const z = S.camera.zoom;
  const isText = el.type === 'text';
  const fs = (isText ? el.fontSize || 18 : el.type === 'sticky' ? 16 : 14) * (isText ? 1 : el.textScale ?? 1);

  /* Excalidraw-style: the box grows to its text instead of scrolling. */
  const grow = (ta: HTMLTextAreaElement) => {
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(28, ta.scrollHeight)}px`;
  };

  const finish = (cancel: boolean) => {    if (done.current) return;
    done.current = true;
    const v = ref.current?.value ?? '';
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
      defaultValue={el.type === 'arrow' ? el.label || '' : el.text ?? el.label ?? ''}
      spellCheck={false}
      style={{
        left: b.minX * z + S.camera.x,
        top: b.minY * z + S.camera.y,
        width: Math.max(60, (b.maxX - b.minX) * z),
        height: Math.max(28, (b.maxY - b.minY) * z),
        fontSize: fs * z,
        lineHeight: 1.28,
        fontFamily: isText || el.type === 'sticky' ? fontFor(el) : 'var(--sans)',
        textAlign: (isText ? el.align || 'left' : el.type === 'shape' ? 'center' : 'left') as any,
        padding: el.type === 'sticky' ? `${14 * z}px` : isText ? 0 : '6px 10px',
        background: el.type === 'sticky' ? '#fff3b8' : undefined,
      }}
      onBlur={() => finish(false)}
      onInput={(e) => {
        const ta = e.currentTarget;
        /* Normalize newlines so metrics and rendering agree. */
        if (/\r/.test(ta.value)) {
          const pos = ta.selectionStart;
          ta.value = ta.value.replace(/\r\n?/g, '\n');
          ta.selectionStart = ta.selectionEnd = Math.min(pos, ta.value.length);
        }
        grow(ta);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(true);
        }
        if (e.key === 'Tab') {
          /* Excalidraw-style: indent inside the editor, never leave it. */
          e.preventDefault();
          const ta = e.currentTarget;
          const { selectionStart: s, selectionEnd: t, value } = ta;
          ta.value = `${value.slice(0, s)}  ${value.slice(t)}`;
          ta.selectionStart = ta.selectionEnd = s + 2;
          grow(ta);
        }
        /* Plain Enter commits for every type (board text included);
           Shift+Enter keeps the newline for multiline text. */
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finish(false);
        }
      }}
    />
  );
}
