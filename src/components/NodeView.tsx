import { useMemo } from "react";
import type { BoardDoc, BoardElement } from "../lib/model";
import { shapeMarkup } from "../lib/diagram";
import { edgeIconPos, edgeIconSize, resolveIcon } from "../lib/iconLibrary";
import { S, colorFor, diagram, fontFor, settings } from "../state/store";
import { Icon, LibraryIcon } from "./Icon";
import { useEditingId, useVersion } from "../state/boardStore";
import { beginEdit, renameSlide } from "../state/actions";

const roughDefs = `<defs><filter id="rough" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.021" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter></defs>`;

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
  const filter = settings().style === "clean" ? "" : "url(#rough)";
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
    const esize = edgeIconSize(clean);
    const epos = edgeIconPos(esize);
    const maskId = `edge-${el.id}`;
    const maskDef = edge
      ? `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="-40" y="${-40 - esize}" width="${el.width + 80}" height="${el.height + 80 + esize}"><rect x="-40" y="${-40 - esize}" width="${el.width + 80}" height="${el.height + 80 + esize}" fill="#fff"/><rect x="${epos.x - epos.gap}" y="${-esize}" width="${esize + epos.gap * 2}" height="${esize * 2}" fill="#000"/></mask>`
      : "";
    const shapeStr = shapeMarkup(
      el.shape,
      el.width,
      el.height,
      el.noFill ? "none" : c.fill,
      c.stroke,
      filter,
    );
    body = (
      <>
        <div className="sh">
          <svg
            viewBox={`0 0 ${el.width} ${el.height}`}
            preserveAspectRatio="none"
            dangerouslySetInnerHTML={{
              __html:
                roughDefs +
                maskDef +
                (edge ? `<g mask="url(#${maskId})">${shapeStr}</g>` : shapeStr),
            }}
          />
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
            color: el.noFill ? c.stroke : c.text,
            fontFamily: fontFor(el),
            fontSize: 14 * (el.textScale ?? 1),
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
    body = (
      <>
        <div className="frame" />
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
