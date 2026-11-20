import type { BoardElement, Point } from "../lib/model";
import {
  arrowGeom,
  arrowHandlesFor,
  arrowHead,
  elementBounds,
} from "../lib/geometry";
import { strokeOutlinePath } from "../lib/ink";
import {
  S,
  colorFor,
  fontFor,
  selectionElements,
  sortedElements,
  theme,
} from "../state/store";
import { useVersion } from "../state/boardStore";

function obstaclesForArrow(el: BoardElement, all: BoardElement[]) {
  const sId = el.start?.elementId;
  const tId = el.end?.elementId;
  return all
    .filter(
      (o) =>
        o.id !== el.id &&
        o.id !== sId &&
        o.id !== tId &&
        (o.type === "shape" || o.type === "sticky" || o.type === "image"),
    )
    .map(elementBounds);
}

export function Edges() {
  useVersion();
  const th = theme();
  const list = sortedElements();
  return (
    <svg className="edges" width="10" height="10">
      {list.map((el) => {
        if (el.type === "freehand") {
          const paint = colorFor(el);
          const inkPts = (el.points || [])
            .filter(
              (p): p is Point =>
                !!p && typeof p.x === "number" && typeof p.y === "number",
            )
            .map((p, i) => ({
              x: el.x + p.x,
              y: el.y + p.y,
              pressure: (el.pressures || [])[i] ?? 0.5,
            }));
          const d = strokeOutlinePath(
            inkPts,
            (el.strokeWidth || 2) * 2.2,
            0.55,
          );
          const linePts = inkPts.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <g key={el.id}>
              {d ? (
                <path d={d} fill={paint.stroke} opacity={1} data-id={el.id} />
              ) : (
                <polyline
                  points={linePts}
                  fill="none"
                  stroke={paint.stroke}
                  strokeWidth={el.strokeWidth || 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  data-id={el.id}
                />
              )}
              <polyline
                points={linePts}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                className="hit"
                data-id={el.id}
              />
              {/* Original shows no handles on freehand: plain bbox selection only. */}
            </g>
          );
        }
        if (el.type !== "arrow") return null;
        const geom = arrowGeom(
          el,
          (id) => S.doc.elements[id] as BoardElement | undefined,
          th,
          obstaclesForArrow(el, list),
        );
        const paint = colorFor(el);
        const dash =
          el.kind === "async"
            ? "7 5"
            : el.kind === "optional"
              ? "2 5"
              : el.dash === "dashed"
                ? "7 5"
                : el.dash === "dotted"
                  ? "2 5"
                  : undefined;
        const strokeWidth = el.dash === "thick" ? 2.6 : 1.7;
        const hasLabel = !!(el.label && S.editingId !== el.id);
        const font = fontFor(el);
        const fontSize = 14 * (el.textScale ?? 1);
        const padX = 8;
        const padY = 4;
        const charW = fontSize * 0.58;
        const pillW = Math.max(
          28,
          (el.label?.length || 0) * charW + padX * 2,
        );
        const pillH = fontSize + padY * 2;
        const maskId = hasLabel ? `label-mask-${el.id}` : undefined;

        return (
          <g key={el.id}>
            {hasLabel ? (
              <defs>
                <mask id={maskId}>
                  <rect
                    x="-50000"
                    y="-50000"
                    width="100000"
                    height="100000"
                    fill="white"
                  />
                  <rect
                    x={geom.labelPoint.x - pillW / 2}
                    y={geom.labelPoint.y - pillH / 2}
                    width={pillW}
                    height={pillH}
                    rx={4}
                    fill="black"
                  />
                </mask>
              </defs>
            ) : null}
            <path
              d={geom.d}
              fill="none"
              stroke={paint.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash}
              mask={maskId ? `url(#${maskId})` : undefined}
              data-id={el.id}
            />
            {el.endHead !== "none" && el.kind !== "line" ? (
              <g
                dangerouslySetInnerHTML={{
                  __html: arrowHead(geom, "end", paint.stroke),
                }}
              />
            ) : null}
            {(el.startHead && el.startHead !== "none") ||
            el.kind === "bidirectional" ? (
              <g
                dangerouslySetInnerHTML={{
                  __html: arrowHead(geom, "start", paint.stroke),
                }}
              />
            ) : null}
            <path
              d={geom.d}
              fill="none"
              stroke="transparent"
              strokeWidth={18}
              className="hit"
              data-id={el.id}
            />
            {hasLabel ? (
              <g data-id={el.id} data-label="1" cursor="move">
                <rect
                  x={geom.labelPoint.x - pillW / 2}
                  y={geom.labelPoint.y - pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={6}
                  fill="transparent"
                />
                <text
                  x={geom.labelPoint.x}
                  y={geom.labelPoint.y}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontFamily={font}
                  fontSize={fontSize}
                  fill={paint.stroke || th.muted}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {el.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function ArrowHandles() {
  useVersion();
  const th = theme();
  const selectedArrows = selectionElements().filter((e) => e.type === "arrow");
  if (!selectedArrows.length) return null;
  const z = S.camera.zoom || 1;
  const selColor = "#7c93ff";
  const handleFill = "var(--bg, #1a1a1a)";

  const all = sortedElements();
  return (
    <svg className="arrow-handles" width="10" height="10">
      {selectedArrows.map((el) => {
        const geom = arrowGeom(
          el,
          (id) => S.doc.elements[id] as BoardElement | undefined,
          th,
          obstaclesForArrow(el, all),
        );
        const handles = arrowHandlesFor(
          geom.pts,
          el.routeMode,
          el.route,
          S.camera.zoom,
        );
        return (
          <g key={el.id} data-id={el.id}>
            {[geom.p0, geom.p1].map((p, i) => {
              const ptIndex =
                i === 0 ? 0 : Math.max(1, (el.points?.length || 2) - 1);
              return (
                <circle
                  key={`e${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={6 / z}
                  fill={handleFill}
                  stroke={selColor}
                  strokeWidth={1.8 / z}
                  data-id={el.id}
                  data-handle={`endpoint:${ptIndex}`}
                />
              );
            })}
            {handles.map((h, i) => {
              const key = `${h.kind}${i}`;
              if (h.kind === "segment") {
                const w = (h.axis === "h" ? 16 : 6) / z;
                const ht = (h.axis === "h" ? 6 : 16) / z;
                return (
                  <rect
                    key={key}
                    x={h.point.x - w / 2}
                    y={h.point.y - ht / 2}
                    width={w}
                    height={ht}
                    rx={3 / z}
                    fill={handleFill}
                    stroke={selColor}
                    strokeWidth={1.5 / z}
                    data-id={el.id}
                    data-handle={`segment:${h.index}:${h.axis}`}
                  />
                );
              }
              if (h.kind === "insert") {
                if (S.editingId === el.id || el.label) return null;
                const r = 5 / z;
                const arm = 2.5 / z;
                const sw = 1.25 / z;
                return (
                  <g
                    key={key}
                    opacity={0.75}
                    data-id={el.id}
                    data-handle={`insert:${h.index}`}
                  >
                    <circle
                      cx={h.point.x}
                      cy={h.point.y}
                      r={r}
                      fill={handleFill}
                      stroke={selColor}
                      strokeWidth={sw}
                      strokeDasharray={`${2 / z} ${2 / z}`}
                    />
                    <path
                      d={`M${h.point.x - arm} ${h.point.y}H${h.point.x + arm}M${h.point.x} ${h.point.y - arm}V${h.point.y + arm}`}
                      stroke={selColor}
                      strokeWidth={sw}
                    />
                  </g>
                );
              }
              return (
                <circle
                  key={key}
                  cx={h.point.x}
                  cy={h.point.y}
                  r={5 / z}
                  fill={handleFill}
                  stroke={selColor}
                  strokeWidth={1.75 / z}
                  data-id={el.id}
                  data-handle={`waypoint:${h.index}`}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
