import { useEffect, useRef } from 'react';
import { elementBounds } from '../lib/geometry';
import { S, fontFor, notify } from '../state/store';
import { commitEdit } from '../state/actions';

export function TextEditor() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const el = S.editingId ? S.doc.elements[S.editingId] : null;

  useEffect(() => {
    done.current = false;
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    ta.select();
  }, [S.editingId]);

  if (!el) return null;

  const b = elementBounds(el);
  const z = S.camera.zoom;
  const isText = el.type === 'text';
  const fs = isText ? el.fontSize || 18 : el.type === 'sticky' ? 16 : 14;

  const finish = (cancel: boolean) => {
    if (done.current) return;
    done.current = true;
    const v = ref.current?.value ?? '';
    if (cancel) {
      S.editingId = null;
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
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(true);
        }
        if (e.key === 'Enter' && !e.shiftKey && el.type !== 'text') {
          e.preventDefault();
          finish(false);
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          finish(false);
        }
      }}
    />
  );
}
