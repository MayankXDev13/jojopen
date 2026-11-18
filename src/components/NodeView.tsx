import { useMemo } from 'react';
import type { BoardDoc, BoardElement } from '../lib/model';
import { shapeMarkup } from '../lib/diagram';
import { edgeIconPos, edgeIconSize, resolveIcon } from '../lib/iconLibrary';
import { S, colorFor, diagram, fontFor, settings, theme } from '../state/store';
import { Icon, LibraryIcon } from './Icon';
import { useVersion } from '../state/boardStore';

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

export function NodeView({ el, doc, selected, thumb, ox = 0, oy = 0, slideNumber }: NodeViewProps) {
  useVersion();
  const th = theme();
  const c = colorFor(el);
  const filter = settings().style === 'clean' ? '' : 'url(#rough)';
  const files = doc?.files || S.doc.files;

  const diagramRender = useMemo(() => (el.type === 'diagram' ? diagram(el.dsl || '') : null), [el.type, el.dsl, settings().style, settings().palette, S.themePref]);

  const style: React.CSSProperties = {
    left: el.x - ox,
    top: el.y - oy,
    width: Math.max(0, el.width),
    height: Math.max(0, el.height),
    transform: el.angle ? `rotate(${el.angle}deg)` : undefined,
  };
  if (thumb) style.pointerEvents = 'none';

  let body: React.ReactNode = null;
  if (el.type === 'shape') {
    const lib = el.icon ? resolveIcon(el.icon) : undefined;
    const edge = !!el.icon && !!el.iconEdge && !!lib;
    const clean = settings().style === 'clean';
    const esize = edgeIconSize(clean);
    const epos = edgeIconPos(esize);
    const maskId = `edge-${el.id}`;
    const maskDef = edge
      ? `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="-40" y="${-40 - esize}" width="${el.width + 80}" height="${el.height + 80 + esize}"><rect x="-40" y="${-40 - esize}" width="${el.width + 80}" height="${el.height + 80 + esize}" fill="#fff"/><rect x="${epos.x - epos.gap}" y="${-esize}" width="${esize + epos.gap * 2}" height="${esize * 2}" fill="#000"/></mask>`
      : '';
    const shapeStr = shapeMarkup(el.shape, el.width, el.height, el.noFill ? 'none' : c.fill, c.stroke, filter);
    body = (
      <>
        <div className="sh">
          <svg viewBox={`0 0 ${el.width} ${el.height}`} preserveAspectRatio="none" dangerouslySetInnerHTML={{ __html: roughDefs + maskDef + (edge ? `<g mask="url(#${maskId})">${shapeStr}</g>` : shapeStr) }} />
        </div>
        {edge ? (
          <span className="iconedge" style={{ left: epos.x, top: epos.y, width: esize, height: esize, color: c.stroke }}>
            <LibraryIcon name={el.icon!} size={esize} color={c.stroke} />
          </span>
        ) : null}
        <div className="lbl" style={{ color: el.noFill ? c.stroke : c.text, fontFamily: fontFor(el), fontSize: 14 * (el.textScale ?? 1) }}>
          {!edge && el.icon ? (
            <span className="icon">
              {lib ? <LibraryIcon name={el.icon} size={17} /> : <Icon name={el.icon} size={17} />}
            </span>
          ) : null}
          <span>{el.label}</span>
        </div>
      </>
    );
  } else if (el.type === 'text') {
    body = (
      <div className={`lbl ${el.align === 'center' ? 'center' : ''}`} style={{ fontSize: el.fontSize, color: th.ink, fontFamily: fontFor(el) }}>
        {el.text}
      </div>
    );
  } else if (el.type === 'sticky') {
    body = (
      <div className="lbl" style={{ fontFamily: fontFor(el), fontSize: 16 * (el.textScale ?? 1) }}>
        {el.text}
      </div>
    );
  } else if (el.type === 'image') {
    body = <img src={files[el.fileId || ''] || ''} alt="" />;
  } else if (el.type === 'container') {
    body = (
      <>
        <div className="frame" />
        <div className="clabel">{el.label}</div>
      </>
    );
  } else if (el.type === 'slide') {
    body = (
      <div className="badge">
        <b>{slideNumber ?? 1}</b>
        {el.title || 'Slide'}
      </div>
    );
  } else if (el.type === 'diagram' && diagramRender) {
    body = <div dangerouslySetInnerHTML={{ __html: diagramRender.svg }} />;
  }

  const errors = diagramRender?.parsed.diagnostics.filter((d) => d.severity === 'error') || [];

  return (
    <div
      className={`node ${el.type}${selected ? ' selected' : ''}`}
      data-id={el.id}
      data-locked={el.locked ? '1' : undefined}
      style={style}
      title={errors.length ? errors.map((d) => `line ${d.line}: ${d.message}`).join('\n') : undefined}
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
