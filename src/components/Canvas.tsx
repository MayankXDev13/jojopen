import { useEffect, useRef } from "react";
import { boundsOf, elementBounds } from "../lib/geometry";
import {
  S,
  selectionElements,
  settings,
  slides,
  sortedElements,
  theme,
  toWorld,
  zoomAt,
  scheduleNotify,
} from "../state/store";

import { placeImage } from "../state/actions";
import { useVersion } from "../state/boardStore";
import { ArrowHandles, Edges } from "./Edges";
import { NodeView } from "./NodeView";
import { TextEditor } from "./TextEditor";
import type { ToolContext } from "../tools/types";
import {
  createCanvasPointerEvent,
  resolveActiveTool,
} from "../tools/dispatcher";
import { SHAPE_TOOLS } from "../tools/ShapeToolController";
import { laserTool } from "../tools/LaserToolController";
import { arrowTool } from "../tools/ArrowToolController";
import { selectTool } from "../tools/SelectToolController";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function Canvas() {
  useVersion();
  const ref = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    laserTool.attachCanvas(laserRef.current);
    return () => {
      laserTool.clear();
      laserTool.attachCanvas(null);
    };
  }, []);

  const getToolContext = (): ToolContext => ({
    container: ref.current,
    toWorld,
    capturePointer: (id: number) => {
      try {
        (ref.current as HTMLElement | null)?.setPointerCapture?.(id);
      } catch {}
    },
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    if (S.present || S.replay || S.sot.replay) return;
    if (S.editingId) return;

    if (
      (S as any).suggestedBinding &&
      S.tool !== "arrow" &&
      S.tool !== "line"
    ) {
      (S as any).suggestedBinding = null;
    }

    const ce = createCanvasPointerEvent(e, toWorld);
    const ctx = getToolContext();

    const edgeEl = (e.target as Element)?.closest?.(
      ".edges [data-id], .arrow-handles [data-id]",
    );
    if (
      edgeEl &&
      (S.tool === "select" || S.tool === "arrow" || S.tool === "line")
    ) {
      if (arrowTool.onEdgeDown(ce, edgeEl, ctx)) {
        return;
      }
    }

    const tool = resolveActiveTool(ce);
    tool?.onPointerDown(ce, ctx);
  };

  const onPointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (S.replay || S.present) return;
    const ce = createCanvasPointerEvent(e, toWorld);
    const ctx = getToolContext();
    const tool = resolveActiveTool(ce);
    tool?.onPointerMove(ce, ctx);
  };

  const onPointerUp = (e: React.PointerEvent | PointerEvent) => {
    if (S.present || S.replay) return;
    const ce = createCanvasPointerEvent(e, toWorld);
    const ctx = getToolContext();
    const tool = resolveActiveTool(ce);
    tool?.onPointerUp(ce, ctx);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const ce = createCanvasPointerEvent(e as any, toWorld);
    const ctx = getToolContext();
    const tool = resolveActiveTool(ce);
    tool?.onDoubleClick?.(ce, ctx);
  };

  const startResize = (e: React.PointerEvent, handle: string) => {
    const ce = createCanvasPointerEvent(e, toWorld);
    const ctx = getToolContext();
    selectTool.startResize(ce, handle, ctx);
    const move = (ev: PointerEvent) => onPointerMove(ev);
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onPointerUp(ev);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      if (S.present || S.replay || S.sot.replay) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
      } else {
        S.camera.x -= e.deltaX;
        S.camera.y -= e.deltaY;
        scheduleNotify();
      }
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    const onContext = (e: MouseEvent) => e.preventDefault();
    c.addEventListener("contextmenu", onContext);
    return () => {
      c.removeEventListener("wheel", onWheel);
      c.removeEventListener("contextmenu", onContext);
    };
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () =>
        placeImage(String(fr.result), img.naturalWidth, img.naturalHeight);
      img.src = String(fr.result);
    };
    fr.readAsDataURL(f);
  };

  const th = theme();
  const g = settings();
  const toolClass = SHAPE_TOOLS.includes(S.tool) ? "shape" : S.tool;
  const panning = S.panning || S.drag?.mode === "pan";
  const list = selectionElements();
  const single = list.length === 1 ? list[0] : null;
  const isSingleArrow = single?.type === "arrow";
  const selBounds =
    S.editingId || isSingleArrow ? null : list.length ? boundsOf(list) : null;
  const resizable =
    !!single &&
    !single.locked &&
    !["arrow", "freehand", "slide"].includes(single.type);
  const sugId = (S as any).suggestedBinding as string | null;
  const sugEl = sugId ? S.doc.elements[sugId] : null;
  const sugBounds = sugEl ? elementBounds(sugEl) : null;

  return (
    <div
      className={`canvas tool-${S.space ? "hand" : toolClass}${panning ? " panning" : ""}${(S.drag as any)?.isDuplicate ? " is-duplicate" : ""}`}
      id="canvas"
      ref={ref}
      style={{ background: th.board }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        if (S.tool === "laser") laserTool.clear();
      }}
      onDoubleClick={onDoubleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className={`grid${g.showGrid ? " on" : ""}`}
        id="grid"
        style={{
          backgroundImage: `radial-gradient(circle, ${th.dot} 1px, transparent 1.15px)`,
          backgroundSize: `${g.gridSize * S.camera.zoom}px ${g.gridSize * S.camera.zoom}px`,
          backgroundPosition: `${S.camera.x % (g.gridSize * S.camera.zoom)}px ${S.camera.y % (g.gridSize * S.camera.zoom)}px`,
        }}
      />
      <div
        className="world"
        id="world"
        style={{
          transform: `translate(${S.camera.x}px,${S.camera.y}px) scale(${S.camera.zoom})`,
        }}
      >
        <div id="slides">
          {sortedElements()
            .filter((el) => el.type === "slide")
            .map((el) => (
              <NodeView
                key={el.id}
                el={el}
                selected={S.selection.has(el.id)}
                slideNumber={slides().findIndex((s) => s.id === el.id) + 1}
              />
            ))}
        </div>
        <div id="frames">
          {sortedElements()
            .filter((el) => el.type === "diagram" || el.type === "container")
            .map((el) => (
              <NodeView key={el.id} el={el} selected={S.selection.has(el.id)} />
            ))}
        </div>
        <Edges />
        <div id="nodes">
          {sortedElements()
            .filter(
              (el) =>
                el.type !== "slide" &&
                el.type !== "diagram" &&
                el.type !== "container" &&
                el.type !== "arrow" &&
                el.type !== "freehand",
            )
            .map((el) => (
              <NodeView key={el.id} el={el} selected={S.selection.has(el.id)} />
            ))}
        </div>
        <ArrowHandles />
      </div>
      {S.marquee ? (
        <div
          className="marquee on"
          id="marquee"
          style={{
            left: Math.min(S.marquee.x0, S.marquee.x1),
            top: Math.min(S.marquee.y0, S.marquee.y1),
            width: Math.abs(S.marquee.x1 - S.marquee.x0),
            height: Math.abs(S.marquee.y1 - S.marquee.y0),
          }}
        />
      ) : null}
      {selBounds ? (
        <div
          className="sel on"
          id="sel"
          style={{
            left: selBounds.minX * S.camera.zoom + S.camera.x,
            top: selBounds.minY * S.camera.zoom + S.camera.y,
            width: selBounds.width * S.camera.zoom,
            height: selBounds.height * S.camera.zoom,
          }}
        >
          {HANDLES.map((h) => (
            <i
              key={h}
              className="h"
              data-h={h}
              style={{ display: resizable ? undefined : "none" }}
              onPointerDown={(e) => resizable && startResize(e, h)}
            />
          ))}
        </div>
      ) : null}
      {sugBounds ? (
        <div
          className="sel on sug"
          style={{
            left: sugBounds.minX * S.camera.zoom + S.camera.x - 4,
            top: sugBounds.minY * S.camera.zoom + S.camera.y - 4,
            width: (sugBounds.maxX - sugBounds.minX) * S.camera.zoom + 8,
            height: (sugBounds.maxY - sugBounds.minY) * S.camera.zoom + 8,
            borderColor: "#4d7cfe",
          }}
        />
      ) : null}
      <canvas className="laser" id="laser" ref={laserRef} />
      <TextEditor />
    </div>
  );
}
