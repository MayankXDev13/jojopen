const { launch, sleep } = require('./lib');
(async () => {
  const b = await launch({ url: 'https://jojopen.com/' });
  await sleep(3200);
  const shot = (n) => b.shot('/tmp/opencode/jojo/suite/' + n + '.png');
  const st = await b.evaluate(`(()=>{document.querySelector('[aria-label*="Sands of Time"]').click();return document.querySelector('[aria-label^="Stop recording"]')?'rec':'no'})()`);
  console.log('started', st);
  await sleep(700);
  await b.key('r', { code: 'KeyR', vk: 82 }); await sleep(250);
  await b.dragXY(200, 620, 330, 710); await sleep(500);
  await b.key('o', { code: 'KeyO', vk: 79 }); await sleep(250);
  await b.dragXY(380, 620, 490, 710); await sleep(500);
  console.log('stopbtn', await b.evaluate(`(()=>{const e=document.querySelector('[aria-label^="Stop recording"]');if(!e)return 'none';e.click();return 'clicked'})()`));
  await sleep(2200);
  await shot('21b-recordings');
  const rows = await b.evaluate(`(()=>[...document.querySelectorAll('button')].map(b=>({t:(b.innerText||'').trim().replace(/\\n/g,' '),tt:b.title})).filter(x=>/Sands|Replay|Record new/.test(x.t+x.tt)))()`);
  console.log('rows', rows);
  const clickRow = await b.evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(x=>/Replay Sands/.test(x.title||''));if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  console.log('clickRow', clickRow);
  if (clickRow) {
    await b.clickXY(clickRow.x, clickRow.y);
    await sleep(200); await shot('22a-replay-early');
    await sleep(1200); await shot('22b-replay-mid');
    await sleep(2200); await shot('22c-replay-late');
    console.log('after', await b.evaluate(`document.body.innerText.slice(-300)`));
  }
  console.log('ERR', JSON.stringify(b.errors).slice(0,400));
  b.proc.kill('SIGKILL'); process.exit(0);
})();
