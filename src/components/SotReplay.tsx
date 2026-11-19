import { useEffect } from "react";
import { clamp } from "../lib/dom";
import type { BoardElement } from "../lib/model";
import {
  sotCanMp4,
  sotCycleSpeed,
  sotExport,
  sotFrameUnion,
  sotPlayToggle,
  sotReplayRec,
  sotSceneFrom,
  sotSetIndex,
} from "../state/sot";
import { S, notify } from "../state/store";
import { sotCloseReplay } from "../state/sot";
import { Icon } from "./Icon";
import { SceneView } from "./SceneView";
import { useViewport } from "./useViewport";

const elementsOf = (doc: any): BoardElement[] =>
  (Object.values(doc.elements) as BoardElement[]).sort(
    (a: any, b: any) => (a.index ?? 0) - (b.index ?? 0),
  );

export function SotReplay() {
  const { w: vw, h: vh } = useViewport();
  const rp = S.sot.replay;
  const rec = sotReplayRec();

  useEffect(() => {
    if (rp && !rec) sotCloseReplay();
  }, [rp, rec]);

  if (!rp || !rec) return null;

  const idx = clamp(rp.index, 0, rec.frames.length - 1);
  const last = rec.frames.length - 1;
  const frame = rec.frames[idx];
  if (!rp.union) rp.union = sotFrameUnion(rec);
  const scene = sotSceneFrom(frame.json, rp.union);
  const scale = Math.min((vw - 180) / scene.w, (vh - 220) / scene.h, 1.5);
  const w = scene.w * scale;
  const h = scene.h * scale;
  const label = idx === 0 ? "Start" : frame.label || "Edit";
  const canMp4 = sotCanMp4();

  return (
    <>
      <div id="sotDim" onClick={sotCloseReplay} />
      <div id="sotReplayRoot">
        <div
          className="sotreplay"
          role="dialog"
          aria-label="Sands of Time replay"
        >
          <div className="sottop">
            <span className="sottop-name">
              <Icon name="hourglass" size={12} /> {rec.name}
            </span>
            <span className="sotkey">
              <kbd>←</kbd>
              <kbd>→</kbd> step
            </span>
            <span className="sotkey">
              <kbd>Space</kbd> play
            </span>
            <span className="sotkey">
              <kbd>Esc</kbd> exit
            </span>
          </div>
          <div className="sotstage" style={{ width: w, height: h }}>
            <SceneView
              doc={scene.doc}
              elements={elementsOf(scene.doc)}
              ox={scene.union.minX - 40}
              oy={scene.union.minY - 40}
              width={scene.w}
              height={scene.h}
              scale={scale}
            />
          </div>
          <div className="sotbar">
            <button
              className="sotghost"
              onClick={() => sotSetIndex(idx - 1)}
              title="Previous step"
              disabled={idx === 0}
            >
              <Icon name="prev" size={15} />
            </button>
            <button
              className="sotplay"
              onClick={sotPlayToggle}
              title={rp.playing ? "Pause" : "Play"}
            >
              <Icon name={rp.playing ? "pause" : "play"} size={15} />
            </button>
            <button
              className="sotghost"
              onClick={() => sotSetIndex(idx + 1)}
              title="Next step"
              disabled={idx >= last}
            >
              <Icon name="next" size={15} />
            </button>
            <span className="sotpos">
              {idx}/{last}
            </span>
            <input
              className="sotrange"
              id="sotRange"
              type="range"
              min={0}
              max={last}
              value={idx}
              aria-label="Replay position"
              onChange={(e) => sotSetIndex(Number(e.target.value))}
            />
            <span className="sotlabel">{label}</span>
            <span className="sotsep" />
            <span className="sotexport">
              {rp.exporting
                ? `Exporting ${Math.round(rp.exporting * 100)}%`
                : ""}
            </span>
            <button
              className="sotghost"
              data-act="sotExportToggle"
              onClick={() => {
                rp.exportOpen = !rp.exportOpen;
                notify();
              }}
              aria-label="Export replay"
              title="Export as GIF or video"
              aria-expanded={rp.exportOpen}
            >
              <Icon name="download" size={15} />
            </button>
            {rp.exportOpen ? (
              <span className="sotexport-menu" role="menu">
                <button
                  role="menuitem"
                  data-act="sotExport"
                  data-kind="gif"
                  onClick={() => sotExport("gif")}
                >
                  <Icon name="image" size={15} />
                  <span>
                    <b>GIF</b>
                    <small>loops anywhere</small>
                  </span>
                </button>
                <button
                  role="menuitem"
                  data-act="sotExport"
                  data-kind="mp4"
                  onClick={() => sotExport("mp4")}
                  disabled={!canMp4}
                >
                  <Icon name="play" size={15} />
                  <span>
                    <b>MP4 video</b>
                    <small>
                      {canMp4
                        ? "for X, LinkedIn, YouTube"
                        : "not supported in this browser"}
                    </small>
                  </span>
                </button>
              </span>
            ) : null}
            <button
              className="sotspeed"
              onClick={sotCycleSpeed}
              title="Playback speed"
            >
              {rp.speed}×
            </button>
            <button
              className="sotghost"
              data-act="sotClose"
              onClick={sotCloseReplay}
              aria-label="Exit replay"
              title="Exit replay (Esc)"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
