# Proposal

## Why

The full icon library contains 443 vector icons (164 sketch and 279 brand icons) across 522 KB of raw SVG path data. Statically bundling `src/lib/iconLibrary.ts` into the main client bundle inflates the production entry chunk to nearly 1 MB (`949.53 kB`), triggering Vite bundle size warnings and delaying initial canvas interactive paint. Dynamic code-splitting and on-demand icon resolution ensure rapid initial load while maintaining instantaneous icon search and rendering when needed.

## What Changes

- Introduce asynchronous / dynamic chunk loading for the icon dataset (`SKETCH` and `BRAND` vector paths) so it is only fetched when icon search is invoked or when diagrams/nodes with icons are rendered.
- Retain lightweight synchronous icon utilities (alias normalization, id resolution, and caching) in the core bundle.
- Ensure the icon palette modal (`/` key shortcut and toolbar button) seamlessly loads the icon library on first open without UI stutter.
- Formalize the `icon-library` specification in OpenSpec to ensure icon search, keyword matching, alias resolution, and export rendering contracts are preserved.

## Capabilities

### New Capabilities

- `icon-library`: Covers icon indexing, alias and brand resolution, fuzzy keyword search, and on-demand vector path retrieval for canvas nodes and diagram export.

### Modified Capabilities

None.

## Impact

- Affected code:
  - `src/lib/iconLibrary.ts`: Split icon vector data into a dynamically imported chunk, keeping resolver APIs and cache reactive.
  - `src/components/Panels.tsx`: Wire dynamic import / query suspense into the icon search panel.
  - `src/components/NodeView.tsx` & `src/lib/exportSvg.ts`: Support asynchronous resolution or cached lookups for nodes referencing custom icons.
- Vite build: Production bundle size drops significantly below the 500 kB chunk threshold.
