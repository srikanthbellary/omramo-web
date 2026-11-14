#!/usr/bin/env node
/* Viewport and full-page captures through the Chrome DevTools Protocol, with console / CSP / overflow checks.
   No dependencies: headless Chrome + Node's built-in WebSocket (Node 22+).

   Usage: node _tools/cdp.mjs <out-dir> '<json jobs>'
   job: { "name": "home", "url": "http://127.0.0.1:8766/", "w": 1440, "h": 900, "mobile": false,
          "scrolls": [0, 600, "#levels"], "full": false, "reduce": false, "click": "#tab-med", "wait": 900 }
   "click" runs before the second scroll capture, so the first shows the state before it.
   Scroll targets are pixel offsets or selectors (scrolled to with an offset of -80px).
   Motion captures scroll in small steps so scroll-driven states look as they would for a person. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [outDir, jobsJson] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:8766';
const jobs = JSON.parse(jobsJson).map((j) => ({ ...j, url: j.url.startsWith('/') ? BASE + j.url : j.url }));
mkdirSync(outDir, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const profile = join(tmpdir(), 'omramo-cdp-' + port);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--disable-gpu',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const problems = [];
let current = '';
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result || msg.error); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') problems.push(current + ' EXCEPTION ' + msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
  if (msg.method === 'Log.entryAdded' && /error|warning/.test(msg.params.entry.level)) problems.push(current + ' LOG ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
  if (msg.method === 'Runtime.consoleAPICalled' && /error|warning/.test(msg.params.type)) problems.push(current + ' CONSOLE ' + msg.params.args.map((a) => a.value).join(' '));
};
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

for (const j of jobs) {
  current = `[${j.name}@${j.w}]`;
  await send('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h || 900, deviceScaleFactor: j.dpr || 1, mobile: !!j.mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: j.reduce ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: j.url });
  await sleep(j.wait || 1500);
  if (j.full) {
    // load every lazy image, then capture the whole document
    await evaluate(`(async()=>{document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));window.scrollTo(0,0)})()`);
    await sleep(600);
    // sections with content-visibility report an estimate until they render: grow the viewport until the height settles
    let h = 0;
    for (let i = 0; i < 5; i++) {
      const now = await evaluate('Math.ceil(document.documentElement.scrollHeight)');
      if (now === h) break;
      h = now;
      await send('Emulation.setDeviceMetricsOverride', { width: j.w, height: h, deviceScaleFactor: j.dpr || 1, mobile: !!j.mobile });
      await sleep(700);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(outDir, `${j.name}-${j.w}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`${j.name}-${j.w}.png`, j.w, h);
  }
  let n = 0;
  for (const s of j.scrolls || []) {
    const y = typeof s === 'number' ? s : await evaluate(`Math.max(0,Math.round(document.querySelector(${JSON.stringify(s)}).getBoundingClientRect().top+scrollY-80))`);
    // step there the way a wheel would, so rAF-driven states settle naturally
    await evaluate(`(async()=>{const from=scrollY,to=${y},n=Math.max(1,Math.min(90,Math.round(Math.abs(to-from)/60)));for(let i=1;i<=n;i++){window.scrollTo({top:from+(to-from)*i/n,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}})()`);
    await sleep(j.settle || 1300);
    if (j.click && n === 1) { await evaluate(`document.querySelector(${JSON.stringify(j.click)}).click()`); await sleep(900); }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = `${j.name}-${j.w}-s${String(n++).padStart(2, '0')}.png`;
    writeFileSync(join(outDir, file), Buffer.from(shot.data, 'base64'));
    console.log(file, 'y=' + y);
  }
  const over = await evaluate(`(()=>{const w=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>w+1||r.left<-1)&&!e.closest('[data-rail],[data-tiers],.aurora,.motes,[aria-hidden=true],.vh,.skip,details:not([open])')}).slice(0,6).map(e=>e.tagName+'.'+e.className);return JSON.stringify({scrollW:document.documentElement.scrollWidth,clientW:w,bad})})()`);
  console.log(current, 'overflow', over);
}
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No console errors, warnings or CSP violations.');
ws.close();
chrome.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
