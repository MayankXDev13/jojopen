import type { BoardDoc, BoardElement, Point } from "../lib/model";
import { NodeView } from "./NodeView";
import { arrowGeom, arrowHead } from "../lib/geometry";
import { strokeOutlinePath } from "../lib/ink";
import { S, colorFor, fontFor, theme } from "../state/store";

export function SceneView({
  doc,
  elements,
  ox = 0,
  oy = 0,
  width,
  height,
  scale,
  hidden,
}: {
  doc?: BoardDoc;
  elements: BoardElement[];
  ox?: number;
  oy?: number;
  width: number;
  height: number;
  scale: number;
  hidden?: Set<string>;
}) {
  const th = theme();
  const visible = elements.filter((el) => !hidden?.has(el.id));
  const edges = visible.filter(
    (el) => el.type === "arrow" || el.type === "freehand",
  );
  const nodes = visible.filter(
    (el) => el.type !== "arrow" && el.type !== "slide",
  );

  return (
    <div
      className="scene"
      style={{
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
        position: "absolute",
        left: 0,
        top: 0,
        overflow: "hidden",
      }}
    >
      <svg
        className="scene-edges"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <g transform={`translate(${-ox}, ${-oy})`}>
          {edges.map((el) => {
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
                    <path d={d} fill={paint.stroke} opacity={1} />
                  ) : (
                    <polyline
                      points={linePts}
                      fill="none"
                      stroke={paint.stroke}
                      strokeWidth={el.strokeWidth || 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            }
            if (el.type === "arrow") {
              const geom = arrowGeom(
                el,
                (id) =>
                  (doc?.elements || S.doc.elements)[id] as
                    BoardElement | undefined,
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
                  {el.label
                    ? (() => {
                        const font = fontFor(el);
                        const fontSize = 14 * (el.textScale ?? 1);
                        const padX = 8;
                        const padY = 4;
                        const charW = fontSize * 0.58;
                        const pillW = Math.max(
                          28,
                          el.label.length * charW + padX * 2,
                        );
                        const pillH = fontSize + padY * 2;
                        return (
                          <g
                            transform={`translate(${geom.labelPoint.x},${geom.labelPoint.y})`}
                          >
                            <rect
                              x={-pillW / 2}
                              y={-pillH / 2}
                              width={pillW}
                              height={pillH}
                              rx={4}
                              fill={th.board}
                              stroke={paint.stroke}
                              strokeWidth={1}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={paint.stroke}
                              fontFamily={font}
                              fontSize={fontSize}
                            >
                              {el.label}
                            </text>
                          </g>
                        );
                      })()
                    : null}
                </g>
              );
            }
            return null;
          })}
        </g>
      </svg>
      {nodes.map((el) => (
        <NodeView key={el.id} el={el} doc={doc} ox={ox} oy={oy} thumb />
      ))}
    </div>
  );
}
