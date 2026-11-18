# Design

## Context

`src/lib/iconLibrary.ts` currently embeds 443 vector icon definitions (SVG paths and keywords) directly into the TypeScript source code. Every module importing `resolveIcon` or `Icon` pulls the entire 522 KB icon dataset into the main application bundle, resulting in a 950 kB production JS bundle.

## Goals / Non-Goals

**Goals:**
- Separate the heavy vector path data (`SKETCH` and `BRAND` arrays) from the lightweight icon lookup / helper interfaces.
- Dynamically import the icon catalog chunk when the icon search palette opens or when an icon lookup requires the full catalog.
- Keep the initial Vite bundle under 500 kB so production builds have zero size warnings.
- Maintain full backward compatibility for existing canvas elements, diagrams, SVG export, and icon search.

**Non-Goals:**
- Moving icons to external HTTP URLs (the app must remain completely functional offline and local-first).
- Altering the visual design or keyboard shortcuts of the icon palette (`/`, Tab, Enter).

## Decisions

### 1. Vector data separation into `iconData.ts`
- **Choice**: Extract the static `SKETCH` (164 icons) and `BRAND` (279 icons) arrays into `src/lib/iconData.ts`.
- **Rationale**: Isolates the 500+ KB data block into a dedicated Vite/Rolldown chunk that is only requested via `import('./iconData')`.
- **Alternative considered**: Storing each icon in `public/icons/`. Rejected because hundreds of loose files increase request latency and complicate standalone bundling.

### 2. Starter cache and asynchronous full hydration
- **Choice**: Keep a lightweight starter map of `DEFAULT_IDS` (~24 core icons) or an empty cache in `iconLibrary.ts` that triggers `loadIconLibrary()` when any lookup misses or when search is initialized.
- **Rationale**: Guaranteed instant rendering for standard architecture diagrams, with zero visual layout shift or delays.
- **Alternative considered**: Strictly asynchronous `resolveIconPromise()`. Rejected because synchronous React render cycles in `NodeView.tsx` and `exportSvg.ts` benefit from synchronous reads once hydrated.

### 3. Palette preload on user interaction
- **Choice**: In `src/components/Panels.tsx`, preload `loadIconLibrary()` immediately when the icon palette is requested.
- **Rationale**: By the time the search palette animation opens, the chunk is already cached and available, providing instant search responsiveness without delay.

## Risks / Trade-offs

- **[Cold lookup for brand icons on initial canvas mount]** → Pre-seed commonly used architecture icons in the core bundle; trigger background hydration when a board with brand icons mounts.
- **[Export SVG before full library is cached]** → Await `loadIconLibrary()` in `exportSvg` if any board element uses an icon not yet in the local map.
