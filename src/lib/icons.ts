/* Icon path data, lifted from the reconstruction so markup stays identical. */

export const ICONS: Record<string, string> = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  select: '<path d="M5 3l10 6-4.5 1.5L9 15z"/>',
  hand: '<path d="M7 10V4.5a1.2 1.2 0 0 1 2.4 0V9M9.4 8.5v-5a1.2 1.2 0 0 1 2.4 0V9M11.8 8.8v-4a1.2 1.2 0 0 1 2.4 0V11c0 3-2 5-5 5H9c-2 0-3-1-4-2.5l-1.8-2.9a1.2 1.2 0 0 1 2-1.3L7 11.5"/>',
  rectangle:
    '<path d="M6 3.5h8a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 14V6A2.5 2.5 0 0 1 6 3.5z"/>',
  ellipse: '<path d="M10 3.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"/>',
  diamond: '<path d="M10 3l7 7-7 7-7-7z"/>',
  cylinder:
    '<path d="M4 5.5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v9c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"/>',
  arrow: '<path d="M4 16L16 4M8 4h8v8"/>',
  line: '<path d="M4 16L16 4"/>',
  text: '<path d="M5 5h10M10 5v11"/>',
  pen: '<path d="M13.5 3.5l3 3L7 16H4v-3z"/>',
  pencil:
    '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  sticky: '<path d="M4 4h12v8l-4 4H4zM12 16v-4h4"/>',
  image:
    '<path d="M5 4h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM17 13l-4-4-7 7M7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>',
  frame: '<path d="M6 3v14M14 3v14M3 6h14M3 14h14"/>',
  eraser:
    '<path d="M8 16h8M3.5 12.5l7-7a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L10 15H6z"/>',
  laser:
    '<path d="M3 17l7-7M12.5 7.5a2.5 2.5 0 1 1 0.01 0M15 3.5l.8 1.6M17.5 6l-1.6.8M16.5 2.5l-.5 1"/>',
  slides:
    '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18v3"/>',
  code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
  docshape: '<path d="M4 3.5h12V15c-2-1.2-4-1.2-6 0s-4 1.2-6 0z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.2-2.7 3.6M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4"/>',
  dots: '<circle cx="6" cy="6" r=".8"/><circle cx="12" cy="6" r=".8"/><circle cx="18" cy="6" r=".8"/><circle cx="6" cy="12" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="18" cy="12" r=".8"/><circle cx="6" cy="18" r=".8"/><circle cx="12" cy="18" r=".8"/><circle cx="18" cy="18" r=".8"/>',
  contrast:
    '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  chevdown: '<path d="m6 9 6 6 6-6"/>',
  sparkles:
    '<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  spark:
    '<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  rounded: '<rect x="3" y="5" width="18" height="14" rx="4.5"/>',
  person: '<path d="M6 5h8a5 5 0 0 1 0 10H6A5 5 0 0 1 6 5z"/>',
  hourglass:
    '<path d="M6 3h12M6 21h12"/><path d="M7 3v3.5c0 2 5 3.6 5 5.5s-5 3.5-5 5.5V21M17 3v3.5c0 2-5 3.6-5 5.5s5 3.5 5 5.5V21"/>',
  present:
    '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="m9 8 4 2-4 2z" fill="currentColor" stroke="none"/><path d="M8 20h8M12 16v4"/>',
  play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  next: '<path d="m6 5 8 7-8 7z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>',
  prev: '<path d="m18 5-8 7 8 7z" fill="currentColor" stroke="none"/><path d="M6 5v14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  duplicate:
    '<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M9 21h10a2 2 0 0 0 2-2V9"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock:
    '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
  front:
    '<rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" fill-opacity=".18"/><path d="M4 16V4h12"/>',
  back: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v12H8"/>',
  forward: '<path d="M12 3v14M7 12l5 5 5-5"/>',
  backward: '<path d="M12 21V7M7 12l5-5 5 5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M15 4v16M4 9h16M4 15h16"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-1 2-2 0-1.6-1.5-2-1.5-3.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5C21 5.7 17 3 12 3z"/><circle cx="7.5" cy="10" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14" cy="6.5" r="1"/><circle cx="17" cy="10" r="1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  warning: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 14c2 .7 3.5 2.4 3.5 5"/>',
  route:
    '<path d="M4 6h6a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h4"/><path d="m17 15 3 3-3 3"/>',
  curve: '<path d="M4 18c6 0 4-12 10-12h6"/><path d="m17 3 3 3-3 3"/>',
  straight: '<path d="M4 19 20 5"/><path d="m15 5h5v5"/>',
  dash: '<path d="M3 10h3M8.5 10h3M14 10h3"/>',
  note: '<path d="M5 3h14v14l-4 4H5z"/><path d="M15 21v-4h4M8 8h8M8 12h6"/>',
  board:
    '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 18v3M17 18v3M7 9h4M7 13h7"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  link: '<path d="M10 13a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.4 6"/><path d="M14 11a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.5h4l.4-2.5c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',
  robot:
    '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M9 13h.01M15 13h.01M9 16h6"/>',
  layers:
    '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>',
  sort: '<path d="M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3"/>',
  glasses:
    '<circle cx="6" cy="15" r="3.2"/><circle cx="18" cy="15" r="3.2"/><path d="M9.2 15h5.6M3 12l2.4-4.5A2 2 0 0 1 7.2 6.4M21 12l-2.4-4.5A2 2 0 0 0 16.8 6.4"/>',
  cloud:
    '<path d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 9a3.5 3.5 0 0 1 .5 9z"/>',
  server:
    '<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h4M12 17.5h4"/>',
  database:
    '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  lock2:
    '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
  flash: '<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.6 5.5 3.6 9S14.5 18.4 12 21c-2.5-2.6-3.6-5.5-3.6-9S9.5 5.6 12 3z"/>',
  browser:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01"/>',
  mobile:
    '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 5h3M11 18.5h2"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  dots3:
    '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  arrowup: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  arrowdown: '<path d="M12 4v15M6 13l6 6 6-6"/>',
  send: '<path d="M4 12 21 4l-7 17-3-7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 5v6h-6"/>',
};

/** Old hand-made palette removed — `/` search now uses only the imported
 * jojopen.com library (src/lib/iconLibrary.ts: 164 sketch + 279 brand icons).
 * ICONS below stays for toolbar / UI chrome only. */

export const iconPath = (name: string) => ICONS[name] || ICONS.info;

/** Inline SVG markup for an icon, matching the original `ico()` helper. */
export function ico(name: string, size = 18, sw?: number): string {
  const isTool =
    name === "select" ||
    name === "hand" ||
    name === "rectangle" ||
    name === "ellipse" ||
    name === "diamond" ||
    name === "cylinder" ||
    name === "arrow" ||
    name === "line" ||
    name === "text" ||
    name === "pen" ||
    name === "sticky" ||
    name === "image" ||
    name === "frame" ||
    name === "eraser" ||
    name === "laser";
  const stroke = sw ?? (isTool ? 1.75 : 1.7);
  const vb = isTool ? "0 0 20 20" : "0 0 24 24";
  return `<svg class="ic" width="${size}" height="${size}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPath(name)}</svg>`;
}
