// npm run ui-check: one row per UI.md item (U1-U14), run in Playwright at 390x844 and 360x640.
// Usage: node tools/scorecard/ui-check.cjs [--json out.json]
const fs = require('fs'), http = require('http'), path = require('path'), cp = require('child_process');
const L = require('./lib.cjs');
const P = require('./page.cjs');
const { table } = require('./report.cjs');

const VIEWPORTS = [{ w: 390, h: 844 }, { w: 360, h: 640 }];
const res = (id, title, ok, measured, target, note) => ({ id, title, result: ok === null ? 'Unknown' : ok ? 'Pass' : 'Fail', measured, target, note });
const names = list => [...new Set(list)].join(', ');

// Runs in the page. Describes what the player sees right now.
function snapshot() {
  const vw = innerWidth, vh = innerHeight;
  const visible = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width >= 1 && r.height >= 1 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && cs.visibility !== 'hidden';
  };
  const uncovered = (el, r) => {
    const top = document.elementFromPoint(Math.min(vw - 1, Math.max(0, r.x + r.width / 2)), Math.min(vh - 1, Math.max(0, r.y + r.height / 2)));
    return !!top && (el.contains(top) || top.contains(el));
  };
  const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const backdrop = el => { // background colour under el, or null when an image or gradient is involved
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c.a > 0) stack.push(c);
      if (c.a === 1) break;
    }
    let base = { r: 0, g: 0, b: 0, a: 1 };
    for (const c of stack.reverse()) base = over(c, base);
    return base;
  };
  const probe = document.createElement('i'); probe.style.background = 'var(--panel)'; document.body.appendChild(probe);
  const panel = getComputedStyle(probe).backgroundColor; probe.remove();

  const groups = new Map(), contrast = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const node = w.currentNode, el = node.parentElement, text = node.textContent.trim();
    if (!text || !el || el.closest('script,style,select,option,.devonly')) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const b = range.getBoundingClientRect();
    if (b.width < 1 || b.height < 1 || b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0 || !uncovered(el, b)) continue;
    let block = el;
    while (block.parentElement && /^(inline|contents)/.test(getComputedStyle(block).display)) block = block.parentElement;
    const n = text.split(/\s+/).filter(t => /[A-Za-z0-9]/.test(t)).length;
    if (!n) continue;
    const key = groups.get(block) || { text: '', n: 0 };
    key.n += n; key.text = (key.text + ' ' + text).trim(); groups.set(block, key);
    const bg = backdrop(el), fg = parse(cs.color);
    const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    if (!bg) contrast.push({ text: text.slice(0, 24), ratio: null, large });
    else {
      const f = over(fg, bg), l1 = lum(f), l2 = lum(bg);
      contrast.push({ text: text.slice(0, 24), ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), large });
    }
  }
  const controls = [];
  for (const el of document.querySelectorAll('button, summary, select, input, [role=button]')) {
    if (el.closest('.devonly,[hidden]')) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!visible(el) || !uncovered(el, r)) continue;
    const label = el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20);
    controls.push({ id: el.id || '', label, w: r.width, h: r.height, y: r.y + r.height / 2, bg: cs.backgroundColor, tag: el.tagName });
  }
  const primaries = controls.filter(c => c.tag === 'BUTTON' && c.bg !== 'rgba(0, 0, 0, 0)' && c.bg !== panel && c.id !== 'pwaGo');
  const scrolls = [document.scrollingElement, ...document.querySelectorAll('#app, #start, #howto, .howto, #overlay, .card, .debug')]
    .filter(e => e && visible(e) && e.scrollHeight > e.clientHeight + 1).map(e => (e.id || e.className || e.tagName) + ' ' + (e.scrollHeight - e.clientHeight) + 'px');
  const cells = [...document.querySelectorAll('.cell')].filter(visible).map(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height); });
  const fuseNums = [...document.querySelectorAll('.fuse-sec')].filter(visible).map(e => parseFloat(getComputedStyle(e).fontSize));
  const title = document.getElementById('stageTitle'), chip = document.getElementById('menu');
  return {
    words: [...groups.values()], controls, primaries, scrolls, contrast, vh,
    minCell: cells.length ? Math.min(...cells) : null,
    fuseNums, titleVisible: !!title && visible(title) && uncovered(title, title.getBoundingClientRect()), titlePx: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
    chipVisible: !!chip && visible(chip), chipPx: chip ? parseFloat(getComputedStyle(chip).fontSize) : 0,
    board: (r => [r.x, r.y, r.width, r.height].map(Math.round))(document.getElementById('board').getBoundingClientRect()),
    openSheets: ['settings', 'sound'].filter(id => document.getElementById(id).open),
  };
}

// Walk every screen once per viewport and snapshot it.
async function screens(browser, vp) {
  const out = [];
  const snap = async (name, page, extra = {}) => out.push({ name, vp, ...(await page.evaluate(snapshot)), ...extra });
  // Start, How to play (Normal has the longest page), Game, Settings, Volume
  let g = await P.newGame(browser, { ...vp });
  const { page } = g;
  await snap('Start', page);
  await page.click('#playChallenge');
  await page.waitForSelector('#howto:not([hidden])');
  await snap('How to play', page);
  await page.click('#howtoGo');
  await P.hintSwipe(page);
  await page.clock.runFor(500);
  await snap('Game', page);
  const boardBefore = await page.evaluate(() => { const r = document.getElementById('board').getBoundingClientRect(); return [r.x, r.y, r.width].map(Math.round); });
  await P.hintSwipe(page);
  await page.clock.runFor(800);
  const boardAfter = await page.evaluate(() => { const r = document.getElementById('board').getBoundingClientRect(); return [r.x, r.y, r.width].map(Math.round); });
  out[out.length - 1].boardMoved = boardBefore.join() !== boardAfter.join();
  await page.click('#settings summary');
  await page.clock.runFor(400);
  await snap('Settings sheet', page, { nested: await page.evaluate(() => document.querySelectorAll('#settings details, #settings dialog, #settings summary ~ details').length) });
  await page.click('#settings summary');
  await page.click('#sound summary');
  await page.clock.runFor(400);
  await snap('Volume sheet', page);
  await page.click('#sound summary');
  await g.context.close();
  // Biggest board, for cell size.
  g = await P.newGame(browser, { ...vp, saved: { 'split.stage.casual': '99' } });
  await P.begin(g.page, 'casual');
  await g.page.clock.runFor(500);
  await snap('Game 7x8', g.page);
  await g.context.close();
  // Win
  g = await P.newGame(browser, { ...vp });
  await P.begin(g.page, 'casual');
  while (await P.hintSwipe(g.page)) { /* solve stage 1 */ }
  await g.page.clock.runFor(2000);
  await snap('Win', g.page);
  await g.context.close();
  // Lose
  g = await P.newGame(browser, { ...vp });
  await P.begin(g.page, 'challenge');
  await P.hintSwipe(g.page);
  await P.runToBoom(g.page);
  await g.page.clock.runFor(1500);
  await snap('Lose', g.page);
  await g.context.close();
  return out;
}

async function swipeLatency(browser) {
  // Real time, no fake clock: DOM change after the swipe lands, then the next frame.
  const { context, page } = await P.newGame(browser, { clock: false });
  await P.begin(page, 'casual');
  await page.evaluate(() => {
    window.__lat = null;
    addEventListener('pointerup', () => {
      const t0 = performance.now();
      const mo = new MutationObserver(() => { mo.disconnect(); requestAnimationFrame(() => { window.__lat = performance.now() - t0; }); });
      mo.observe(document.getElementById('board'), { subtree: true, childList: true, attributes: true, characterData: true });
    }, true);
  });
  await P.hintSwipe(page);
  await page.waitForFunction(() => window.__lat != null);
  const ms = await page.evaluate(() => window.__lat);
  await context.close();
  return ms;
}

async function motion(browser, how) {
  const opts = how === 'os' ? { reducedMotion: 'reduce' } : { reducedMotion: 'no-preference' };
  const { context, page } = await P.newGame(browser, { ...opts, clock: false });
  await P.begin(page, 'casual');
  if (how === 'off') { await page.click('#settings summary'); await page.uncheck('#effects'); await page.click('#settings summary'); }
  await page.evaluate(() => {
    window.__worst = 0; window.__who = '';
    const first = new Map();
    const t0 = performance.now();
    (function frame() {
      for (const a of document.getAnimations()) {
        const el = a.effect && a.effect.target;
        if (!el || !el.getBoundingClientRect) continue;
        const r = el.getBoundingClientRect(), c = [r.x + r.width / 2, r.y + r.height / 2], size = Math.max(r.width, r.height, 1);
        if (!first.has(el)) first.set(el, c);
        const f = first.get(el), d = Math.hypot(c[0] - f[0], c[1] - f[1]) / size;
        if (d > window.__worst) { window.__worst = d; window.__who = el.className || el.tagName; }
      }
      if (performance.now() - t0 < 1500) requestAnimationFrame(frame);
    })();
  });
  await P.hintSwipe(page);
  await page.waitForTimeout(1600);
  const r = await page.evaluate(() => ({ worst: window.__worst, who: String(window.__who) }));
  await context.close();
  return r;
}

async function mutedCues(browser) {
  const { context, page } = await P.newGame(browser);
  await P.begin(page, 'challenge');
  await page.evaluate(() => { for (const id of ['sfxVol', 'musicVol']) { const e = document.getElementById(id); e.value = 0; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
  const snapBoard = () => page.evaluate(() => document.getElementById('board').innerHTML);
  const out = {};
  const b0 = await snapBoard();
  const h = await page.evaluate(() => nextHint());
  await P.hintSwipe(page);
  out.split = (await snapBoard()) !== b0;
  const b1 = await snapBoard();
  const j = await page.evaluate(h => splitTarget(S.cells, S.n, h.from, h.dir) , h).catch(() => -1);
  const dest = await page.evaluate(h => neighbour(S.n, h.from, h.dir, S.h), h);
  await P.swipe(page, dest, { up: 'down', down: 'up', left: 'right', right: 'left' }[h.dir]);
  out.rejoin = (await snapBoard()) !== b1;
  void j;
  const boom = await P.runToBoom(page);
  out.near = boom.lead != null && boom.lead >= 1;
  await page.clock.runFor(1000);
  out.boom = await page.evaluate(() => document.getElementById('board').classList.contains('shake') || !document.getElementById('overlay').hidden);
  await context.close();
  const w = await P.newGame(browser);
  await P.begin(w.page, 'casual');
  while (await P.hintSwipe(w.page)) { /* win */ }
  await w.page.clock.runFor(2000);
  out.win = await w.page.evaluate(() => !document.getElementById('overlay').hidden);
  await w.context.close();
  return out;
}

function serve() {
  const root = L.ROOT, types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const server = http.createServer((req, res_) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res_.writeHead(404); return res_.end(); }
    res_.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res_);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function offline(browser) {
  const server = await serve(), url = `http://127.0.0.1:${server.address().port}/index.html`;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(1500);
    await page.reload(); // the worker now controls the page
    await page.waitForTimeout(500);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => typeof S !== 'undefined' && S.board, null, { timeout: 5000 });
    await P.begin(page, 'casual');
    const ok = await page.evaluate(() => !!S.cells && S.cells.some(Boolean));
    await context.close();
    return ok;
  } catch (e) {
    return false;
  } finally { server.close(); }
}

function playerText() {
  const r = cp.spawnSync('node', ['test/e2e.cjs'], { cwd: L.ROOT, env: { ...process.env, ONLY: 'Player text' }, encoding: 'utf8', timeout: 120000 });
  return /Total: 1\/1 passed/.test(r.stdout || '');
}

async function run(browser) {
  const rows = [];
  const shots = [];
  for (const vp of VIEWPORTS) shots.push(...await screens(browser, vp));
  const vpName = s => `${s.vp.w}x${s.vp.h}`;
  const bad = (pred) => shots.filter(pred).map(s => `${s.name} @${vpName(s)}`);
  const total = s => s.words.reduce((a, g) => a + g.n, 0);

  // U1, U2
  const over50 = bad(s => total(s) > 50);
  const worst = shots.reduce((a, s) => (total(s) > total(a) ? s : a));
  rows.push(res('U1', 'About 50 words in view, at most', !over50.length, `max ${total(worst)} on ${worst.name}; over 50: ${over50.length ? names(over50) : 'none'}`, '<=50 words per screen'));
  const long = shots.flatMap(s => s.words.filter(g => g.n > 20).map(g => `${s.name} ${g.n}`));
  rows.push(res('U2', '20 words per block, at most', !long.length, long.length ? `over 20: ${names(long)}` : `max ${Math.max(...shots.flatMap(s => s.words.map(g => g.n)))}`, '<=20 words per text block'));
  // U3
  const prim = shots.filter(s => s.primaries.length > 1).map(s => `${s.name} ${s.primaries.length}`);
  rows.push(res('U3', 'One primary button per view', !prim.length, prim.length ? `more than one: ${names(prim)}` : 'one at most on every screen', '<=1 primary per screen',
    'Primary = a filled button that is not the plain panel colour.'));
  // U4
  const sheets = shots.filter(s => s.name === 'Settings sheet' || s.name === 'Volume sheet');
  const nestOk = sheets.every(s => !s.nested && s.openSheets.length === 1);
  rows.push(res('U4', 'Two levels deep, at most', nestOk, `Settings and Volume open in 1 tap; nested sheets: ${sheets.reduce((a, s) => a + (s.nested || 0), 0)}; sheets open at once: ${Math.max(...sheets.map(s => s.openSheets.length))}`, 'any setting in <=2 taps, no sheet opens another'));
  // U5
  const small = shots.flatMap(s => s.controls.filter(c => c.w < 44 || c.h < 44).map(c => `${c.label} ${Math.round(c.w)}x${Math.round(c.h)}`));
  const cells = shots.filter(s => s.minCell != null && s.minCell < 44).map(s => `${s.name} @${vpName(s)} cell ${s.minCell.toFixed(0)}px`);
  rows.push(res('U5', 'Tap targets are big enough', !small.length && !cells.length, [...new Set([...small, ...cells])].slice(0, 6).join('; ') || 'all >=44 px', 'every control and cell >=44 px at both viewports'));
  // U6
  const low = [];
  for (const s of shots) for (const c of s.controls) if (['restart', 'winNew', 'winRestart'].includes(c.id) && c.y < s.vh / 3) low.push(`${c.id} @${vpName(s)}`);
  rows.push(res('U6', 'Frequent controls sit in thumb reach', !low.length, low.length ? `in the top third: ${names(low)}` : 'Restart, Next stage and Try again are in the bottom two thirds', 'bottom two thirds of the screen', 'Hints sit in the Settings sheet, which is exempt.'));
  // U7
  const weak = shots.flatMap(s => s.contrast.filter(c => c.ratio != null && c.ratio < (c.large ? 3 : 4.5)).map(c => `${s.name} "${c.text}" ${c.ratio.toFixed(1)}`));
  const unknown = shots.reduce((a, s) => a + s.contrast.filter(c => c.ratio == null).length, 0);
  rows.push(res('U7', 'Text contrast', weak.length ? false : unknown ? null : true,
    weak.length ? `${new Set(weak).size} below 4.5:1, e.g. ${[...new Set(weak)].slice(0, 3).join('; ')}` : `all measured text >=4.5:1; ${unknown} text nodes over images or gradients not measured`, '>=4.5:1 (3:1 large text)',
    unknown ? 'Text over images or gradients cannot be measured from CSS.' : ''));
  // U8
  const game = shots.filter(s => s.name === 'Game');
  const u8 = game.every(s => s.titleVisible && s.chipVisible && s.titlePx >= 12 && s.chipPx >= 12 && s.fuseNums.length && s.fuseNums.every(p => p >= 12));
  rows.push(res('U8', 'The board and state read at a glance', u8,
    game.map(s => `@${vpName(s)} title ${s.titlePx}px, chip ${s.chipPx}px, fuse numbers ${s.fuseNums.length ? Math.min(...s.fuseNums) + 'px min' : 'none visible'}`).join('; '), 'stage, Difficulty chip and fuse numbers visible, >=12 px'));
  // U9
  const scrolls = shots.filter(s => s.scrolls.length).map(s => `${s.name} @${vpName(s)}: ${s.scrolls[0]}`);
  const moved = shots.filter(s => s.boardMoved).length;
  rows.push(res('U9', 'No scroll, no shift', !scrolls.length && !moved, scrolls.length ? `scrolls: ${names(scrolls)}` : `no screen scrolls; board moved after a swipe: ${moved ? 'yes' : 'no'}`, 'no scroll, board stays put'));
  // U10
  const lat = await swipeLatency(browser);
  rows.push(res('U10', 'Every swipe answers at once', lat <= 100, `within ${Math.ceil(lat / 50) * 50} ms to the next frame after the swipe lands`, '<=100 ms'));
  // U11
  const cues = await mutedCues(browser);
  rows.push(res('U11', 'Playable on mute', Object.values(cues).every(Boolean), Object.entries(cues).map(([k, v]) => `${k} ${v ? 'cue' : 'NO cue'}`).join(', '), 'every event has a visual cue with sound at 0',
    'Cue = the board changes, the near-boom warning shows, the board shakes or a dialog opens.'));
  // U12
  const os = await motion(browser, 'os'), off = await motion(browser, 'off');
  rows.push(res('U12', 'Motion can be turned down', os.worst <= 1 && off.worst <= 1,
    `OS reduce: largest move ${os.worst.toFixed(1)}x its own size (${os.who.slice(0, 20)}); Animations off: ${off.worst.toFixed(1)}x (${off.who.slice(0, 20)})`, 'no element moves more than its own size'));
  // U13
  const off13 = await offline(browser);
  rows.push(res('U13', 'Works offline', off13, off13 ? 'cold load with the network off reaches a playable board' : 'cold load offline did not reach a playable board', 'playable board offline after one visit'));
  // U14
  const pt = playerText();
  rows.push(res('U14', 'Copy stays in voice', pt, pt ? 'e2e "Player text" passes' : 'e2e "Player text" fails', 'e2e Player text passes'));
  return rows;
}

module.exports = { run };

if (require.main === module) {
  (async () => {
    const pw = P.loadPlaywright();
    if (!pw) { console.error('Playwright is not installed'); process.exit(2); }
    const browser = await pw.chromium.launch();
    const rows = await run(browser);
    await browser.close();
    console.log(table(rows, 'Kaboom Kitty ui-check (390x844, 360x640)'));
    const i = process.argv.indexOf('--json');
    if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(rows.map(({ id, result, measured }) => ({ id, result, measured })), null, 2) + '\n');
  })().catch(e => { console.error(e); process.exit(2); });
}
