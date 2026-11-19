import type { BoardDoc, BoardElement } from "../lib/model";
import { NodeView } from "./NodeView";

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
      {elements.map((el) =>
        hidden?.has(el.id) ? null : (
          <NodeView key={el.id} el={el} doc={doc} ox={ox} oy={oy} thumb />
        ),
      )}
    </div>
  );
}
