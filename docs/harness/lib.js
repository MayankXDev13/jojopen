const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = '/usr/bin/google-chrome';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function launch({ port = 9344, profile = '/tmp/opencode/jojo/live-profile', width = 1440, height = 900, url }) {
  fs.rmSync(profile, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--user-data-dir=' + profile,
    '--remote-debugging-port=' + port,
    '--window-size=' + width + ',' + height,
    '--font-render-hinting=none',
    '--hide-scrollbars',
    url,
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 160; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      targets = await r.json();
      if (targets.some((t) => t.type === 'page' && t.url.startsWith('http'))) break;
      if (targets.some((t) => t.type === 'page')) break;
    } catch {}
    await sleep(150);
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const errors = [];
  const logs = [];
  const failed = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(m.params.type + ': ' + txt);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text);
    if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText + ' ' + (m.params.requestId || ''));
  };
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, (m) => res(m.result || {}));
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r && r.exceptionDetails) return { __error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
    return r?.result?.value;
  };
  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  };
  const nav = async (u, wait = 2500) => { await send('Page.navigate', { url: u }); await sleep(wait); };
  const clickSel = async (sel) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'MISSING'; e.click(); return 'ok';})()`);
  const clickText = async (text, tag = '*') => evaluate(`(()=>{const els=[...document.querySelectorAll(${JSON.stringify(tag)})].filter(e=>e.children.length<12);const e=els.find(e=>(e.innerText||'').trim()===${JSON.stringify(text)});if(!e)return 'MISSING';e.click();return 'ok';})()`);
  const key = async (k, opts = {}) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: opts.code || k, windowsVirtualKeyCode: opts.vk || 0, modifiers: opts.modifiers || 0 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: opts.code || k, windowsVirtualKeyCode: opts.vk || 0, modifiers: opts.modifiers || 0 });
  };
  const mouse = async (type, x, y, button = 'left', clickCount = 1) =>
    send('Input.dispatchMouseEvent', { type, x, y, button, clickCount });

  
  const rect = async (sel) => evaluate(`(()=>{const e=typeof ${JSON.stringify(sel)}==='string'?document.querySelector(${JSON.stringify(sel)}):null;if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}})()`);
  const clickXY = async (x, y, opts = {}) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
    await sleep(40);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
    if (opts.dbl) {
      await sleep(40);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 2, buttons: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 2, buttons: 0 });
    }
  };
  const clickEl = async (sel) => { const r = await rect(sel); if (!r) return 'MISSING'; await clickXY(r.x, r.y); return r; };
  const hoverEl = async (sel) => { const r = await rect(sel); if (!r) return 'MISSING'; await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); return r; };
  const dragXY = async (x1, y1, x2, y2, steps = 8) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1, button: 'none' });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1, buttons: 1 });
    for (let i = 1; i <= steps; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps, button: 'left', buttons: 1 }); await sleep(16); }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1, buttons: 0 });
  };
  return { proc, ws, send, evaluate, shot, nav, clickSel, clickText, key, mouse, rect, clickXY, clickEl, hoverEl, dragXY, errors, logs, failed, sleep };
}

module.exports = { launch, sleep };
