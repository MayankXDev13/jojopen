# JojoPen

An infinite canvas for system diagrams, with a slide deck, a small diagram language
and a drawing recorder (“Sands of Time”). Vite + React + TypeScript port of the
original single-file app preserved in [`legacy/index.html`](legacy/index.html).

```bash
bun install
bun run dev       # http://127.0.0.1:5173/
bun run build     # type-check + production bundle
bun run preview
```

- Feature reference: [`docs/FEATURES.md`](docs/FEATURES.md)
- Code audit: [`docs/AUDIT.md`](docs/AUDIT.md)
- Architecture and migration notes: [`docs/MIGRATION.md`](docs/MIGRATION.md)
- Parity harness: [`docs/harness/`](docs/harness/)

Everything persists locally (`jojopen.*` localStorage keys). No account or network
access is needed for drawing, slides, export or recordings.
