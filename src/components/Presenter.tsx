import { useEffect, useRef } from 'react';
import { SLIDE_H, SLIDE_W } from '../lib/model';
import { S, notify, slideChildren, slides, theme } from '../state/store';
import { exitPresent, presentNav } from '../state/actions';
import { Icon } from './Icon';
import { SceneView } from './SceneView';
import { useViewport } from './useViewport';

export function Presenter() {
  const { w: vw, h: vh } = useViewport();
  const laserRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<{ x: number; y: number; t: number; life: number }[]>([]);
  const raf = useRef<number | null>(null);
  const p = S.present;
  const list = slides();
  const sl = p ? list[p.index] : null;

  useEffect(() => {
    const c = laserRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
    c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [p?.laser]);

  useEffect(() => {
    if (!p?.laser) return;
    const draw = () => {
      const c = laserRef.current;
      if (!c) {
        raf.current = null;
        return;
      }
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const now = performance.now();
      const pts = points.current;
      for (let i = pts.length - 1; i >= 0; i--) if (now - pts[i].t > pts[i].life) pts.splice(i, 1);
      for (const pt of pts) {
        const k = 1 - (now - pt.t) / pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8 * k + 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,86,86,${0.55 * k})`;
        ctx.fill();
      }
      raf.current = pts.length ? requestAnimationFrame(draw) : null;
    };
    const onMove = (e: PointerEvent) => {
      points.current.push({ x: e.clientX, y: e.clientY, t: performance.now(), life: 650 });
      if (points.current.length > 90) points.current.shift();
      if (!raf.current) raf.current = requestAnimationFrame(draw);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      points.current = [];
    };
  }, [p?.laser]);

  if (!p || !sl) return null;

  const scale = Math.min((vw - 96) / SLIDE_W, (vh - 120) / SLIDE_H);
  const w = SLIDE_W * scale;
  const h = SLIDE_H * scale;
  const left = (vw - w) / 2;
  const top = (vh - h) / 2;
  const builds = sl.builds || [];
  const hidden = new Set(builds.slice(p.steps));
  const total = list.length;

  return (
    <div
      className={`present${p.chrome ? ' show' : ' hidecursor'}`}
      id="present"
      role="dialog"
      aria-label={`Presenting slide ${p.index + 1} of ${total}`}
    >
      <div
        className="present-stage"
        style={{ left, top, width: w, height: h, background: theme().slide }}
      >
        <SceneView
          elements={slideChildren(sl)}
          ox={sl.x}
          oy={sl.y}
          width={SLIDE_W}
          height={SLIDE_H}
          scale={scale}
          hidden={hidden}
        />
      </div>
      <div className="present-progress">
        <i style={{ width: ((p.index + 1) / total) * 100 + '%' }} />
      </div>
      <div className="present-bar">
        <button onClick={() => presentNav(-1)} title="Previous" disabled={p.index === 0 && !p.steps}>
          <Icon name="prev" size={16} />
        </button>
        <span className="present-count">
          {p.index + 1} / {total}
        </span>
        <button onClick={() => presentNav(1)} title="Next">
          <Icon name="next" size={16} />
        </button>
        <span className="present-sep" />
        <button
          onClick={() => {
            p.laser = !p.laser;
            notify();
          }}
          title="Laser pointer (L)"
          style={p.laser ? { background: 'rgba(255,255,255,.18)' } : undefined}
        >
          <Icon name="laser" size={16} />
        </button>
        <button onClick={exitPresent} title="Exit (Esc)">
          <Icon name="close" size={16} />
        </button>
      </div>
      <canvas className="laser" id="presentLaserCanvas" ref={laserRef} />
      <div style={{ position: 'absolute', right: 18, bottom: 22, color: 'rgba(255,255,255,.45)', fontSize: 11 }}>
        {p.steps ? `build ${p.steps}/${builds.length}` : ''}
      </div>
    </div>
  );
}
