import { useMemo } from "react";
import type { BoardDoc, BoardElement } from "../lib/model";
import { edgeIconPos, edgeIconSize, resolveIcon } from "../lib/iconLibrary";
import {
  cylinderSecondaryPath,
  getRoughFillPath,
  getRoughPaths,
  roughnessForStyle,
  seedFromId,
  shapePath,
} from "../lib/sketch";
import { S, colorFor, diagram, fontFor, settings } from "../state/store";
import { Icon, LibraryIcon } from "./Icon";
import { useEditingId, useVersion } from "../state/boardStore";
import { beginEdit, renameSlide } from "../state/actions";

export type NodeViewProps = {
  el: BoardElement;
  doc?: BoardDoc;
  selected?: boolean;
  thumb?: boolean;
  ox?: number;
  oy?: number;
  slideNumber?: number;
};

export function NodeView({
  el,
  doc,
  selected,
  thumb,
  ox = 0,
  oy = 0,
  slideNumber,
}: NodeViewProps) {
  useVersion();
  const editingId = useEditingId();
  const c = colorFor(el);
  const files = doc?.files || S.doc.files;

  const diagramRender = useMemo(
    () => (el.type === "diagram" ? diagram(el.dsl || "") : null),
    [el.type, el.dsl, settings().style, settings().palette, S.themePref],
  );

  const style: React.CSSProperties = {
    left: el.x - ox,
    top: el.y - oy,
    width: Math.max(0, el.width),
    height: Math.max(0, el.height),
    transform: el.angle ? `rotate(${el.angle}deg)` : undefined,
  };
  if (thumb) style.pointerEvents = "none";

  let body: React.ReactNode = null;
  if (el.type === "shape") {
    const lib = el.icon ? resolveIcon(el.icon) : undefined;
    const edge = !!el.icon && !!el.iconEdge && !!lib;
    const clean = settings().style === "clean";
    const roughness = roughnessForStyle(settings().style);
    const esize = edgeIconSize(clean);
    const epos = edgeIconPos(esize);
    const maskId = `edge-${el.id}`;
    const p = shapePath(el.shape, el.width, el.height);
    const secP = cylinderSecondaryPath(el.shape, el.width, el.height);
    const seed = seedFromId(el.id);
    const fillPath =
      !el.noFill &&
      (settings().style === "sketch"
        ? getRoughFillPath(el.id, p, seed, roughness)
        : p);
    const strokeWidth = clean
      ? 1.5
      : settings().style === "chalkboard"
        ? 2.2
        : 1.8;
    const roughStrokes =
      roughness > 0
        ? getRoughPaths(el.id, p, {
            stroke: c.stroke,
            strokeWidth,
            roughness,
          })
        : null;
    const secRoughStrokes =
      secP && roughness > 0
        ? getRoughPaths(`${el.id}:d`, secP, {
            stroke: c.stroke,
            strokeWidth,
            roughness,
          })
        : null;

    body = (
      <>
        <div className="sh">
          <svg
            viewBox={`0 0 ${el.width} ${el.height}`}
            style={{
              width: "100%",
              height: "100%",
              overflow: "visible",
              display: "block",
            }}
            aria-hidden="true"
          >
            {edge && (
              <defs>
                <mask
                  id={maskId}
                  maskUnits="userSpaceOnUse"
                  x={-40}
                  y={-40 - esize}
                  width={el.width + 80}
                  height={el.height + 80 + esize}
                >
                  <rect
                    x={-40}
                    y={-40 - esize}
                    width={el.width + 80}
                    height={el.height + 80 + esize}
                    fill="#fff"
                  />
                  <rect
                    x={epos.x - epos.gap}
                    y={-esize}
                    width={esize + epos.gap * 2}
                    height={esize * 2}
                    fill="#000"
                  />
                </mask>
              </defs>
            )}
            {fillPath && <path d={fillPath} fill={c.fill} stroke="none" />}
            <g mask={edge ? `url(#${maskId})` : undefined}>
              {roughStrokes ? (
                roughStrokes.map((pt, i) => (
                  <path
                    key={i}
                    d={pt.d}
                    fill="none"
                    stroke={pt.stroke || c.stroke}
                    strokeWidth={pt.strokeWidth || strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))
              ) : (
                <path
                  d={p}
                  fill="none"
                  stroke={c.stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {secRoughStrokes ? (
                secRoughStrokes.map((pt, i) => (
                  <path
                    key={`s-${i}`}
                    d={pt.d}
                    fill="none"
                    stroke={pt.stroke || c.stroke}
                    strokeWidth={pt.strokeWidth || strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))
              ) : secP ? (
                <path
                  d={secP}
                  fill="none"
                  stroke={c.stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </g>
          </svg>
        </div>
        {edge ? (
          <span
            className="iconedge"
            style={{
              left: epos.x,
              top: epos.y,
              width: esize,
              height: esize,
              color: c.stroke,
            }}
          >
            <LibraryIcon name={el.icon!} size={esize} color={c.stroke} />
          </span>
        ) : null}
        <div
          className="lbl"
          style={{
            position: "absolute",
            inset:
              el.shape === "cylinder"
                ? `${Math.min(14, el.height / 6) * 1.6}px 0 0 0`
                : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: el.noFill ? c.stroke : c.text,
            fontFamily: fontFor(el),
            fontSize: 14 * (el.textScale ?? 1),
            padding: "0 12px",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {!edge && el.icon ? (
            <span className="icon">
              {lib ? (
                <LibraryIcon name={el.icon} size={17} />
              ) : (
                <Icon name={el.icon} size={17} />
              )}
            </span>
          ) : null}
          <span>{el.label}</span>
        </div>
      </>
    );
  } else if (el.type === "text") {
    body = (
      <div
        className={`lbl ${el.align === "center" ? "center" : ""}`}
        style={{
          fontSize: el.fontSize,
          color: c.text,
          fontFamily: fontFor(el),
        }}
      >
        {el.text}
      </div>
    );
  } else if (el.type === "sticky") {
    const w = Math.max(0, el.width);
    const h = Math.max(0, el.height);
    const fold = Math.min(26, Math.max(0, Math.min(w, h) / 2));
    const stripH = Math.min(24, h);
    const flapInset = Math.max(0, fold - 2);

    const stickyFill =
      el.colorLocked && el.color
        ? el.color.startsWith("#")
          ? el.color
          : c.fill
        : c.fill;
    const stickyFold = c.stroke || "#c8ac3f";
    const stickyInk = c.text;

    body = (
      <>
        <svg
          width={w}
          height={h}
          aria-hidden="true"
          style={{ display: "block", overflow: "visible" }}
        >
          <path
            d={`M0 0 H${w} V${h - fold} L${w - fold} ${h} H0 Z`}
            fill={stickyFill}
          />
          <path d={`M0 0 H${w} V${stripH} H0 Z`} fill="rgba(0,0,0,0.05)" />
          <path
            d={`M${w - fold} ${h} L${w} ${h - fold} L${w - flapInset} ${h - flapInset} Z`}
            fill={stickyFold}
          />
        </svg>
        <div
          className="lbl"
          style={{
            position: "absolute",
            inset: 0,
            padding: "18px 16px 16px",
            color: stickyInk,
            fontFamily: fontFor(el),
            fontSize: 19 * (el.textScale ?? 1),
            lineHeight: 1.3,
            textAlign: (el.align as any) || "left",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {editingId === el.id ? null : el.text}
        </div>
      </>
    );
  } else if (el.type === "image") {
    body = <img src={files[el.fileId || ""] || ""} alt="" />;
  } else if (el.type === "container") {
    const p = shapePath("container", el.width, el.height);
    const roughness = roughnessForStyle(settings().style);
    const containerStroke = `color-mix(in srgb, ${c.stroke} 55%, transparent)`;
    const containerFill = `color-mix(in srgb, ${c.stroke} ${settings().style === "chalkboard" ? 4 : 6}%, transparent)`;
    body = (
      <>
        <div className="sh">
          <svg
            viewBox={`0 0 ${el.width} ${el.height}`}
            style={{
              width: "100%",
              height: "100%",
              overflow: "visible",
              display: "block",
            }}
            aria-hidden="true"
          >
            <path d={p} fill={containerFill} stroke="none" />
            {roughness === 0 ? (
              <path
                d={p}
                fill="none"
                stroke={containerStroke}
                strokeWidth={1.5}
                strokeDasharray="6 5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : (
              getRoughPaths(el.id, p, {
                stroke: containerStroke,
                strokeWidth: 1.5,
                roughness,
                dashed: true,
              }).map((pt, i) => (
                <path
                  key={i}
                  d={pt.d}
                  fill="none"
                  stroke={pt.stroke || containerStroke}
                  strokeWidth={pt.strokeWidth || 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))
            )}
          </svg>
        </div>
        <div className="clabel">{el.label}</div>
      </>
    );
  } else if (el.type === "slide") {
    body = (
      <div
        className="badge"
        onDoubleClick={(e) => {
          e.stopPropagation();
          beginEdit(el.id);
        }}
      >
        <Icon name="slides" size={14} />
        {editingId === el.id ? (
          <input
            className="slide-title-inline"
            autoFocus
            defaultValue={el.title || "Untitled slide"}
            onBlur={(e) => {
              renameSlide(el.id, e.target.value);
              beginEdit("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                renameSlide(el.id, (e.target as HTMLInputElement).value);
                beginEdit("");
              }
              if (e.key === "Escape") {
                beginEdit("");
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span>{el.title || "Untitled slide"}</span>
        )}
      </div>
    );
  } else if (el.type === "diagram" && diagramRender) {
    body = <div dangerouslySetInnerHTML={{ __html: diagramRender.svg }} />;
  }

  const errors =
    diagramRender?.parsed.diagnostics.filter((d) => d.severity === "error") ||
    [];

  return (
    <div
      className={`node ${el.type}${selected ? " selected" : ""}`}
      data-id={el.id}
      data-locked={el.locked ? "1" : undefined}
      style={style}
      title={
        errors.length
          ? errors.map((d) => `line ${d.line}: ${d.message}`).join("\n")
          : undefined
      }
    >
      {body}
      {el.locked ? (
        <span className="lockmark">
          <Icon name="lock" size={10} />
        </span>
      ) : null}
    </div>
  );
}
