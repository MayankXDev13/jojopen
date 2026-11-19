/* Parity probe: visits one base URL, measures the surfaces that differ between
   the live site and this port, and writes a manifest plus one screenshot per
   manifest entry.

   Usage:
     node docs/harness/parity.js --base http://127.0.0.1:5173/ --out /tmp/opencode/jojo/parity
     node docs/harness/parity.js --base https://jojopen.com/ --out docs/img/parity/baseline-2026-11-18 --tag live

   The same script works for both targets: it detects the live site's `cp-*`
   classes and falls back to the port's `data-act` hooks otherwise. */

const fs = require("fs");
const path = require("path");
const { launch, sleep } = require("./lib");

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("base", "http://127.0.0.1:5173/");
const OUT = arg("out", "/tmp/opencode/jojo/parity");
const TAG = arg("tag", "");
const LIVE = /(^|\.)jojopen\.com/.test(new URL(BASE).hostname);
const VIEWPORT = { width: 1440, height: 900 };

const SEL = LIVE
  ? {
      menu: '[title="Main menu"]',
      toolbar: ".cp-toolbar",
      rail: ".cp-rail",
      topright: ".cp-topright",
      bottom: ".cp-bottomleft",
      more: ".cp-more",
      context: ".cp-contextbar",
      random: '[title^="Random colors"]',
      dots: '[title^="Show background dots"]',
      rect: '[title="Rectangle (R)"]',
    }
  : {
      menu: '[data-act="menu"]',
      toolbar: ".toolbar",
      rail: ".rail",
      topright: ".topright",
      bottom: ".bottomleft",
      more: ".more",
      context: "#contextbar",
      random: '[data-act="random"]',
      dots: '[data-act="dots"]',
      rect: '[data-tool="rectangle"]',
    };

const entries = [];

function add(id, file, observations) {
  entries.push({ id, file, observations });
}

const visible = `(el)=>{const c=getComputedStyle(el);const r=el.getBoundingClientRect();return c.visibility!=='hidden'&&parseFloat(c.opacity||'1')>0.05&&r.width>0&&r.height>0}`;

async function cluster(b, id, sel) {
  const root = await b.rect(sel);
  if (!root) return { id, missing: true };
  const measure = `(()=>{const root=document.querySelector(${JSON.stringify(sel)});if(!root)return null;const vis=${visible};const kids=[...root.querySelectorAll(${JSON.stringify(SEL.more)})];return {total:kids.length,shown:kids.filter(vis).length,titles:kids.filter(vis).map(e=>(e.title||e.getAttribute('aria-label')||(e.innerText||'').trim()).slice(0,32))}})()`;
  const before = await b.evaluate(measure);
  await b.shot(path.join(OUT, `${id}-collapsed.png`));
  await b.mouse("mouseMoved", root.x, root.y);
  await sleep(450);
  const hovered = await b.evaluate(measure);
  await b.shot(path.join(OUT, `${id}-revealed.png`));
  await sleep(3000);
  const stillOpen = await b.evaluate(measure);
  await b.mouse("mouseMoved", 1200, 620);
  await sleep(550);
  const leftShort = await b.evaluate(measure);
  await sleep(1500);
  const leftLinger = await b.evaluate(measure);
  add(`${id}-collapsed`, `${id}-collapsed.png`, { before });
  add(`${id}-revealed`, `${id}-revealed.png`, {
    hovered,
    stillOpen,
    leftShort,
    leftLinger,
  });
  return { id, before, hovered, stillOpen, leftShort, leftLinger };
}

async function menuProbe(b) {
  const opened = await b.evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(SEL.menu)});if(!e)return 'MISSING';e.click();return 'ok';})()`,
  );
  await sleep(500);
  await b.shot(path.join(OUT, "menu-open.png"));
  const info = await b.evaluate(`(()=>{
    const root=document.querySelector(${JSON.stringify(LIVE ? ".cp-layermenu-pop" : ".mainmenu, .menu-pop, .sheet")});
    if(!root) return null;
    const r=root.getBoundingClientRect();const c=getComputedStyle(root);
    const items=[...root.querySelectorAll('button,a,[role=menuitem]')].map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ')).filter(Boolean);
    return {cls:(root.className&&root.className.baseVal!==undefined?root.className.baseVal:root.className),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),position:c.position,items:[...new Set(items)]};
  })()`);
  await b.mouse("mousePressed", 1100, 700, "left", 1);
  await b.mouse("mouseReleased", 1100, 700, "left", 1);
  await sleep(400);
  const closedOutside = await b.evaluate(
    `(()=>!document.querySelector(${JSON.stringify(LIVE ? ".cp-layermenu-pop" : ".mainmenu, .menu-pop, .sheet")}))()`,
  );
  add("menu-open", "menu-open.png", { opened, info, closedOutside });
  return { opened, info, closedOutside };
}

async function drawRect(b) {
  const tool = await b.evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(SEL.rect)});if(!e)return 'MISSING';e.click();return 'ok';})()`,
  );
  await sleep(250);
  const c = (await b.rect(".cp-canvas")) || (await b.rect(".canvas"));
  const cx = c ? c.x : 760;
  const cy = c ? c.y : 460;
  await b.dragXY(cx - 90, cy - 60, cx + 40, cy + 40);
  await sleep(500);
  return { tool, cx, cy };
}

async function contextProbe(b) {
  let selected = "unknown";
  if (LIVE) {
    await b.mouse("mousePressed", 280, 474, "left", 1);
    await b.mouse("mouseReleased", 280, 474, "left", 1);
    selected = "click-demo-node";
  } else {
    selected = (await drawRect(b)).tool;
  }
  await sleep(600);
  await b.shot(path.join(OUT, "contextbar.png"));
  const info = await b.evaluate(`(()=>{
    const cb=document.querySelector(${JSON.stringify(SEL.context)});
    if(!cb) return null;
    const r=cb.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
      buttons:[...cb.querySelectorAll('button')].map(e=>({title:e.title,aria:e.getAttribute('aria-label'),text:(e.innerText||'').trim().replace(/\\s+/g,' '),cls:e.className}))};
  })()`);
  add("contextbar", "contextbar.png", { selected, info });
  return { selected, info };
}

async function randomProbe(b) {
  const strokes = LIVE
    ? `(()=>[...document.querySelectorAll('.cp-canvas svg [stroke]')].map(e=>e.getAttribute('stroke')).filter(s=>s&&s!=='none').slice(0,40))()`
    : `(()=>Object.values(window.J.S.doc.elements).map(e=>({type:e.type,color:e.color,locked:e.colorLocked})))()`;
  const before = await b.evaluate(strokes);
  const clicked = await b.evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(SEL.random)});if(!e)return 'MISSING';e.click();return 'ok';})()`,
  );
  await sleep(700);
  await b.shot(path.join(OUT, "random-colors.png"));
  const after = await b.evaluate(strokes);
  add("random-colors", "random-colors.png", { clicked, before, after });
  return { clicked, before, after };
}

async function firstRun(b) {
  const info = await b.evaluate(`(()=>{
    const keys=Object.keys(localStorage).filter(k=>/jojopen/i.test(k));
    let elements=0;
    try {
      if(window.J&&window.J.S) elements=Object.keys(window.J.S.doc.elements).length;
      else {
        const live=localStorage.getItem('jojopen:scratch:v2');
        if(live) elements=Object.keys(JSON.parse(live).board?.elements||JSON.parse(live).elements||{}).length;
      }
    } catch {}
    return {keys,elements,boardName:(window.J&&window.J.S&&window.J.S.doc.name)||null};
  })()`);
  add("first-run", "base.png", { info });
  return info;
}

async function bundleInfo() {
  try {
    const html = await (await fetch(BASE)).text();
    return {
      bundle: (html.match(/assets\/(index-[^"']+\.js)/) || [])[1] || null,
      css: (html.match(/assets\/(index-[^"]+\.css)/) || [])[1] || null,
    };
  } catch {
    return { bundle: null, css: null };
  }
}

(async () => {
  /* Keep existing captures in the output directory; only overwrite the files
     this run produces. */
  fs.mkdirSync(OUT, { recursive: true });

  const b = await launch({
    url: BASE,
    port: LIVE ? 9501 : 9502,
    profile: `/tmp/opencode/jojo/parity-profile-${LIVE ? "live" : "local"}`,
    ...VIEWPORT,
  });
  await sleep(LIVE ? 6000 : 2600);
  await b.shot(path.join(OUT, "base.png"));

  const out = {
    generatedAt: new Date().toISOString(),
    target: LIVE ? "live" : "local",
    url: BASE,
    tag: TAG || (LIVE ? "live" : "local"),
    viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
    ...(await bundleInfo()),
  };

  out.firstRun = await firstRun(b);
  out.toolbar = await cluster(b, "toolbar", SEL.toolbar);
  out.rail = await cluster(b, "rail", SEL.rail);
  out.topright = await cluster(b, "topright", SEL.topright);
  out.bottom = await cluster(b, "bottombar", SEL.bottom);
  out.menu = await menuProbe(b);
  out.context = await contextProbe(b);
  out.random = await randomProbe(b);
  out.errors = b.errors.slice(0, 10);
  out.failed = b.failed.filter((f) => !/net::ERR_ABORTED/.test(f)).slice(0, 10);
  out.entries = entries;

  b.ws.close();
  b.proc.kill();

  const missing = entries
    .filter((e) => !fs.existsSync(path.join(OUT, e.file)))
    .map((e) => e.file);
  out.missingScreenshots = missing;
  fs.writeFileSync(
    path.join(OUT, "manifest.json"),
    JSON.stringify(out, null, 2),
  );

  console.log(
    JSON.stringify(
      {
        target: out.target,
        url: out.url,
        bundle: out.bundle,
        css: out.css,
        entries: entries.length,
        missing,
        errors: out.errors,
        failed: out.failed,
        manifest: path.join(OUT, "manifest.json"),
      },
      null,
      2,
    ),
  );
  process.exit(missing.length ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
