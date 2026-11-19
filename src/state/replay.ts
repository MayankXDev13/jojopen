/* The lightweight timeline replay (the old `S.replay` surface). */

import { clamp } from "../lib/dom";
import { S, notify, snapshot, toast } from "./store";

export function openReplay() {
  const entries = S.timeline.slice(-90).map((e: any) => ({ ...e }));
  if (!entries.length) return toast("Draw something first");
  entries.push({ json: snapshot(), label: "Now", at: Date.now() });
  S.replay = {
    list: entries,
    index: entries.length - 1,
    playing: false,
    timer: null,
  };
  notify();
}

export function closeReplay() {
  if (S.replay?.timer) clearInterval(S.replay.timer);
  S.replay = null;
  notify();
}

export function replayStep(d: number) {
  if (!S.replay) return;
  S.replay.index = clamp(S.replay.index + d, 0, S.replay.list.length - 1);
  notify();
}

export function replayToggle() {
  if (!S.replay) return;
  const r = S.replay;
  if (r.playing) {
    clearInterval(r.timer);
    r.playing = false;
    r.timer = null;
  } else {
    if (r.index >= r.list.length - 1) r.index = 0;
    r.playing = true;
    r.timer = setInterval(() => {
      if (!S.replay) return;
      if (S.replay.index >= S.replay.list.length - 1) {
        replayToggle();
        notify();
        return;
      }
      S.replay.index++;
      notify();
    }, 650) as unknown as number;
  }
  notify();
}
