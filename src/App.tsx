import { useEffect, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { Canvas } from './components/Canvas';
import { BottomBar, ContextBar, Rail, SotCard, StartCard, Toast, Toolbar, TopBar } from './components/Chrome';
import { Overlays } from './components/Overlays';
import { PanelRoot } from './components/Panels';
import { Presenter } from './components/Presenter';
import { SotReplay } from './components/SotReplay';
import { TimelineReplay } from './components/TimelineReplay';
import { installKeyboard } from './state/commands';
import { addSlide } from './state/actions';
import { parseDSL } from './lib/dsl';
import { layoutDiagram } from './lib/layout';
import { diagramFor } from './lib/diagram';
import { openBoard } from './state/actions';
import { recWatch } from './state/sot';
import {
  S,
  bootStore,
  elements,
  fitAll,
  getVersion,
  notify,
  persist,
  resolvedTheme,
  settings,
  subscribe,
  theme,
  toast,
} from './state/store';

export function App() {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion);

  /* one-time boot: load the document, fit it, bind keyboard + unload save */
  useEffect(() => {
    bootStore();
    fitAll();
    const offKeys = installKeyboard();
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onScheme = () => notify();
    mq?.addEventListener?.('change', onScheme);
    const onUnload = () => {
      persist(true);
    };
    window.addEventListener('beforeunload', onUnload);
    (window as any).J = { S, renderAll: notify, addSlide, parseDSL, layoutDiagram, diagramFor, openBoard };
    if (location.hash.match(/#\/b\//)) toast('Opened board from link');
    else persist(true);
    return () => {
      mq?.removeEventListener?.('change', onScheme);
      offKeys();
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  /* capture a Sands of Time frame once edits settle */
  useEffect(() => {
    recWatch();
  }, [version]);

  const th = theme();
  const vars = {
    '--board': th.board,
    '--frame': th.frame,
    '--frameText': th.frameText,
    '--slide': th.slide,
    '--slideEdge': th.slideEdge,
    '--saved': th.muted,
  } as CSSProperties;

  /* body-level surfaces (replay, modals) read these from the root too */
  useEffect(() => {
    const rt = document.documentElement.style;
    for (const [k, v] of Object.entries(vars)) rt.setProperty(k, String(v));
  }, [version]);

  return (
    <div
      className={`app${S.sot.replay ? ' is-sot-replay' : ''}`}
      id="app"
      data-theme={resolvedTheme()}
      data-style={settings().style}
      style={vars}
    >
      <Canvas />
      <TopBar />
      <Toolbar />
      <Rail />
      <BottomBar />
      <ContextBar />
      <StartCard />
      <PanelRoot />
      <Overlays />
      <Toast />
      <SotCard />
      <Presenter />
      <TimelineReplay />
      <SotReplay />
    </div>
  );
}
