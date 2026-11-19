const { launch, sleep } = require("./lib");

(async () => {
  const b = await launch({ url: "https://jojopen.com/" });
  await sleep(3200);
  const log = {};
  const shot = (n) => b.shot("/tmp/opencode/jojo/suite/" + n + ".png");

  // start recording
  log.start = await b.evaluate(
    `(()=>{const e=document.querySelector('[aria-label*="Sands of Time"]');e.click();return e.getAttribute('aria-pressed')})()`,
  );
  await sleep(900);
  await shot("20-recording-active");
  log.state1 = await b.evaluate(
    `(()=>{const e=document.querySelector('[aria-label*="Sands of Time"]');return {pressed:e.getAttribute('aria-pressed'),cls:e.className.toString(),body:document.body.innerText.slice(-200)}})()`,
  );

  // draw rect
  await b.key("r", { code: "KeyR", vk: 82 });
  await sleep(300);
  await b.dragXY(200, 620, 330, 710);
  await sleep(500);
  // draw ellipse
  await b.key("o", { code: "KeyO", vk: 79 });
  await sleep(300);
  await b.dragXY(380, 620, 490, 710);
  await sleep(500);
  await shot("20b-recording-drawing");
  log.counts = await b.evaluate(
    `(()=>({labels:document.querySelectorAll('.cp-label').length, svgs:document.querySelectorAll('.cp-canvas svg').length}))()`,
  );

  // stop
  await b.evaluate(
    `(()=>{document.querySelector('[aria-label*="Sands of Time"]').click();return 1})()`,
  );
  await sleep(1800);
  await shot("21-recordings");
  log.panel = await b.evaluate(
    `(()=>{const p=[...document.querySelectorAll('div')].filter(e=>/Sands of Time|record/i.test(e.className.toString()));return p.map(e=>e.className.toString()+' :: '+e.innerText.slice(0,400))})()`,
  );
  log.tail = await b.evaluate(`document.body.innerText.slice(-900)`);
  log.rt = await b.evaluate(
    `(()=>[...document.querySelectorAll('button')].map(b=>({t:(b.innerText||'').trim(),tt:b.title,al:b.getAttribute('aria-label')})).filter(x=>x.tt&&/play|stop|record|delete|rename/i.test(x.tt)).slice(0,20))()`,
  );

  console.log(JSON.stringify(log, null, 1).slice(0, 9000));
  console.log("ERR", JSON.stringify(b.errors).slice(0, 600));
  b.proc.kill("SIGKILL");
  process.exit(0);
})();
