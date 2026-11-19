const { launch, sleep } = require("./lib");
const fs = require("fs");
const SHOT = "/tmp/opencode/jojo/suite2";

(async () => {
  const b = await launch({ url: "http://127.0.0.1:5173/" });
  await sleep(1800);
  const out = {};
  const clickSel = async (sel) => {
    const r = await b.evaluate(
      `(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
    );
    if (!r) return "MISS:" + sel;
    await b.clickXY(r.x, r.y);
    return "ok";
  };
  const key = async (k, code, vk) => {
    await b.key(k, { code, vk });
    await sleep(160);
  };
  const pos = () =>
    b.evaluate(
      `document.querySelector('.sotpos')&&document.querySelector('.sotpos').textContent`,
    );

  // record 3 edits using the toolbar buttons (no shortcut guessing)
  await clickSel('[data-act="sot"]');
  await sleep(250);
  const tool = async (t) => {
    const r = await b.evaluate(
      `(()=>{const e=document.querySelector('#toolbar [data-tool="${t}"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
    );
    if (!r) return "MISS:" + t;
    await b.clickXY(r.x, r.y);
    return "ok";
  };
  out.toolRect = await tool("rectangle");
  await sleep(200);
  await b.dragXY(250, 320, 420, 440);
  await sleep(650);
  out.toolEll = await tool("ellipse");
  await sleep(200);
  await b.dragXY(470, 320, 620, 440);
  await sleep(650);
  out.toolSticky = await tool("sticky");
  await sleep(200);
  await b.clickXY(760, 400);
  await sleep(700);
  await clickSel('[data-act="sot"]');
  await sleep(700);
  out.rec = await b.evaluate(
    `J.S.doc.recordings.map(r=>({steps:r.steps.length,frames:r.frames.length,labels:r.frames.map(f=>f.label)}))`,
  );

  // open replay and drive it from the keyboard only
  await clickSel(".sotrow-main");
  await sleep(500);
  out.start = await pos();
  await key("ArrowRight", "ArrowRight", 39);
  out.right1 = await pos();
  await key("ArrowRight", "ArrowRight", 39);
  out.right2 = await pos();
  await key("ArrowRight", "ArrowRight", 39);
  out.right3 = await pos();
  await key("ArrowLeft", "ArrowLeft", 37);
  out.left1 = await pos();
  await key("Home", "Home", 36);
  out.home = await pos();
  await key(" ", "Space", 32);
  await sleep(1800);
  out.spacePlay = await pos();
  await key(" ", "Space", 32);
  await sleep(300);
  out.spacePause = await pos();
  await key("End", "End", 35);
  out.end = await pos();
  await b.shot(`${SHOT}/18-replay-keys.png`);
  await key("Escape", "Escape", 27);
  out.closed = await b.evaluate(
    `!document.querySelector('.sotreplay') && !document.querySelector('#sotDim') && !document.querySelector('#app').classList.contains('is-sot-replay')`,
  );

  // theme + style sweep with replay closed
  for (const t of ["clean", "chalkboard", "sketch"]) {
    const r = await b.evaluate(
      `(()=>{const e=document.querySelector('[data-act="style"][data-style="${t}"]');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
    );
    await b.clickXY(r.x, r.y);
    await sleep(350);
  }
  await clickSel('[data-act="theme"]');
  await sleep(400);
  await clickSel('[data-act="theme"]');
  await sleep(400);
  out.sweepOk = await b.evaluate(
    `({style:J.S.doc.settings.style, theme:J.S.themePref, nodes:document.querySelectorAll('#nodes>*').length})`,
  );

  out.errors = b.errors;
  out.failed = b.failed.filter((f) => !/net::ERR_ABORTED/.test(f));
  console.log(JSON.stringify(out, null, 1));
  b.proc.kill("SIGKILL");
  process.exit(0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
