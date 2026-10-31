// Scorecard rows that need the real page: S3, S4, S5, M1, M2, M12, M13, M17, M19.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const P = require('./page.cjs');
const { row } = require('./checks-model.cjs');

const SETTLE = 400; // ms of fake time for the first render to settle

// First-run words and the modeled time to the first swipe (M1, M2). Returns intro seconds per mode for the progress rows.
async function intro(browser, g) {
  const out = {};
  for (const mode of ['casual', 'challenge']) {
    const { context, page } = await P.newGame(browser);
    const start = (await P.visibleWords(page)).length;
    await page.click(mode === 'challenge' ? '#playChallenge' : '#playCasual');
    // How to play comes in pages. Reading all of them, one tap each, is what stands before the first swipe.
    let howto = 0, taps = 1, mostInView = 0;
    while (await page.isVisible('#howto')) {
      const n = (await P.visibleWords(page)).length;
      howto += n; mostInView = Math.max(mostInView, n);
      await page.click('#howtoGo'); taps++;
    }
    await context.close();
    const board = g.stageBoard(mode, 0);
    const first = L.stepCost(L.legalSteps(g, board.cells, board.n));
    const readS = (start + howto) / L.WORDS_PER_S;
    out[mode] = { start, howto: mostInView, introS: readS + taps * L.TAP_S, toSwipeS: readS + taps * L.TAP_S + first };
  }
  return out;
}

async function s3(browser) {
  // Kill: one move, reload, play again. Hidden: one move, app hidden for 5 s, then back.
  const a = await P.newGame(browser);
  await P.begin(a.page, 'challenge');
  await P.hintSwipe(a.page);
  const before = await a.page.evaluate(() => keyOf(S.cells));
  const fuseBefore = await P.fuseLeft(a.page);
  await P.hide(a.page, true);
  await a.page.clock.runFor(5000);
  await P.hide(a.page, false);
  const fuseAfter = await P.fuseLeft(a.page);
  const ate = Math.max(...fuseBefore) - Math.max(...fuseAfter);
  await a.page.reload();
  await a.page.waitForFunction(() => typeof S !== 'undefined' && S.board);
  await P.begin(a.page, 'challenge');
  const after = await a.page.evaluate(() => keyOf(S.cells));
  await a.context.close();
  const kept = after === before;
  return { kept, ate };
}

async function loseAndRetry(browser) {
  const { context, page } = await P.newGame(browser);
  await P.begin(page, 'challenge');
  await P.hintSwipe(page);
  const boom = await P.runToBoom(page);
  let delay = 0;
  while (delay < 5000 && await page.evaluate(() => document.getElementById('overlay').hidden)) { await page.clock.runFor(100); delay += 100; }
  const rect = await page.evaluate(() => { const r = document.getElementById('winRestart').getBoundingClientRect(); return { y: r.y + r.height / 2, vh: innerHeight }; });
  await page.click('#winRestart');
  const ready = await page.evaluate(() => !S.lost && document.getElementById('overlay').hidden && !!S.cells);
  await context.close();
  return { boom, delay, rect, ready };
}

async function howtoPause(browser) {
  const { context, page } = await P.newGame(browser);
  await P.begin(page, 'challenge');
  await P.hintSwipe(page);
  const before = Math.min(...await P.fuseLeft(page));
  await page.click('#help');
  await page.clock.runFor(40000);
  const lostWhile = await page.evaluate(() => S.lost);
  while (await page.isVisible('#howto')) await page.click('#howtoGo'); // How to play comes in pages
  const after = Math.min(...await P.fuseLeft(page));
  await context.close();
  return { lostWhile, ate: before - after };
}

async function geometry(browser) {
  // Biggest board (7x8) at 390 wide: smallest cell. Win dialog: where Next stage sits.
  const big = await P.newGame(browser, { saved: { 'split.stage.casual': '99' } });
  await P.begin(big.page, 'casual');
  const cell = await big.page.evaluate(() => Math.min(...[...document.querySelectorAll('.cell')].map(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height); })));
  const restart = await big.page.evaluate(() => { const r = document.getElementById('restart').getBoundingClientRect(); return { y: r.y + r.height / 2, vh: innerHeight }; });
  await big.context.close();
  const win = await P.newGame(browser);
  await P.begin(win.page, 'casual');
  while (await P.hintSwipe(win.page)) { /* solve stage 1 */ }
  await win.page.clock.runFor(2000);
  const next = await win.page.evaluate(() => { const r = document.getElementById('winNew').getBoundingClientRect(); return { y: r.y + r.height / 2, vh: innerHeight }; });
  await win.context.close();
  return { cell, restart, next };
}

async function stuckMessages(browser) {
  const { context, page } = await P.newGame(browser);
  await P.begin(page, 'casual');
  const msg = cells => page.evaluate(cells => {
    const tws = new Map();
    S.cells = cells.map(c => {
      if (!c) return null;
      const o = { v: c.v, c: c.c };
      if (c.tw != null) { if (!tws.has(c.tw)) tws.set(c.tw, { from: { v: c.v * 2, c: c.c }, left: null }); o.tw = tws.get(c.tw); }
      return o;
    });
    const r = document.querySelector('.cell[data-i="15"]').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, cells);
  // A press and release on an occupied cell renders the injected board without a move.
  const show = async cells => {
    const at = await msg(cells);
    await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.up();
    return page.evaluate(() => ({ text: document.getElementById('status').textContent, cls: document.getElementById('status').className }));
  };
  const stuck = await show(Array.from({ length: 16 }, (_, i) => (i === 0 ? null : { v: i === 15 ? 2 : 1, c: i })));
  const jam = await show(Array.from({ length: 16 }, (_, i) => (i === 0 ? null : i >= 14 ? { v: 2, c: 14, tw: 'a' } : { v: 1, c: i })));
  await context.close();
  return { stuck, jam };
}

async function hintSteps(browser) {
  const { context, page } = await P.newGame(browser);
  await P.begin(page, 'casual');
  await page.click('#settings summary');
  await page.click('#showSol');
  await page.click('#settings summary'); // close the sheet
  const read = () => page.evaluate(() => ({ arrows: document.querySelectorAll('.arrow').length, lit: document.querySelectorAll('.cell.hint-from').length, text: document.getElementById('status').textContent }));
  const first = await read();
  const from = await page.evaluate(() => nextHint().from);
  const at = await P.cellCenter(page, from);
  await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.up();
  const second = await read();
  await context.close();
  return { first, second };
}

async function run(browser, g, model, I) {
  const rows = [];
  const words = Math.max(I.casual.start, I.casual.howto, I.challenge.start, I.challenge.howto);
  rows.push(row('M1', 'First swipe fast', ['casual', 'challenge'].every(m => I[m].toSwipeS >= 20 && I[m].toSwipeS <= 60),
    `Casual ${I.casual.toSwipeS.toFixed(0)} s; Normal ${I.challenge.toSwipeS.toFixed(0)} s`, '20-60 s from cold load to first legal swipe (modeled)'));
  rows.push(row('M2', 'Few words before playing', words <= 50,
    `Start ${I.casual.start}; How to play ${I.casual.howto} (Casual), ${I.challenge.howto} (Normal)`, '<=50 words in any view before the first swipe'));

  const S3 = await s3(browser);
  const E = await loseAndRetry(browser);
  const H = await howtoPause(browser);
  rows.push(row('S3', 'An interruption costs nothing', S3.kept && S3.ate < 1,
    `board kept after kill: ${S3.kept ? 'yes' : 'no'}; fuse burned while hidden 5 s: ${Math.round(S3.ate)} s`, 'same board on return, 0 s of fuse burned'));
  rows.push(row('S4', 'Restart is instant', E.ready && E.delay <= 2000,
    `1 tap; Try again shows within ${(Math.ceil(E.delay / 500) / 2).toFixed(1)} s of the boom; board ready after tap: ${E.ready}`, '<=1 tap and <=2 s (game side, excluding the player\'s own reaction)'));

  const G = await geometry(browser);
  const third = r => r.y >= r.vh / 3;
  rows.push(row('S5', 'One thumb, one glance', G.cell >= 44 && third(G.restart) && third(E.rect) && third(G.next),
    `smallest cell ${G.cell.toFixed(0)} px on 7x8; Restart y ${G.restart.y.toFixed(0)}, Try again y ${E.rect.y.toFixed(0)}, Next stage y ${G.next.y.toFixed(0)} of ${G.restart.vh}`,
    'cell >=44 px at 390 wide; controls in the bottom two thirds', 'Hints sit in the Settings sheet, which S5 exempts.'));

  const lead = E.boom.lead;
  rows.push(row('M12', 'Fair fuse', lead != null && lead >= 2.9 && !H.lostWhile && H.ate < 1 && S3.ate < 1,
    `warning before boom ${lead == null ? 'n/a' : '~' + Math.round(lead)} s; fuse burned in How to play ${Math.round(H.ate)} s; hidden 5 s: ${Math.round(S3.ate)} s`,
    'warning >=3 s (less one 0.1 s game tick); no fuse runs while How to play or the app is hidden'));

  const M = await stuckMessages(browser);
  const stuckOk = /Stuck/.test(M.stuck.text), jamOk = /No room/.test(M.jam.text);
  const d = model.dead;
  rows.push(row('M13', 'Stuck is never silent', stuckOk && jamOk && d.dead === 0,
    `stuck: "${M.stuck.text}"; jammed: "${M.jam.text}"; dead boards with moves left: ${d.dead}/${d.checked} sampled (${d.unknown} too big to settle)`,
    'message within 1 move of no win being reachable', 'Sampled by bounded search on stages 1-4 only.'));

  const Hn = await hintSteps(browser);
  const direct = Hn.first.arrows > 0 || /\b(up|down|left|right)\b/.test(Hn.first.text);
  const second = Hn.second.arrows > 0;
  rows.push(row('M17', "Hints help, they don't play", direct || !second ? false : null,
    `first step: ${direct ? 'shows the direction' : Hn.first.lit ? 'lights the fight only' : 'nothing lit'}; second step (tap the fight): ${second ? 'shows the direction' : 'no direction'}; hint-follower clears ${model.hintFollowerWins}/200 stages`,
    'first tap highlights the fight only; second tap shows the direction; cheapskate and hint-follower finish',
    direct || !second ? 'The two steps are not both in place.' : 'Cheapskate is not measured: it needs a calibrated human-like solver.'));

  const html = fs.readFileSync(path.join(L.ROOT, 'index.html'), 'utf8');
  const hasDaily = /daily/i.test(html.replace(/<style[\s\S]*?<\/style>/g, ''));
  rows.push(row('M19', 'A reason to open it tomorrow', hasDaily ? null : false,
    hasDaily ? 'daily board code found' : 'no daily board in the game', 'a new daily board each day past stage 100, 1-3 min, same for everyone',
    hasDaily ? 'Present, but not yet testable. Add a date-keyed check.' : ''));
  return rows;
}

module.exports = { run, intro };
