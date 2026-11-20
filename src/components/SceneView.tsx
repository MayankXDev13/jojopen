import type { BoardDoc, BoardElement, Point } from "../lib/model";
import { NodeView } from "./NodeView";
import { arrowGeom, arrowHead, elementBounds } from "../lib/geometry";
import { strokeOutlinePath } from "../lib/ink";
import { S, colorFor, fontFor, theme } from "../state/store";

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

export function SceneView({
  doc,
  elements,
  ox = 0,
  oy = 0,
  width,
  height,
  scale,
  hidden,
  showSlides = false,
}: {
  doc?: BoardDoc;
  elements: BoardElement[];
  ox?: number;
  oy?: number;
  width: number;
  height: number;
  scale: number;
  hidden?: Set<string>;
  showSlides?: boolean;
}) {
  const activeDoc = doc || S.doc;
  const th = theme(activeDoc);
  const visible = elements.filter((el) => !hidden?.has(el.id));
  const slideNodes = showSlides
    ? visible
        .filter((el) => el.type === "slide")
        .sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id < b.id ? -1 : 1),
        )
    : [];
  const edges = visible.filter(
    (el) => el.type === "arrow" || el.type === "freehand",
  );
  const nodes = visible.filter(
    (el) => el.type !== "arrow" && el.type !== "slide" && el.type !== "freehand",
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
      {slideNodes.map((el, i) => (
        <NodeView
          key={el.id}
          el={el}
          doc={activeDoc}
          ox={ox}
          oy={oy}
          slideNumber={i + 1}
          thumb
        />
      ))}
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
              const paint = colorFor(el, activeDoc);
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
              if (inkPts.length === 1) {
                return (
                  <circle
                    key={el.id}
                    cx={inkPts[0].x}
                    cy={inkPts[0].y}
                    r={Math.max(1, (el.strokeWidth || 2) * 0.75)}
                    fill={paint.stroke}
                  />
                );
              }
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
                  activeDoc.elements[id] as BoardElement | undefined,
                th,
                obstaclesForArrow(el, visible),
              );
              const paint = colorFor(el, activeDoc);
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
                        const font = fontFor(el, activeDoc);
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
                              rx={6}
                              fill={th.slide || th.labelPill || th.board}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={paint.stroke || th.muted}
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
        <NodeView key={el.id} el={el} doc={activeDoc} ox={ox} oy={oy} thumb />
      ))}
    </div>
  );
}
