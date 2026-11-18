# Design

## Context

See proposal.md Why. Current: `Canvas.tsx` fire-and-forget creation, `TextEditor.tsx` textarea with `Enter=commit`, `geometry.ts` bbox anchors + 2-point `H/V` arrows, `Edges.tsx` polyline ink, `eraseAt` skips arrows/ink. See specs for required behavior.

## Goals / Non-Goals

Goals: measured text, bound text, pressure ink, anchor bindings + re-route, collision eraser, sticky parity.
Non-Goals: full TipTap rich-text toolbar (plain + bold/italic only if cheap), cloud sync, mobile palm rejection tuning.

## Decisions

- Text measure via canvas `measureText` + `wrapText` with `originalText` kept, `autoSize` flag on element (tldraw) + `maxWidth 800/2000` (Excalidraw). Over DOM measure for zoom invariance.
- `Enter=newline`, `Cmd/Ctrl+Enter`/`Esc`/outside = commit. Matches both refs; fixes inverted contract.
- Bindings: `normalizedAnchor {x,y} + isExact/isPrecise + snap` (tldraw) stored on arrow ends; live `suggestedBinding` highlight; elbow re-route `H/V` + obstacle nudge (subset of Excalidraw A*, full A* deferred).
- Ink: velocity-simulated pressure for mouse, `e.pressure` for pen; streamline interpolate + moving-average smoothing + width `thinning`; simplify (RDP) on release; render filled outline path (perfect-freehand algo vendored, no new dep if possible, else `perfect-freehand` lib).
- Eraser: segment-vs-shape collision (distance to `Polyline2d`/bbox expanded by stroke width), not bbox contain.
- Bound text: `boundId` on text + `containerId` cache; commit grows container, edit re-centers.

Alternatives: TipTap full editor (rejected: heavy, keep textarea + measured wrap); full A* elbow (rejected now: implement axis snap + avoid, iterate).

## Risks / Trade-offs

- [Ink perf with long strokes] → cap points, simplify, `scheduleNotify` coalesce.
- [Metric mismatch editor vs canvas] → single `measureText` util shared by editor sizing and commit.
- [Old boards lack new fields] → defaults in `normalizeDoc` (`autoSize:true`, `pressures:[]`, bindings keep `anchor:auto` compat).
- [Elbow weird routes] → fallback to straight when avoidance fails.

## Migration Plan

Defaults fill new fields on load; no data loss. Rollback = revert change, new fields ignored by old code.

## Open Questions

None blocking specs/tasks.
