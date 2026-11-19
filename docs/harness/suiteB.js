const { launch, sleep } = require("./lib");
const fs = require("fs");
const DIR = "/tmp/opencode/jojo/suite";
fs.mkdirSync(DIR, { recursive: true });

const byText = (t, tag = "button") =>
  `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(tag)})].find(b=>(b.innerText||'').trim()===${JSON.stringify(t)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`;

(async () => {
  const b = await launch({ url: "https://jojopen.com/" });
  await sleep(3200);
  const log = {};
  const shot = (n) => b.shot(`${DIR}/${n}.png`);
  const clickT = async (t, tag = "button") => {
    const r = await b.evaluate(byText(t, tag));
    if (!r) return "MISS:" + t;
    await b.clickXY(r.x, r.y);
    await sleep(450);
    return "ok";
  };
  const esc = async () => {
    await b.key("Escape", { code: "Escape", vk: 27 });
    await sleep(350);
  };
  const txt = async () =>
    b.evaluate(
      `(()=>{const p=document.querySelector('.cp-panel,.cp-drawer,.cp-modal,[role=dialog]');return (p?p.innerText:document.body.innerText).slice(0,1200)})()`,
    );

  // 1 selection
  await b.clickXY(456, 471);
  await sleep(700);
  await shot("10-selection");
  log.selBar = await b.evaluate(
    `(()=>{const c=[...document.querySelectorAll('div')].filter(e=>/cp-(ctx|selection|floating|selbar)/.test(e.className.toString()));return c.map(e=>e.className.toString()+':'+e.innerText.slice(0,200))})()`,
  );
  log.selButtons = await b.evaluate(
    `(()=>[...document.querySelectorAll('button')].map(b=>({t:(b.innerText||'').trim().slice(0,20),tt:b.title,al:b.getAttribute('aria-label')})).filter(x=>x.t||x.tt||x.al).slice(-26))()`,
  );

  // 2 context menu
  await b.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: 456,
    y: 471,
    button: "right",
    buttons: 2,
  });
  await b.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 456,
    y: 471,
    button: "right",
    buttons: 0,
  });
  await sleep(700);
  await shot("11-contextmenu");
  log.ctx = await b.evaluate(
    `(()=>{const m=document.querySelector('[class*=menu]');return m?m.innerText:'none'})()`,
  );
  await esc();

  // 3 code panel
  await b.key("e", { code: "KeyE", vk: 69, modifiers: 2 });
  await sleep(900);
  await shot("12-code");
  log.codePanel = await txt();
  log.codeValue = await b.evaluate(
    `(()=>{const t=document.querySelector('textarea');return t?t.value.slice(0,600):'none'})()`,
  );
  log.codeButtons = await b.evaluate(
    `(()=>[...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(Boolean).slice(-20))()`,
  );
  const merm = await clickT("Import Mermaid");
  await sleep(800);
  await shot("13-mermaid");
  log.mermaid = merm + " | " + (await txt());
  await esc();
  await esc();

  // 4 slides
  await b.key("S", { code: "KeyS", vk: 83, modifiers: 10 }); // ctrl+shift
  await sleep(900);
  await shot("14-slides");
  log.slidesPanel = await txt();
  const add = await clickT("Add slide");
  await sleep(800);
  await shot("15-layouts");
  log.layouts = await b.evaluate(
    `(()=>[...document.querySelectorAll('button')].map(b=>({t:(b.innerText||'').trim(),al:b.getAttribute('aria-label')})).filter(x=>x.t||x.al).slice(-40))()`,
  );
  log.add = add;
  if (add === "ok") {
    const title = await clickT("Title");
    await sleep(900);
    await shot("16-slide-title");
    log.titlePick = title;
    log.slideState = await b.evaluate(
      `(()=>{const p=document.querySelector('.cp-panel');return p?p.innerText.slice(0,400):''})()`,
    );
    await clickT("Present");
    await sleep(1200);
    await shot("17-present");
    log.present = await b.evaluate(`document.body.innerText.slice(-500)`);
    await b.key("ArrowRight", { code: "ArrowRight", vk: 39 });
    await sleep(800);
    await shot("18-present-next");
    await esc();
    await esc();
  }

  console.log(JSON.stringify(log, null, 1).slice(0, 14000));
  console.log("ERRORS", JSON.stringify(b.errors).slice(0, 1000));
  b.proc.kill("SIGKILL");
  process.exit(0);
})();
