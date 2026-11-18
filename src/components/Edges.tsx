import type { BoardElement } from '../lib/model';
import { arrowGeom, arrowHead } from '../lib/geometry';
import { S, colorFor, sortedElements, theme } from '../state/store';
import { useVersion } from '../state/boardStore';

export function Edges() {
  useVersion();
  const th = theme();
  const list = sortedElements();
  return (
    <svg className="edges" width="10" height="10">
      <defs>
        <filter id="roughEdge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" />
        </filter>
      </defs>
      {list.map((el) => {
        if (el.type === 'freehand') {
          const pts = (el.points || []).map((p) => `${el.x + p.x},${el.y + p.y}`).join(' ');
          const paint = colorFor(el);
          return (
            <g key={el.id}>
              <polyline
                points={pts}
                fill="none"
                stroke={paint.stroke}
                strokeWidth={el.strokeWidth || 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={1}
                data-id={el.id}
              />
              <polyline
                points={pts}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                className="hit"
                data-id={el.id}
              />
            </g>
          );
        }
        if (el.type !== 'arrow') return null;
        const geom = arrowGeom(el, (id) => S.doc.elements[id] as BoardElement | undefined, th);
        const dash =
          el.kind === 'async' ? '7 5' : el.kind === 'optional' ? '2 5' : el.dash === 'dashed' ? '7 5' : el.dash === 'dotted' ? '2 5' : undefined;
        const labelW = Math.max(28, (el.label || '').length * 6.4 + 14);
        return (
          <g key={el.id}>
            <path
              d={geom.d}
              fill="none"
              stroke={th.arrow}
              strokeWidth={el.dash === 'thick' ? 2.6 : 1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash}
              data-id={el.id}
            />
            {el.endHead !== 'none' && el.kind !== 'line' ? (
              <g dangerouslySetInnerHTML={{ __html: arrowHead(geom, 'end', th.arrow) }} />
            ) : null}
            {(el.startHead && el.startHead !== 'none') || el.kind === 'bidirectional' ? (
              <g dangerouslySetInnerHTML={{ __html: arrowHead(geom, 'start', th.arrow) }} />
            ) : null}
            <path d={geom.d} fill="none" stroke="transparent" strokeWidth={18} className="hit" data-id={el.id} />
            {el.label ? (
              <g data-id={el.id}>
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
          </g>
        );
      })}
    </svg>
  );
}
