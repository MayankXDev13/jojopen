# Design

## Context

See `proposal.md` (Why) for motivation. Current state:
- `src/state/store.ts`: `loadDoc()` / `boardsList()` use `JSON.parse` + try/catch, `normalizeDoc()` does shallow spreads with no field validation.
- `src/lib/model.ts`: `BoardDoc` / `BoardElement` / `BoardSettings` are TypeScript types only; `normalizeDoc(d: any)` trusts unknown input shapes.
- `src/lib/ai.ts`: `loadAIConfig()` returns `JSON.parse(...)` cast to `AIConfig` with no checks.
- No runtime dependency on `zod`; package manager is `bun@1.4.0`, bundler `vite`, TS `~7.0.2`.

Constraints: boot path (`bootStore`) must never throw; first-run/demo seeding in `board-bootstrap` must keep working; `localStorage` keys and stored JSON shape stay backward compatible (additive validation only).

## Goals / Non-Goals

**Goals:**
- Single source of truth for persisted shapes with Zod v4 schemas co-located with the model.
- Deterministic fallback: invalid payload → `blankDoc()` / `[]` / `{}` with a `console.warn`, never a blank crash.
- Preserve unknown-field tolerance (strip, don't reject) so future schema versions load in older clients.

**Non-Goals:**
- No schema migration/version-upgrade system beyond `schemaVersion: 1` passthrough (no v1→v2 transforms in this change).
- No validation of live DSL, canvas interactions, or network AI responses — persisted `localStorage` only.
- No UI for "data was corrupt" recovery prompts; silent fallback + warn log only.

## Decisions

- **New module `src/lib/schemas.ts` (Zod v4) over inline schemas in `store.ts`.**
  Rationale: keeps `model.ts` type-only and avoids bloating the store; one import for store + AI + firstRun paths. Alternative (schemas inside `model.ts`) rejected to avoid a runtime zod import in a currently type+factory module and to keep diff reviewable.
- **Zod v4 (`zod@^4`) with `z.object().catchall`/`z.looseObject` style strip semantics and `.default()` / `.prefault` for settings.**
  Rationale: user selected v4; v4 `safeParse` + `z.flattenError` gives cheap boot-time validation. Alternative (v3) rejected per user choice; alternative (hand-rolled guards) rejected — more code, less maintainability.
- **`safeParse` everywhere, never `parse`.**
  Each hydration site (`loadDoc`, hash copy, `boardsList`, `loadAIConfig`) does `JSON.parse` → `Schema.safeParse`; on `!success` logs `console.warn` with flattened issues and returns fallback. Rationale: boot must never throw even on adversarial localStorage content.
- **Element schema is permissive-by-design: strict core (`id`, `type`, `x`, `y`) + `.catchall(z.unknown())` passthrough for per-type extras.**
  Rationale: `BoardElement` has an index signature (`[key: string]: any`) and ~10 element kinds; a fully strict union would be brittle and reject future element kinds. Alternative (strict discriminated union per `type`) rejected for this change — can be tightened later without changing the spec contract.
- **`normalizeDoc` becomes a thin wrapper over schemas (defaults from Zod, not spreads).**
  `DEFAULT_SETTINGS` remains the canonical default values; schemas reference it via `.default()`/`.prefault` so behavior is identical for valid docs. Invalid fields fall back per-field rather than dropping the whole doc where safe (settings), but whole-doc fallback when identity fields (`id`) are missing.

## Risks / Trade-offs

- [Risk] Overly strict element validation rejects real user boards → Mitigation: keep element core minimal, strip unknown keys, per-field defaults; add a round-trip test over `seedDemo()` + `importLive` fixtures.
- [Risk] Zod v4 API churn vs team familiarity with v3 → Mitigation: pin `^4`, use only stable `z.object/string/number/boolean/array/record/enum/default/safeParse` surface; note v4 import path (`zod`) unchanged.
- [Risk] Bundle size increase (~10-15KB gzip) → Mitigation: acceptable for a local-first app; import from single module so tree-shaking applies; no async import needed since boot is synchronous.
- [Risk] Silent fallback hides data loss (user's corrupt board replaced) → Mitigation: `console.warn` with key + issues; future change can add toast/recovery UI (explicit non-goal here).

## Migration Plan

1. `bun add zod` (adds `zod@^4` to `dependencies`).
2. Add `src/lib/schemas.ts` + unit-testable pure validators.
3. Rewire `loadDoc`, `boardsList`, `loadAIConfig`, `normalizeDoc` to use them; keep key names and JSON shapes identical.
4. Verify: `bun run typecheck`, `bun run build`, manual boot with valid / empty / corrupt `localStorage` fixtures.
5. Rollback: revert the rewiring commits; stored data format is unchanged so no data migration or rollback script is needed.

## Open Questions

- None blocking. Follow-up candidates (do not change specs/tasks): whether to surface a "recovered from corrupt data" toast, and whether to add a `schemaVersion: 2` migration framework later.
