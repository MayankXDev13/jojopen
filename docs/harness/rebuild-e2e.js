const { launch, sleep } = require('./lib');
const fs = require('fs');
const path = require('path');

const DL = '/tmp/opencode/jojo/dl';
const SHOT = '/tmp/opencode/jojo/suite2';
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });
fs.mkdirSync(SHOT, { recursive: true });

function waitFile(dir, ext, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      let names = [];
      try { names = fs.readdirSync(dir); } catch {}
      const hit = names.find((n) => n.endsWith(ext) && !n.endsWith('.crdownload'));
      if (hit) return resolve(path.join(dir, hit));
      if (Date.now() - t0 > timeout) return reject(new Error('timeout waiting for ' + ext + ' in ' + dir + ' :: ' + names.join(',')));
      setTimeout(tick, 200);
    };
    tick();
  });
}

(async () => {
  const b = await launch({ url: 'http://127.0.0.1:5173/' });
  await sleep(1800);
  await b.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(() => {});
  const out = {};
  const shot = (n) => b.shot(`${SHOT}/${n}.png`);
  const clickAct = async (act, extra = '') => {
    const r = await b.evaluate(`(()=>{const e=document.querySelector('[data-act="${act}"]${extra ? '' : ''}'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!r) return 'MISS:' + act;
    await b.clickXY(r.x, r.y);
    return 'ok';
  };
  const clickSel = async (sel) => {
    const r = await b.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!r) return 'MISS:' + sel;
    await b.clickXY(r.x, r.y);
    return 'ok';
  };
  const esc = async () => { await b.key('Escape', { code: 'Escape', vk: 27 }); await sleep(300); };

  out.boot = await b.evaluate(`({root: !!document.querySelector('#app .canvas'), errors: 0})`);

  // ---- recording ----
  out.start = await clickSel('[data-act="sot"]');
  await sleep(500);
  out.recState = await b.evaluate(`(()=>{const e=document.querySelector('[data-act="sot"]');return {cls:e.className,label:e.getAttribute('aria-label'),pressed:e.getAttribute('aria-pressed')}})()`);
  await shot('01-recording-start');

  await b.key('r', { code: 'KeyR', vk: 82 }); await sleep(200);
  await b.dragXY(300, 400, 470, 520); await sleep(700);
  await b.key('o', { code: 'KeyO', vk: 79 }); await sleep(200);
  await b.dragXY(540, 400, 690, 520); await sleep(800);
  out.liveCount = await b.evaluate(`document.querySelector('[data-act="sot"]').getAttribute('aria-label')`);
  await shot('02-recording-active');

  out.stop = await clickSel('[data-act="sot"]');
  await sleep(900);
  out.card = await b.evaluate(`(()=>{const c=document.querySelector('.sotcard');return c?{txt:c.innerText, rows:c.querySelectorAll('.sotrow').length}:null})()`);
  await shot('03-recordings-card');

  // ---- replay ----
  out.replayOpen = await clickSel('.sotrow-main');
  await sleep(700);
  out.replay = await b.evaluate(`(()=>{const r=document.querySelector('.sotreplay');const range=document.querySelector('#sotRange');return r?{top:document.querySelector('.sottop').innerText,pos:document.querySelector('.sotpos').textContent,max:range.max,stage:!!document.querySelector('.sotstage')}:null})()`);
  await shot('04-replay-start');
  out.play = await clickSel('.sotplay');
  await sleep(900);
  out.afterPlay = await b.evaluate(`({pos:document.querySelector('.sotpos').textContent, icon:document.querySelector('.sotplay').innerHTML.includes('pause')?'pause':'play'})`);
  await shot('05-replay-mid');
  await sleep(1500);
  out.playEnd = await b.evaluate(`document.querySelector('.sotpos').textContent`);
  // scrub
  await b.evaluate(`(()=>{const r=document.querySelector('#sotRange');r.value='0';r.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
  await sleep(300);
  out.scrub = await b.evaluate(`({pos:document.querySelector('.sotpos').textContent,label:document.querySelector('.sotlabel').textContent})`);
  out.speed = await clickSel('.sotspeed');
  await sleep(200);
  out.speedText = await b.evaluate(`document.querySelector('.sotspeed').textContent`);
  await shot('06-replay-player');

  // ---- GIF export ----
  out.exportMenu = await clickSel('[data-act="sotExportToggle"]');
  await sleep(300);
  out.exportItems = await b.evaluate(`[...document.querySelectorAll('.sotexport-menu b')].map(e=>e.textContent)`);
  await shot('07-replay-export-menu');
  out.gifClick = await clickSel('[data-act="sotExport"][data-kind="gif"]');
  try {
    const gif = await waitFile(DL, '.gif', 40000);
    out.gif = { file: gif, size: fs.statSync(gif).size, head: fs.readFileSync(gif).slice(0, 6).toString('latin1') };
  } catch (e) { out.gif = { error: e.message }; }
  await sleep(400);
  await shot('08-replay-after-gif');

  // ---- MP4 export ----
  out.mp4Supported = await b.evaluate(`(()=>{try{return MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')||MediaRecorder.isTypeSupported('video/mp4')}catch(e){return false}})()`);
  if (out.mp4Supported) {
    await clickSel('[data-act="sotExportToggle"]'); await sleep(250);
    await clickSel('[data-act="sotExport"][data-kind="mp4"]');
    try {
      const mp4 = await waitFile(DL, '.mp4', 60000);
      out.mp4 = { file: mp4, size: fs.statSync(mp4).size };
    } catch (e) { out.mp4 = { error: e.message }; }
    await sleep(400);
  }

  // close replay
  await esc();
  out.closed = await b.evaluate(`({replay: !!document.querySelector('.sotreplay'), card: !!document.querySelector('.sotcard')})`);

  // ---- Mermaid ----
  await clickAct('code'); await sleep(600);
  out.mermaidBtn = await clickAct('mermaid'); await sleep(600);
  out.mermaidDialog = await b.evaluate(`(()=>{const t=document.querySelector('#mermaidInput');return t?{open:true,val:t.value.slice(0,60)}:{open:false}})()`);
  await b.evaluate(`(()=>{const t=document.querySelector('#mermaidInput');t.value='flowchart TD\\n  Start([Start]) --> Check{Valid?}\\n  Check -->|yes| Save[(Database)]\\n  Check -->|no| Fail[Show error]\\n  Save --> Done((Done))\\n  subgraph Backend\\n    Save\\n  end';t.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
  await sleep(200);
  await shot('09-mermaid');
  out.mermaidConvert = await clickAct('mermaidConvert');
  await sleep(1800);
  out.mermaidResult = await b.evaluate(`(()=>{const els=Object.values(J.S.doc.elements);const d=els.find(e=>e.type==='diagram');return {diagrams:els.filter(e=>e.type==='diagram').length,title:d&&d.title,dsl:d&&d.dsl.slice(0,400),panel:J.S.panel,overlay:!!document.querySelector('#mermaidInput')}})()`);
  await shot('10-mermaid-diagram');

  // ---- slide builds ----
  await clickAct('slides'); await sleep(400);
  out.addSlide = await clickAct('layoutPicker'); await sleep(300);
  await clickSel('[data-act="addSlide"][data-layout="title"]'); await sleep(900);
  out.buildsUI = await b.evaluate(`(()=>{const c=document.querySelector('.builds');return c?c.innerText:null})()`);
  const cb = await b.evaluate(`(()=>{const i=document.querySelector('[data-act="toggleBuilds"]');if(!i)return null;const r=i.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,checked:i.checked}})()`);
  out.buildCheckbox = cb;
  if (cb) { await b.clickXY(cb.x, cb.y); await sleep(700); }
  out.buildsAfter = await b.evaluate(`(()=>{const s=J.S.doc.elements[Object.keys(J.S.doc.elements).find(id=>J.S.doc.elements[id].type==='slide')];return {builds:(s.builds||[]).length, checked:document.querySelector('[data-act="toggleBuilds"]')?.checked}})()`);
  await shot('11-slide-builds');
  out.buildReplay = await clickSel('[data-act="buildReplay"]');
  await sleep(1800);
  out.presentStart = await b.evaluate(`(()=>{const s=document.querySelector('.present-stage .scene');return {present:!!J.S.present, children:s?s.children.length:0, steps:J.S.present&&J.S.present.steps}})()`);
  await shot('12-build-replay-start');
  await b.key(' ', { code: 'Space', vk: 32 }); await sleep(900);
  out.presentNext = await b.evaluate(`(()=>{const s=document.querySelector('.present-stage .scene');return {children:s?s.children.length:0, steps:J.S.present&&J.S.present.steps}})()`);
  await shot('13-build-replay-next');
  await esc();

  out.errors = b.errors;
  out.failed = b.failed.filter((f) => !/net::ERR_ABORTED/.test(f));
  console.log(JSON.stringify(out, null, 1).slice(0, 15000));
  b.proc.kill('SIGKILL');
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
