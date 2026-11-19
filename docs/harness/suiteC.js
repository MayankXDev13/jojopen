const { launch, sleep } = require("./lib");
const fs = require("fs");
const DIR = "/tmp/opencode/jojo/suite";

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
    await sleep(600);
    return "ok";
  };
  const esc = async () => {
    await b.key("Escape", { code: "Escape", vk: 27 });
    await sleep(350);
  };

  // code panel + new diagram
  await b.key("e", { code: "KeyE", vk: 69, modifiers: 2 });
  await sleep(1800);
  log.newBtn = await clickT("New diagram");
  await sleep(1500);
  await shot("12-code-newdiagram");
  log.newCode = await b.evaluate(
    `(()=>{const t=document.querySelector('textarea');return t?{v:t.value,w:t.getBoundingClientRect().width}:null})()`,
  );
  log.codePanelTxt = await b.evaluate(
    `(()=>{const h=[...document.querySelectorAll('div')].find(e=>e.innerText&&e.innerText.startsWith('Diagram code'));return h?h.innerText.slice(0,800):''})()`,
  );
  log.codeBtns = await b.evaluate(
    `(()=>[...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(Boolean).slice(-18))()`,
  );

  // mermaid dialog
  log.merm = await clickT("Import Mermaid");
  await sleep(900);
  await shot("13-mermaid");
  log.mermaidText = await b.evaluate(
    `(()=>{const t=document.body.innerText;const i=t.indexOf('Import Mermaid');return t.slice(Math.max(0,i-200), i+900)})()`,
  );
  await esc();
  await esc();

  // recordings
  await b.clickSel('[aria-label*="Sands of Time"]');
  await sleep(500);
  await b.key("r", { code: "KeyR", vk: 82 });
  await sleep(200);
  await b.dragXY(200, 640, 340, 730);
  await sleep(300);
  await b.key("o", { code: "KeyO", vk: 79 });
  await sleep(200);
  await b.dragXY(380, 640, 500, 730);
  await sleep(400);
  await shot("20-recording-active");
  await b.clickSel('[aria-label*="Sands of Time"]');
  await sleep(1200);
  await shot("21-recordings");
  log.recordings = await b.evaluate(
    `(()=>{const t=document.body.innerText;const i=t.indexOf('Sands of Time');return t.slice(Math.max(0,i-100), i+700)})()`,
  );
  log.recBtns = await b.evaluate(
    `(()=>[...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(Boolean).slice(-14))()`,
  );
  // play first
  const play = await b.evaluate(
    `(()=>{const e=[...document.querySelectorAll('button')].find(x=>/play|replay/i.test(x.title||x.getAttribute('aria-label')||x.innerText));if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,t:e.title||e.innerText}})()`,
  );
  log.play = play;
  if (play) {
    await b.clickXY(play.x, play.y);
    await sleep(700);
    await shot("22-recording-play");
  }
  await esc();

  // ai
  await b.key("i", { code: "KeyI", vk: 73, modifiers: 2 });
  await sleep(1200);
  await shot("23-ai");
  log.aiText = await b.evaluate(
    `(()=>{const t=document.body.innerText;const i=t.lastIndexOf('Assistant');return t.slice(i, i+600)})()`,
  );
  const conn = await clickT("Connect AI");
  await sleep(700);
  await shot("24-ai-connect-menu");
  log.connectMenu = await b.evaluate(
    `(()=>{const m=[...document.querySelectorAll('[class*=menu],[role=menu]')].filter(e=>e.getBoundingClientRect().height>0);return m.map(e=>e.innerText.slice(0,300))})()`,
  );
  const first = await b.evaluate(
    `(()=>{const m=[...document.querySelectorAll('[class*=menu] button,[role=menu] button')].filter(e=>e.getBoundingClientRect().height>0);if(!m[0])return null;const r=m[0].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,t:m[0].innerText}})()`,
  );
  log.firstProvider = first;
  if (first) {
    await b.clickXY(first.x, first.y);
    await sleep(1000);
    await shot("25-connect-dialog");
    log.connectDialog = await b.evaluate(
      `(()=>{const t=document.body.innerText;const i=t.lastIndexOf('Connect');return t.slice(i,i+900)})()`,
    );
  }

  console.log(JSON.stringify(log, null, 1).slice(0, 12000));
  console.log("ERR", JSON.stringify(b.errors).slice(0, 800));
  b.proc.kill("SIGKILL");
  process.exit(0);
})();
