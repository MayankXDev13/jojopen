/* Asserts the live collapse/reveal model for the four floating clusters.

   Run against the dev server:
     bun run dev --host 127.0.0.1
     node docs/harness/chrome-reveal.js

   Expectations, matching the live site at 1440x900:
   - every cluster starts with 0 secondary controls visible
   - hover reveals all of them
   - they stay open after 3 s while the pointer remains
   - they stay open briefly after the pointer leaves, then hide after the
     live ~1.2 s linger
   - the toolbar peek hint is visible while collapsed and hidden while open */

const { launch, sleep } = require('./lib');

const URL = process.env.JOJO_URL || 'http://127.0.0.1:5173/';
const CLUSTERS = [
  ['toolbar', '.toolbar'],
  ['rail', '.rail'],
  ['topright', '.topright'],
  ['bottomleft', '.bottomleft'],
];

(async () => {
  const b = await launch({ url: URL, port: 9540, profile: '/tmp/opencode/jojo/chrome-reveal' });
  await sleep(2400);

  const count = (sel) => b.evaluate(`(()=>{
    const els=[...document.querySelectorAll(${JSON.stringify(sel + ' .more')})];
    const shown=els.filter((e)=>{const c=getComputedStyle(e);const r=e.getBoundingClientRect();
      return c.visibility!=='hidden'&&parseFloat(c.opacity||'1')>0.05&&r.width>0&&r.height>0;});
    return {total:els.length,shown:shown.length};
  })()`);

  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail });

  for (const [name, sel] of CLUSTERS) {
    const idle = await count(sel);
    check(`${name}: collapsed initially`, idle.shown === 0, idle);
    check(`${name}: has secondary controls`, idle.total > 0, idle);

    const r = await b.rect(sel);
    await b.mouse('mouseMoved', r.x, r.y);
    await sleep(450);
    const open = await count(sel);
    check(`${name}: reveals on hover`, open.shown === idle.total, open);

    await sleep(3000);
    const stillOpen = await count(sel);
    check(`${name}: stays open after 3s`, stillOpen.shown === idle.total, stillOpen);

    await b.mouse('mouseMoved', 1200, 600);
    await sleep(500);
    const linger = await count(sel);
    check(`${name}: still open during the linger`, linger.shown === idle.total, linger);

    await sleep(1600);
    const hidden = await count(sel);
    check(`${name}: hides after the linger`, hidden.shown === 0, hidden);
  }

  // Peek hint belongs to the collapsed toolbar.
  const peek = await b.evaluate(`(()=>{const p=document.querySelector('.toolbar .peekhint');if(!p)return null;const c=getComputedStyle(p);return {display:c.display,opacity:parseFloat(c.opacity),height:p.getBoundingClientRect().height}})()`);
  check('toolbar: peek hint exists', !!peek, peek);
  check('toolbar: peek hint visible while collapsed', peek && peek.display !== 'none' && peek.opacity > 0.5, peek);

  const t = await b.rect('.toolbar');
  await b.mouse('mouseMoved', t.x, t.y);
  await sleep(400);
  const peekHover = await b.evaluate(`(()=>{const p=document.querySelector('.toolbar .peekhint');const c=getComputedStyle(p);return {opacity:parseFloat(c.opacity),height:p.getBoundingClientRect().height}})()`);
  check('toolbar: peek hint hides when revealed', peekHover.opacity < 0.1, peekHover);

  const errors = b.errors.slice(0, 10);
  const failed = b.failed.filter((f) => !/net::ERR_ABORTED/.test(f)).slice(0, 10);
  check('no console errors', errors.length === 0, errors);
  check('no failed requests', failed.length === 0, failed);

  b.ws.close();
  b.proc.kill();

  const failedChecks = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ' + JSON.stringify(r.detail)}`);
  console.log(`\n${results.length - failedChecks.length}/${results.length} checks passed`);
  process.exit(failedChecks.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
