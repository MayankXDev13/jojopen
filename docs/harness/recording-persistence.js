const { launch, sleep } = require('./lib');
const fs = require('fs');
const SHOT = '/tmp/opencode/jojo/suite2';
(async () => {
  const b = await launch({ url: 'https://jojopen.com/' });
  await sleep(2500);
  const out = {};
  const railBtn = async () => b.evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>/Sands of Time|Stop recording/i.test(b.getAttribute('aria-label')||b.title||''));if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,label:e.getAttribute('aria-label'),cls:e.className}})()`);
  await b.mouse('mouseMoved', 1393, 240); await sleep(500);
  let btn = await railBtn();
  out.before = btn;
  await b.clickXY(btn.x, btn.y); await sleep(600);
  await b.key('r', { code: 'KeyR', vk: 82 }); await sleep(200);
  await b.dragXY(260, 380, 430, 500); await sleep(700);
  await b.key('o', { code: 'KeyO', vk: 79 }); await sleep(200);
  await b.dragXY(500, 380, 640, 500); await sleep(700);
  out.during = await railBtn();
  await b.clickXY(btn.x, btn.y); await sleep(900);
  out.card = await b.evaluate(`(()=>{const c=document.querySelector('.cp-sotcard');return c?c.innerText:null})()`);
  out.after = await railBtn();
  out.storageHasRecordings = await b.evaluate(`(()=>{
    const raw=localStorage.getItem('jojopen:scratch:v2')||'';
    let doc=null; try{doc=JSON.parse(raw)}catch{}
    return {len:raw.length, keys:doc?Object.keys(doc):[], hasRecField:doc?('recordings' in doc):false,
      recCount:doc&&doc.recordings?doc.recordings.length:null, matchSands:/Sands/i.test(raw)};
  })()`);
  await b.shot(`${SHOT}/20-live-card.png`);

  await b.evaluate(`location.reload()`);
  await sleep(3000);
  await b.mouse('mouseMoved', 1393, 240); await sleep(500);
  out.afterReload = await railBtn();
  out.reloadCard = await b.evaluate(`(()=>{const c=document.querySelector('.cp-sotcard');return c?c.innerText:null})()`);
  out.reloadLocal = await b.evaluate(`(()=>{const raw=localStorage.getItem('jojopen:scratch:v2')||'';let doc=null;try{doc=JSON.parse(raw)}catch{};return {keys:doc?Object.keys(doc):[],matchSands:/Sands/i.test(raw)}})()`);
  await b.shot(`${SHOT}/21-live-after-reload.png`);
  out.errors = b.errors;
  out.failed = b.failed;
  console.log(JSON.stringify(out, null, 1));
  b.proc.kill('SIGKILL');
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
