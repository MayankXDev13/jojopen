const { launch, sleep } = require('./lib');
const fs = require('fs');
const DIR = '/tmp/opencode/jojo/suite';
fs.mkdirSync(DIR, { recursive: true });

const byText = (t, tag = 'button') => `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(tag)})].find(b=>(b.innerText||'').trim()===${JSON.stringify(t)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`;

(async () => {
  const b = await launch({ url: 'https://jojopen.com/' });
  await sleep(3200);
  const log = {};
  const shot = (n) => b.shot(`${DIR}/${n}.png`);
  const clickT = async (t, tag = 'button') => { const r = await b.evaluate(byText(t, tag)); if (!r) return 'MISS:' + t; await b.clickXY(r.x, r.y); await sleep(450); return 'ok'; };
  const esc = async () => { await b.key('Escape', { code: 'Escape', vk: 27 }); await sleep(350); };
  const hoverTop = async () => { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1330, y: 35 }); await sleep(350); };
  const hoverRail = async () => { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 45, y: 200 }); await sleep(350); };
  const txt = async () => b.evaluate(`document.body.innerText.slice(-900)`);

  await shot('01-landing');

  // toolbar hover
  await hoverRail();
  await shot('02-toolbar');
  log.toolbar = await b.evaluate(`[...document.querySelectorAll('.cp-toolbar button')].map(b=>b.getAttribute('aria-label')).filter(Boolean)`);
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 700 });

  // style variants
  await hoverTop();
  log.styleClean = await clickT('Clean');
  await sleep(700); await shot('03-clean');
  log.styleChalk = await clickT('Chalkboard');
  await sleep(700); await shot('04-chalkboard');
  await clickT('Sketch');
  await sleep(600);
  // B/W
  await hoverTop();
  log.bw = await b.clickSel('.cp-bwtoggle');
  await sleep(700); await shot('05-bw');
  log.bwOff = await b.clickSel('.cp-bwtoggle');
  await sleep(400);
  // theme
  await hoverTop();
  log.theme = await b.clickSel('button[aria-label^="Switch to"]');
  await sleep(800); await shot('06-dark');
  log.themeState = await b.evaluate(`[document.documentElement.dataset.theme||'', getComputedStyle(document.body).backgroundColor]`);
  await hoverTop();
  await b.clickSel('button[aria-label^="Switch to"]');
  await sleep(700);

  // export
  await hoverTop();
  await clickT('Export');
  await sleep(700); await shot('07-export');
  log.export = await txt();
  log.exportBtns = await b.evaluate(`[...document.querySelectorAll('.cp-modal button,.cp-sheet button,[role=dialog] button')].map(x=>(x.innerText||x.getAttribute('aria-label')||'').trim()).filter(Boolean)`);
  await esc();

  // sign in
  await hoverTop();
  await clickT('Sign in');
  await sleep(700); await shot('08-signin');
  log.signin = await txt();
  await esc();

  // command palette
  await b.key('k', { code: 'KeyK', vk: 75, modifiers: 2 });
  await sleep(600); await shot('09-palette');
  log.palette = await txt();
  await esc();

  // selection: click CDN node
  await b.clickXY(456, 471);
  await sleep(600); await shot('10-selection');
  log.selection = await b.evaluate(`[...document.querySelectorAll('button')].map(b=>b.title||b.getAttribute('aria-label')).filter(Boolean).slice(-30)`);
  // right click
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 456, y: 471, button: 'right', buttons: 2 });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 456, y: 471, button: 'right', buttons: 0 });
  await sleep(600); await shot('11-contextmenu');
  log.context = await txt();
  await esc();
  await esc();

  // code panel with selection
  await b.key('e', { code: 'KeyE', vk: 69, modifiers: 2 });
  await sleep(900); await shot('12-code');
  log.code = await txt();
  log.codeArea = await b.evaluate(`(()=>{const t=document.querySelector('textarea'); return t?t.value.slice(0,400):'none'})()`);
  log.codeBtns = await b.evaluate(`[...document.querySelectorAll('.cp-panel button, .cp-drawer button')].map(x=>(x.innerText||'').trim()).filter(Boolean).slice(0,30)`);
  // mermaid import
  const merm = await clickT('Import Mermaid');
  await sleep(700); await shot('13-mermaid');
  log.mermaid = merm + ' | ' + (await txt());
  await esc();

  // slides
  await b.clickSel('[aria-label="Slides"]');
  await sleep(800); await shot('14-slides');
  log.slides = await txt();
  const add = await clickT('Add slide');
  await sleep(700); await shot('15-layouts');
  log.layouts = await b.evaluate(`[...document.querySelectorAll('.cp-panel button,.cp-layouts button,[class*=layout] button')].map(x=>(x.innerText||'').trim()).filter(Boolean).slice(0,40)`);
  log.layoutShot = add;
  await b.shot(`${DIR}/15-layouts.png`);

  console.log(JSON.stringify(log, null, 1).slice(0, 9000));
  console.log('ERRORS', JSON.stringify(b.errors).slice(0, 1200));
  b.proc.kill('SIGKILL'); process.exit(0);
})();
