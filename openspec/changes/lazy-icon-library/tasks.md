# Tasks

## 1. Icon data extraction & dynamic chunk setup

- [x] 1.1 Extract `SKETCH` and `BRAND` vector icon arrays into `src/lib/iconData.ts` and verify build treats it as an independent module
- [x] 1.2 Implement `loadIconLibrary()` with session promise caching and starter `DEFAULT_IDS` in `src/lib/iconLibrary.ts` and verify synchronous fallback resolution works

## 2. Component integration & search palette

- [x] 2.1 Update `src/components/Panels.tsx` to asynchronously load the icon library when opening the icon palette and verify search queries display results
- [x] 2.2 Ensure `src/components/NodeView.tsx`, `src/lib/diagram.ts`, and `src/lib/exportSvg.ts` resolve icons seamlessly and verify canvas nodes and SVG exports retain their icons

## 3. Verification & bundle audit

- [x] 3.1 Run `bun run build` and verify the entry JS chunk is reduced below 500 kB with zero Vite chunk size warnings
- [x] 3.2 Run `bun run typecheck` and verify 0 TypeScript diagnostic errors
