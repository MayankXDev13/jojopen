import type { BoardElement } from "../lib/model";
import { arrowGeom, arrowHandlesFor, arrowHead } from "../lib/geometry";
import { strokeOutlinePath } from "../lib/ink";
import { S, colorFor, sortedElements, theme } from "../state/store";
import { useVersion } from "../state/boardStore";

export function Edges() {
  useVersion();
  const th = theme();
  const list = sortedElements();
  return (
    <svg className="edges" width="10" height="10">
      <defs>
        <filter id="roughEdge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="5"
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" />
        </filter>
      </defs>
      {list.map((el) => {
        if (el.type === "freehand") {
          const paint = colorFor(el);
          const inkPts = (el.points || []).map((p, i) => ({
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
        const labelW = Math.max(28, (el.label || "").length * 6.4 + 14);
        return (
          <g key={el.id}>
            <path
              d={geom.d}
              fill="none"
              stroke={paint.stroke}
              strokeWidth={el.dash === "thick" ? 2.6 : 1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash}
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
            {el.label ? (
              <g data-id={el.id} data-label="1">
                <rect
                  x={geom.labelPoint.x - labelW / 2}
                  y={geom.labelPoint.y - 10}
                  width={labelW}
                  height={20}
                  rx={5}
                  fill={th.labelPill}
                  stroke={th.slideEdge}
                  strokeWidth={0.8}
                />
                <text
                  x={geom.labelPoint.x}
                  y={geom.labelPoint.y + 4}
                  textAnchor="middle"
                  fontFamily="Inter,system-ui,sans-serif"
                  fontSize={11}
                  fill={th.muted}
                >
                  {el.label}
                </text>
              </g>
            ) : null}
            {S.selection.has(el.id)
              ? (() => {
                  const linePts = geom.pts
                    .map((p) => `${p.x},${p.y}`)
                    .join(" ");
                  const handles = arrowHandlesFor(
                    geom.pts,
                    el.routeMode,
                    el.route,
                    S.camera.zoom,
                  );
                  return (
                    <g data-id={el.id}>
                      {/* Raw polyline underlay (original line), like the original board. */}
                      <polyline
                        points={linePts}
                        fill="none"
                        stroke={th.arrow}
                        strokeWidth={1}
                        strokeOpacity={0.5}
                        strokeDasharray="4 4"
                        data-id={el.id}
                      />
                      {[geom.p0, geom.p1].map((p, i) => (
                        <circle
                          key={`e${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={5.5}
                          fill="#4d7cfe"
                          stroke="#fff"
                          strokeWidth={1.75}
                          data-id={el.id}
                          data-handle={`endpoint:${i === 0 ? 0 : geom.pts.length - 1}`}
                        />
                      ))}
                      {handles.map((h, i) => {
                        const key = `${h.kind}${i}`;
                        if (h.kind === "segment") {
                          const w = h.axis === "h" ? 16 : 6;
                          const ht = h.axis === "h" ? 6 : 16;
                          return (
                            <rect
                              key={key}
                              x={h.point.x - w / 2}
                              y={h.point.y - ht / 2}
                              width={w}
                              height={ht}
                              rx={3}
                              fill="#4d7cfe"
                              stroke="#fff"
                              strokeWidth={1.5}
                              data-id={el.id}
                              data-handle={`segment:${h.index}:${h.axis}`}
                            />
                          );
                        }
                        if (h.kind === "insert") {
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
                                r={5}
                                fill="#fff"
                                stroke="#4d7cfe"
                                strokeWidth={1.25}
                                strokeDasharray="2 2"
                              />
                              <path
                                d={`M${h.point.x - 2.5} ${h.point.y}H${h.point.x + 2.5}M${h.point.x} ${h.point.y - 2.5}V${h.point.y + 2.5}`}
                                stroke="#4d7cfe"
                                strokeWidth={1.25}
                              />
                            </g>
                          );
                        }
                        return (
                          <circle
                            key={key}
                            cx={h.point.x}
                            cy={h.point.y}
                            r={5}
                            fill="#4d7cfe"
                            stroke="#fff"
                            strokeWidth={1.75}
                            data-id={el.id}
                            data-handle={`waypoint:${h.index}`}
                          />
                        );
                      })}
                    </g>
                  );
                })()
              : null}
          </g>
        );
      })}
    </svg>
  );
}
