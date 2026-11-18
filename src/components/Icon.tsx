import { useState, useEffect } from 'react';
import { iconPath } from '../lib/icons';
import { brandFill, iconInner, resolveIcon, onIconLibraryLoaded, isIconLibraryLoaded } from '../lib/iconLibrary';

/* Tool icons are authored on a 20x20 grid (stroke 1.75) to match the live
   toolbar markup; all other icons stay on the 24x24 grid. */
const TOOL_ICONS_20 = new Set([
  'select', 'hand', 'rectangle', 'ellipse', 'diamond', 'cylinder',
  'arrow', 'line', 'text', 'pen', 'sticky', 'image',
  'frame', 'eraser', 'laser',
]);

export function Icon({ name, size = 18, sw }: { name: string; size?: number; sw?: number }) {
  const isTool = TOOL_ICONS_20.has(name);
  const strokeWidth = sw ?? (isTool ? 1.75 : 1.7);
  const viewBox = isTool ? '0 0 20 20' : '0 0 24 24';
  return (
    <svg
      className="ic"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconPath(name) }}
    />
  );
}

export function LibraryIcon({ name, size = 22, color }: { name: string; size?: number; color?: string }) {
  const [, setLoaded] = useState(isIconLibraryLoaded());
  useEffect(() => {
    if (!isIconLibraryLoaded()) {
      return onIconLibraryLoaded(() => setLoaded(true));
    }
  }, []);
  const def = resolveIcon(name);
  if (!def) return null;
  if (def.brand) {
    if (color) {
      return (
        <svg
          className="ic"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: iconInner(def.id, { brandFill: color }) }}
        />
      );
    }
    const dark = typeof document !== 'undefined' && document.querySelector?.('.app[data-theme="dark"]') != null;
    return (
      <svg
        className="ic"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: iconInner(def.id, { brandFill: brandFill(def, dark) }) }}
      />
    );
  }
  return (
    <svg
      className="ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconInner(def.id) }}
    />
  );
}
