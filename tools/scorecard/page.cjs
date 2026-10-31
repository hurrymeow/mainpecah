// Browser helpers shared by the scorecard page rows and ui-check. Real mouse input, fake clock, no real waits.
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', '..', 'index.html'); // no ?dev: the player's screens
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { return null; }
}

// New page on a fake clock that still flows. clock.runFor(ms) advances time without waiting.
async function newGame(browser, { w = 390, h = 844, saved = {}, clock = true, reducedMotion = 'no-preference', url = URL, offline = false } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (Object.keys(saved).length) await page.addInitScript(s => { try { for (const k in s) if (!localStorage.getItem(k)) localStorage.setItem(k, s[k]); } catch (e) {} }, saved);
  if (clock) await page.clock.install();
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && S.board);
  return { context, page, errors };
}

const cellCenter = (page, i) => page.evaluate(i => {
  const r = document.querySelector(`.cell[data-i="${i}"]`).getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, i);

async function swipe(page, i, dir, dist = 40) {
  const { x, y } = await cellCenter(page, i);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + VEC[dir][0] * dist, y + VEC[dir][1] * dist, { steps: 4 });
  await page.mouse.up();
}

// Play the next step of the recorded solution with a real swipe. Returns false when the solution is done.
async function hintSwipe(page) {
  const h = await page.evaluate(() => nextHint());
  if (!h) return false;
  const before = await page.evaluate(() => keyOf(S.cells));
  if (h.join) {
    const j = await page.evaluate(h => neighbour(S.n, h.from, h.dir, S.h), h);
    const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[h.dir];
    await swipe(page, j, back);
  } else await swipe(page, h.from, h.dir);
  const after = await page.evaluate(() => keyOf(S.cells));
  if (after === before) throw new Error(`swipe ${h.from} ${h.dir} did not move`);
  return true;
}

// Start a mode from the start page and close the first-run How to play.
async function begin(page, mode) {
  await page.click(mode === 'challenge' ? '#playChallenge' : '#playCasual');
  while (await page.isVisible('#howto')) await page.click('#howtoGo'); // pages of at most 50 words
}

// Visible words: text the player can actually see right now (in the viewport, not covered, not hidden).
const visibleWords = page => page.evaluate(() => {
  const words = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const node = w.currentNode, el = node.parentElement, text = node.textContent.trim();
    if (!text || !el || el.closest('script,style,select,option,.devonly')) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const b = range.getBoundingClientRect();
    if (b.width < 1 || b.height < 1 || b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.x + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.y + b.height / 2)));
    if (!top || !(el.contains(top) || top.contains(el))) continue;
    for (const t of text.split(/\s+/)) if (/[A-Za-z0-9]/.test(t)) words.push(t);
  }
  return words;
});

const hide = (page, hidden) => page.evaluate(h => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

const fuseLeft = page => page.evaluate(() => { const now = Date.now(); return S.fuse.map(d => (d ? (d - now) / 1000 : null)).filter(x => x != null); });

// Let the Normal clock run until the first fuse blows. Records how long each fight showed a warning first.
async function runToBoom(page, limitMs = 60000) {
  const seen = {}; let t = 0;
  for (; t < limitMs; t += 100) {
    await page.clock.runFor(100);
    const r = await page.evaluate(() => ({
      danger: [...document.querySelectorAll('.danger')].map(e => e.closest('.cell') && +e.closest('.cell').dataset.i).filter(i => i != null),
      lost: S.lost, boom: S.anim && S.anim.boom != null ? S.anim.boom : null,
    }));
    for (const i of r.danger) if (!(i in seen)) seen[i] = t;
    // The fight that blows first is the one whose warning started first (the earliest deadline).
    if (r.lost) { const firstSeen = Object.values(seen); return { t, lead: firstSeen.length ? (t - Math.min(...firstSeen)) / 1000 : 0 }; }
  }
  return { t, lead: null };
}

module.exports = { URL, loadPlaywright, newGame, swipe, hintSwipe, begin, visibleWords, hide, fuseLeft, runToBoom, cellCenter };
