/* Small DOM/JS helpers shared by the canvas engine. */

export const uid = (): string => {
  const a = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let s = '';
  const b = crypto.getRandomValues(new Uint8Array(12));
  for (const x of b) s += a[x & 63];
  return s;
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const round = (v: number, p = 2) => Math.round(v * 10 ** p) / 10 ** p;

export const deep = <T,>(o: T): T => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

export const isTextTarget = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.tagName === 'SELECT');
};

export const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;

export const download = (filename: string, blob: Blob | null) => {
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
};

export const slug = (s: string, fallback = 'board') => (s || fallback).replace(/\s+/g, '-').toLowerCase();
