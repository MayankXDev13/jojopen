/* Canvas appearance checks: Random colors, single-step undo, the colour dot and
   the Dots toggle.

     bun run dev --host 127.0.0.1
     node docs/harness/appearance.js

   Exits non-zero when any assertion fails. Screenshots go to
   /tmp/opencode/jojo/appearance/. */

const fs = require("fs");
const { launch, sleep } = require("./lib");

const URL = process.env.JOJO_URL || "http://127.0.0.1:5173/";
const SHOT = "/tmp/opencode/jojo/appearance";
const COLOR_KEYS = [
  "violet",
  "teal",
  "blue",
  "green",
  "orange",
  "amber",
  "rose",
  "slate",
  "gray",
  "ink",
];

(async () => {
  fs.mkdirSync(SHOT, { recursive: true });
  const b = await launch({
    url: URL,
    port: 9542,
    profile: "/tmp/opencode/jojo/appearance-profile",
  });
  await sleep(2400);

  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail });

  // Start from an empty board: the first run seeds a demo, which select-all
  // plus delete removes through the normal undoable path.
  await b.key("a", { code: "KeyA", vk: 65, modifiers: 2 });
  await sleep(300);
  await b.key("Delete", { code: "Delete", vk: 46 });
  await sleep(600);
  await b.evaluate(
    `(()=>{const btn=document.querySelector('.start-blank');if(btn)btn.click();return !!btn})()`,
  );
  await sleep(300);
  const cleared = await b.evaluate(`Object.keys(J.S.doc.elements).length`);
  check("starts from an empty board", cleared === 0, cleared);

  const draw = async (tool, x1, y1, x2, y2) => {
    await b.evaluate(`document.querySelector('[data-tool="${tool}"]').click()`);
    await sleep(150);
    await b.dragXY(x1, y1, x2, y2);
    await sleep(400);
  };
  const elementColors = () =>
    b.evaluate(
      `Object.values(J.S.doc.elements).filter(e=>e.type==='shape'||e.type==='arrow').map(e=>({type:e.type,color:e.color,locked:e.colorLocked}))`,
    );
  const renderedStrokes = () =>
    b.evaluate(
      `[...document.querySelectorAll('.node svg [stroke], .edges svg [stroke]')].map(e=>e.getAttribute('stroke')).filter(s=>s&&s!=='none')`,
    );

  await draw("rectangle", 340, 420, 440, 490);
  await draw("ellipse", 500, 420, 600, 490);
  await draw("arrow", 650, 430, 760, 430);
  await b.shot(`${SHOT}/before-random.png`);

  const before = await elementColors();
  check("draws shapes and an arrow", before.length >= 3, before.length);

  await b.evaluate(`document.querySelector('[data-act="random"]').click()`);
  await sleep(600);
  await b.shot(`${SHOT}/after-random.png`);

  const after = await elementColors();
  check(
    "random colors every shape and arrow",
    after.every((e) => !!e.color),
    after,
  );
  check(
    "random colors locks the colours",
    after.every((e) => e.locked),
    after,
  );
  check(
    "random colors uses palette keys",
    after.every((e) => COLOR_KEYS.includes(e.color)),
    after,
  );
  check(
    "random colors spreads the palette",
    new Set(after.map((e) => e.color)).size >= 2,
    after,
  );

  const strokes = await renderedStrokes();
  check("rendered strokes are present", strokes.length > 0, strokes.length);
  check(
    "the board is not all neutral grey",
    !(strokes.length > 0 && strokes.every((s) => /808080/i.test(s))),
    strokes.slice(0, 12),
  );

  await b.evaluate(`document.querySelector('#undoBtn').click()`);
  await sleep(450);
  const undone = await elementColors();
  check(
    "one Undo undoes the whole randomisation",
    undone.every((e) => !e.color && !e.locked),
    undone.toSpliced(3),
  );

  await b.evaluate(`document.querySelector('#redoBtn').click()`);
  await sleep(450);
  const redone = await elementColors();
  check(
    "Redo restores the randomisation",
    redone.every((e) => !!e.color),
    redone.slice(0, 3),
  );

  await b.send("Page.reload");
  await sleep(2400);
  const reloaded = await elementColors();
  check(
    "random colours persist across reload",
    reloaded.length >= 3 && reloaded.every((e) => !!e.color),
    reloaded.slice(0, 3),
  );

  // Colour dot
  await b.evaluate(
    `(()=>{const id=Object.keys(J.S.doc.elements).find(k=>J.S.doc.elements[k].type==='shape');J.S.selection=new Set([id]);J.renderAll()})()`,
  );
  await sleep(350);
  const dotExists = await b.evaluate(
    `!!document.querySelector('.contextbar .colordot input[type="color"]')`,
  );
  check("context bar has a colour dot input", dotExists, dotExists);

  const priorColor = await b.evaluate(
    `(()=>{const id=J.S.selection.values().next().value;return J.S.doc.elements[id].color})()`,
  );
  await b.evaluate(
    `(()=>{const i=document.querySelector('.colordot input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'#123456');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
  await sleep(450);
  await b.shot(`${SHOT}/color-dot.png`);
  const dotColor = await b.evaluate(
    `(()=>{const id=J.S.selection.values().next().value;const e=J.S.doc.elements[id];return {color:e.color,locked:e.colorLocked}})()`,
  );
  check(
    "colour dot writes the chosen hex",
    dotColor.color === "#123456" && dotColor.locked,
    dotColor,
  );
  const dotStroke = await b.evaluate(
    `[...document.querySelectorAll('.node svg [stroke]')].map(e=>e.getAttribute('stroke')).some(s=>/#123456/i.test(s||''))`,
  );
  check("colour dot repaints the selected node", dotStroke, dotStroke);

  await b.evaluate(`document.querySelector('#undoBtn').click()`);
  await sleep(450);
  const dotUndo = await b.evaluate(
    `(()=>{const id=Object.keys(J.S.doc.elements).find(k=>J.S.doc.elements[k].type==='shape');return J.S.doc.elements[id].color})()`,
  );
  check("colour dot change is undoable", dotUndo !== "#123456", {
    priorColor,
    dotUndo,
  });

  // Dots
  const gridState = () =>
    b.evaluate(
      `({show:!!J.S.doc.settings.showGrid,active:document.querySelector('[data-act="dots"]').classList.contains('is-active')})`,
    );
  const g0 = await gridState();
  await b.evaluate(`document.querySelector('[data-act="dots"]').click()`);
  await sleep(450);
  await b.shot(`${SHOT}/dots-toggled.png`);
  const g1 = await gridState();
  check("Dots flips the background grid", g0.show !== g1.show, { g0, g1 });
  check(
    "Dots updates its active state",
    g0.active !== g1.active && g1.active === g1.show,
    { g0, g1 },
  );

  await b.send("Page.reload");
  await sleep(2400);
  const g2 = await gridState();
  check(
    "Dots choice persists across reload",
    g2.show === g1.show && g2.active === g1.active,
    { g1, g2 },
  );

  await b.key("'", { code: "Quote", vk: 222, modifiers: 2 | 8 });
  await sleep(500);
  const g3 = await gridState();
  check("Dots reacts to Ctrl+Shift+'", g3.show !== g2.show, { g2, g3 });

  const errors = b.errors.slice(0, 10);
  const failed = b.failed
    .filter((f) => !/net::ERR_ABORTED/.test(f))
    .slice(0, 10);
  check("no console errors", errors.length === 0, errors);
  check("no failed requests", failed.length === 0, failed);

  b.ws.close();
  b.proc.kill();

  const bad = results.filter((r) => !r.ok);
  for (const r of results)
    console.log(
      `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  " + JSON.stringify(r.detail)}`,
    );
  console.log(
    `\n${results.length - bad.length}/${results.length} checks passed`,
  );
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
