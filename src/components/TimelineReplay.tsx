import { clamp } from '../lib/dom';
import { boundsOf } from '../lib/geometry';
import { normalizeDoc, type BoardElement } from '../lib/model';
import { S, notify, theme } from '../state/store';
import { closeReplay, replayStep, replayToggle } from '../state/replay';
import { Icon } from './Icon';
import { SceneView } from './SceneView';
import { useViewport } from './useViewport';

const elementsOf = (doc: any): BoardElement[] =>
  (Object.values(doc.elements) as BoardElement[]).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));

function parseEntry(json: string) {
  try {
    const doc = normalizeDoc({ ...JSON.parse(json), id: S.doc.id });
    const list = elementsOf(doc);
    const b = boundsOf(list);
    if (!doc || !b) return null;
    return { doc, b, sw: Math.max(320, b.width), sh: Math.max(200, b.height) };
  } catch {
    return null;
  }
}

export function TimelineReplay() {
  const { w: vw, h: vh } = useViewport();
  const r = S.replay;
  if (!r) return null;
  const entry = r.list[r.index];
  if (!entry) return null;
  const parsed = parseEntry(entry.json);
  const sw = parsed?.sw ?? 900;
  const sh = parsed?.sh ?? 600;
  const scale = Math.min((vw - 140) / (sw + 80), (vh - 240) / (sh + 80), 1.4);

  return (
    <div id="replayRoot">
      <div className="replay" role="dialog" aria-label="Sands of Time replay">
        <div className="replay-bar" style={{ marginBottom: 2 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Sands of Time</span>
          <span className="replay-label">{entry.label || 'Edit'}</span>
        </div>
        <div
          className="scene-wrap"
          style={{
            width: (sw + 80) * scale,
            height: (sh + 80) * scale,
            background: theme().board,
          }}
        >
          {parsed ? (
            <SceneView
              doc={parsed.doc}
              elements={elementsOf(parsed.doc)}
              ox={parsed.b.minX - 40}
              oy={parsed.b.minY - 40}
              width={sw + 80}
              height={sh + 80}
              scale={scale}
            />
          ) : null}
        </div>
        <div className="replay-bar">
          <button onClick={() => replayStep(-1)} title="Previous step">
            <Icon name="prev" size={16} />
          </button>
          <button onClick={replayToggle} title="Play">
            <Icon name={r.playing ? 'pause' : 'play'} size={16} />
          </button>
          <button onClick={() => replayStep(1)} title="Next step">
            <Icon name="next" size={16} />
          </button>
          <div
            className="replay-track"
            id="replayTrack"
            onClick={(e) => {
              const rc = e.currentTarget.getBoundingClientRect();
              const ratio = clamp((e.clientX - rc.left) / rc.width, 0, 1);
              if (!S.replay) return;
              S.replay.index = Math.round(ratio * (S.replay.list.length - 1));
              notify();
            }}
          >
            <i style={{ width: ((r.index + 1) / r.list.length) * 100 + '%' }} />
          </div>
          <span className="replay-label">
            {r.index + 1} / {r.list.length}
          </span>
          <button onClick={closeReplay} title="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
