// Run: node test/e2e.cjs  — drives index.html in headless Chromium with real mouse and touch input.
// Uses the pre-installed Playwright; prints one PASS/FAIL line per case and a total.
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.join(__dirname, '..', 'index.html') + '?dev'; // dev controls on
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const RED = '255, 71, 87';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function check(cond, msg) { if (!cond) throw new Error(msg); }

let browser;

// ---------- page helpers ----------
async function open(opts = {}, withSettings = true) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...opts });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.__pt = [];
    window.__ups = [];
    window.__downs = [];
    addEventListener('pointerdown', e => { __pt.push(e.pointerType); __downs.push(performance.now()); }, true);
    addEventListener('pointerup', e => __ups.push(performance.now()), true);
    window.__ev = [];
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) addEventListener(t, e => __ev.push(t[7] + Math.round(performance.now()) + (t === 'pointerdown' ? ':' + (e.target.id || e.target.className || e.target.tagName) + '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY) : '')), true);
    window.__long = [];
    try { new PerformanceObserver(l => l.getEntries().forEach(x => __long.push(Math.round(x.startTime) + '+' + Math.round(x.duration)))).observe({ type: 'longtask' }); } catch (e) {}
  });
  await page.goto(URL);
  await ready(page);
  await page.click('#playCasual'); // past the start page
  await skipHowto(page);
  if (withSettings) await openSettings(page);
  const cdp = await context.newCDPSession(page);
  return { context, page, errors, cdp };
}
// The first entry into each mode opens How to play; most tests just close it.
const skipHowto = async page => { if (await page.isVisible('#howto')) await page.click('#howtoGo'); };
const ready = page => page.waitForFunction(() => typeof S !== 'undefined' && S.board);
// The dev controls live in a collapsed panel; open it with a real tap before using them.
async function openSettings(page) {
  if (!(await page.evaluate(() => document.getElementById('settings').open))) await page.click('#settings summary');
}
const key = page => page.evaluate(() => keyOf(S.cells));

async function center(page, i) {
  // Measured in one evaluate: renders replace the cells (e.g. the post-hop re-render), detaching locator handles.
  const b = await page.evaluate(i => { const r = document.querySelector(`.cell[data-i="${i}"]`).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, i);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

// Mouse drag from cell i toward dir by dist px. mid() runs before release.
async function mouseSwipe(page, i, dir, dist = 40, mid) {
  const { x, y } = await center(page, i);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + VEC[dir][0] * dist, y + VEC[dir][1] * dist, { steps: 4 });
  const r = mid ? await mid() : undefined;
  await page.mouse.up();
  return r;
}

// Touch drag through CDP so the page sees touch-type pointer events. cancel ends with touchcancel.
async function touchSwipe(page, cdp, i, dir, dist = 40, { mid, cancel } = {}) {
  const { x, y } = await center(page, i);
  const pt = (px, py) => [{ x: px, y: py, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x, y) });
  for (let s = 1; s <= 4; s++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x + VEC[dir][0] * dist * s / 4, y + VEC[dir][1] * dist * s / 4) });
  }
  const r = mid ? await mid() : undefined;
  await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  return r;
}

// Swipe the move nextHint() suggests; returns false if there is none.
async function hintSwipe(page) {
  const h = await page.evaluate(() => nextHint());
  if (!h) return false;
  const before = await key(page);
  await mouseSwipe(page, h.from, h.dir);
  const after = await key(page);
  const why = after === before ? await page.evaluate(() => JSON.stringify({ drag: S.drag, won: S.won, lost: S.lost, ev: __ev.slice(-12), long: __long.slice(-5), now: Math.round(performance.now()) })) : '';
  check(after !== before, `hint swipe ${h.from} ${h.dir} did not split ${why}`);
  return true;
}

// Replace the board and render it through a real press/release on an occupied cell (no move).
async function inject(page, n, entries) {
  const at = await page.evaluate(([n, entries]) => {
    const cells = new Array(n * n).fill(null);
    for (const [i, v, c] of entries) cells[i] = { v, c };
    S.cells = cells; S.history = [];
    return entries[0][0];
  }, [n, entries]);
  const { x, y } = await center(page, at);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
}

const ghostAt = page => page.evaluate(() => [...document.querySelectorAll('.tile.ghost')].map(t => +t.parentElement.dataset.i));
const fuseLeft = page => page.evaluate(() => { const now = Date.now(); return S.fuse.map(d => (d ? d - now : null)); });

// Find a board with two separate fights of 4+ that can each split, then load it via the Restart button.
async function loadFusePlan(page) {
  const plan = await page.evaluate(() => {
    const n = 4;
    for (let k = 0; k < 500; k++) {
      const b = generate(n, 4), c = b.cells;
      for (let A = 0; A < n * n; A++) for (const dA in DIRS) {
        if (!c[A] || c[A].v < 4) continue;
        const c1 = applySplit(c, n, A, dA);
        if (!c1) continue;
        const jA = neighbour(n, A, dA);
        for (let B = 0; B < n * n; B++) for (const dB in DIRS) {
          if (B === A || B === jA || !c1[B] || c1[B].v < 4) continue;
          if (applySplit(c1, n, B, dB)) { S.board = b; return { A, dA, jA, B, dB, jB: neighbour(n, B, dB) }; }
        }
      }
    }
    return null;
  });
  check(plan, 'no board with two 4+ fights found');
  await page.click('#restart');
  return plan;
}

// ---------- cases ----------
const cases = [];
const test = (name, fn) => (!process.env.ONLY || name.includes(process.env.ONLY)) && cases.push({ name, fn });

test('Boot', async () => {
  const out = [];
  for (const [w, h] of [[360, 640], [390, 844], [430, 932]]) {
    const { context, page, errors } = await open({ viewport: { width: w, height: h }, isMobile: true, deviceScaleFactor: 2 }, false);
    await sleep(400);
    const m = await page.evaluate(() => ({
      closed: !document.getElementById('settings').open,
      sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth,
      bh: document.body.scrollHeight, bw: document.body.scrollWidth,
      iw: innerWidth, ih: innerHeight,
      bottom: Math.max(...[...document.querySelectorAll('#app > *')].map(e => e.getBoundingClientRect().bottom)),
      right: Math.max(...[...document.querySelectorAll('#app *')].map(e => e.getBoundingClientRect().right)),
    }));
    await context.close();
    check(m.closed, `${w}x${h}: settings panel open by default`);
    check(!errors.length, `${w}x${h}: errors: ${errors.join(' | ')}`);
    check(m.sh === m.ih && m.sw === m.iw && m.bh === m.ih && m.bw === m.iw, `${w}x${h}: scroll ${m.sw}x${m.sh} vs viewport ${m.iw}x${m.ih}`);
    check(m.bottom <= m.ih && m.right <= m.iw, `${w}x${h}: content overflows (${Math.round(m.right)}x${Math.round(m.bottom)})`);
    out.push(`${w}x${h}`);
  }
  return `no errors, no scroll at ${out.join(', ')}`;
});

test('Swipe', async () => {
  const { context, page, errors, cdp } = await open();
  await page.selectOption('#fuse', '0');
  // 4 = 2 at the left edge, 5 = 4 with 1-tile neighbour at 6.
  await inject(page, 4, [[5, 4, 0], [4, 2, 2], [6, 1, 1]]);
  const same = async (label, fn) => {
    const k = await key(page); await fn();
    check((await key(page)) === k, `${label} changed the board`);
  };
  await same('swipe into occupied cell', () => mouseSwipe(page, 5, 'right'));
  await same('swipe off the edge', () => mouseSwipe(page, 4, 'left'));
  await same('swipe on a 1', () => mouseSwipe(page, 6, 'down'));
  await same('19px mouse drag', () => mouseSwipe(page, 5, 'down', 19));
  await mouseSwipe(page, 5, 'down', 21);
  let c = await page.evaluate(() => S.cells.map(t => t && t.v));
  check(c[5] === 2 && c[9] === 2, '21px mouse drag did not split');
  await same('19px touch drag', () => touchSwipe(page, cdp, 5, 'up', 19));
  await touchSwipe(page, cdp, 5, 'up', 21);
  c = await page.evaluate(() => S.cells.map(t => t && t.v));
  check(c[5] === 1 && c[1] === 1, '21px touch drag did not split');
  // Ghost: shown mid-drag in the destination, gone after release.
  const mid = await mouseSwipe(page, 4, 'down', 30, () => ghostAt(page));
  check(mid.length === 1 && mid[0] === 8, `mouse ghost mid-drag at [${mid}], want [8]`);
  check(!(await ghostAt(page)).length, 'ghost left after release');
  // Ghost gone after pointercancel, and nothing moves.
  await same('cancelled touch drag', async () => {
    const g = await touchSwipe(page, cdp, 9, 'down', 30, { mid: () => ghostAt(page), cancel: true });
    check(g.length === 1 && g[0] === 13, `touch ghost mid-drag at [${g}], want [13]`);
  });
  check(!(await ghostAt(page)).length, 'ghost left after pointercancel');
  const types = await page.evaluate(() => [...new Set(__pt)]);
  await context.close();
  check(types.includes('mouse') && types.includes('touch'), `pointer types seen: ${types}`);
  check(!errors.length, errors.join(' | '));
  return '19px no-op, 21px split (mouse+touch); occupied/edge/1 no-op; ghost shows and clears';
});

test('Full solve', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('#fuse', '0');
  const out = [];
  for (const n of [4, 5, 6]) {
    await page.click(`#sizes button[data-n="${n}"]`);
    let moves = 0;
    // One undo along the way so the overlay's undo count is non-trivial.
    await hintSwipe(page); moves++;
    await page.click('#undo');
    while (await hintSwipe(page)) moves++;
    await page.waitForSelector('#overlay:not([hidden])', { timeout: 3000 });
    const r = await page.evaluate(() => ({
      win: S.won, title: document.getElementById('winTitle').textContent,
      time: document.getElementById('winTime').textContent, undos: document.getElementById('winUndos').textContent,
    }));
    check(r.win, `${n}x${n}: not won`);
    check(/^\d+:\d\d$/.test(r.time), `${n}x${n}: win time "${r.time}"`);
    check(r.undos === '1', `${n}x${n}: win undos "${r.undos}", want 1`);
    out.push(`${n}x${n} ${moves} swipes ${r.time}`);
    await page.click('#winNew');
  }
  await context.close();
  check(!errors.length, errors.join(' | '));
  return out.join('; ') + '; overlay shows time and undos';
});

test('Undo/Restart/New', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('#fuse', '0');
  const k0 = await key(page);
  const undos = () => page.textContent('#undos');
  for (let m = 0; m < 3; m++) check(await hintSwipe(page), 'no hint');
  await sleep(1100);
  for (let u = 1; u <= 3; u++) { await page.click('#undo'); check(await undos() === String(u), `undo counter ${await undos()}, want ${u}`); }
  check(await key(page) === k0, 'three undos did not restore the start');
  for (let m = 0; m < 2; m++) await hintSwipe(page);
  await page.click('#undo'); await page.click('#undo');
  check(await undos() === '5', `undo counter ${await undos()}, want 5`);
  await hintSwipe(page);
  await sleep(1100);
  check(await page.textContent('#time') !== '0:00', 'timer not running');
  await page.click('#restart');
  await sleep(1200);
  const r = await page.evaluate(() => ({ k: keyOf(S.cells), b: keyOf(S.board.cells), t0: S.t0, h: S.history.length }));
  check(r.k === k0 && r.b === k0, 'Restart did not restore the same board');
  check(await page.textContent('#time') === '0:00' && r.t0 === 0, 'Restart did not reset timer');
  check(await undos() === '0' && r.h === 0, 'Restart did not reset undos');
  check(await page.isDisabled('#undo'), 'Undo enabled after Restart');
  let changed = false;
  for (let t = 0; t < 3 && !changed; t++) { await page.click('#sizes .on'); changed = (await key(page)) !== k0; }
  check(changed, 'Re-picking the size did not deal a new board');
  for (const n of [5, 6]) {
    const b0 = await page.evaluate(() => S.board);
    await page.click(`#sizes button[data-n="${n}"]`);
    const s = await page.evaluate(() => ({ n: S.n, cells: document.querySelectorAll('.cell').length, on: document.querySelector('#sizes .on').dataset.n }));
    check(s.n === n && s.cells === n * n && s.on === String(n), `size ${n}: got n=${s.n} cells=${s.cells} on=${s.on}`);
    check(await page.evaluate(b => S.board.cells.length !== b.cells.length, b0), `size ${n}: board not regenerated`);
  }
  const k6 = await key(page);
  await page.focus('#tiles');
  await page.keyboard.press('ArrowRight');
  const t = await page.evaluate(() => ({ target: S.target, out: document.getElementById('tilesOut').textContent, tiles: S.cells.filter(Boolean).length, bt: S.board.tiles }));
  check(t.target === 12 && t.out === '12', `slider: target ${t.target}, label ${t.out}, want 12`);
  check((await key(page)) !== k6 && t.tiles === t.bt, 'slider did not regenerate the board');
  await context.close();
  check(!errors.length, errors.join(' | '));
  return `undo x5 counted, restart resets, new board differs, sizes 5/6 and slider (12 -> ${t.bt} tiles) regenerate`;
});

test('Stuck', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('#fuse', '0');
  // Cell 0 empty, its neighbours are 1s; the only fight (15) has no empty neighbour.
  const entries = [];
  for (let i = 1; i < 16; i++) entries.push([i, i === 15 ? 2 : 1, i]);
  await inject(page, 4, entries);
  await page.waitForFunction(() => /Stuck/.test(document.getElementById('status').textContent), null, { timeout: 2000 }).catch(() => {});
  const r = await page.evaluate(() => {
    const st = document.getElementById('status'), tile = document.querySelector('.cell[data-i="15"] .tile');
    const blob = tile && tile.querySelector('.blob');
    return {
      text: st.textContent, cls: st.className, stuck: isStuck(S.cells, S.n),
      blocked: [...document.querySelectorAll('.tile.blocked')].map(t => +t.parentElement.dataset.i),
      shadow: (tile ? getComputedStyle(tile).boxShadow : 'no tile') + ' ' + (blob ? getComputedStyle(blob).filter + ' ' + getComputedStyle(blob).boxShadow : ''),
      color: getComputedStyle(st).color,
      why: JSON.stringify({ drag: S.drag, won: S.won, lost: S.lost, downs: __downs.length, ups: __ups.length, key: keyOf(S.cells), n: S.n, stage: S.stage, ev: __ev.filter(x => x[0] !== 'm'), long: __long, board: (r => [r.x, r.y, r.width].map(Math.round))(document.getElementById('board').getBoundingClientRect()) }),
    };
  });
  await context.close();
  check(r.stuck, 'injected board is not stuck per isStuck()');
  check(/Stuck/.test(r.text) && r.cls === 'bad', `status "${r.text}" class "${r.cls}" ${r.why}`);
  check(r.color.includes(RED), `status colour ${r.color}`);
  check(r.blocked.length === 1 && r.blocked[0] === 15, `blocked tiles [${r.blocked}], want [15]`);
  check(r.shadow.includes(RED), `blocked tile not red: ${r.shadow}`);
  check(!errors.length, errors.join(' | '));
  return 'status "Stuck", red status, tile 15 highlighted red';
});

test('Fuse', async () => {
  // Fuse Off runs alongside: one move, then 25s with nothing exploding.
  const offRun = (async () => {
    const { context, page, errors } = await open();
    await page.selectOption('#fuse', '0');
    await hintSwipe(page);
    await sleep(25000);
    const r = await page.evaluate(() => ({ lost: S.lost, hidden: document.getElementById('overlay').hidden, bars: document.querySelectorAll('.fuse').length, fuse: S.fuse.some(Boolean) }));
    await context.close();
    check(!r.lost && r.hidden && !r.bars && !r.fuse, `fuse Off: lost=${r.lost} overlay hidden=${r.hidden} bars=${r.bars}`);
    check(!errors.length, errors.join(' | '));
  })();

  const { context, page, errors } = await open();
  await page.selectOption('#fuse', '8');
  const p = await loadFusePlan(page);
  await sleep(1500);
  const pre = await page.evaluate(() => ({
    t0: S.t0, live: document.getElementById('board').classList.contains('live'), armed: S.fuse.some(Boolean),
    danger: document.querySelectorAll('.danger').length,
    tf: [...document.querySelectorAll('.fuse')].map(f => getComputedStyle(f).transform),
  }));
  check(!pre.t0 && !pre.live && !pre.armed && !pre.danger, 'fuses burning before the first move');
  check(pre.tf.length && pre.tf.every(t => t === 'none' || t.startsWith('matrix(1,')), `fuse bars moved before first move: ${pre.tf}`);
  await mouseSwipe(page, p.A, p.dA);
  let left = await fuseLeft(page);
  const fights1 = await page.evaluate(() => S.cells.map((t, i) => (t && t.v > 1 ? i : -1)).filter(i => i >= 0));
  check(fights1.every(i => left[i] > 7600 && left[i] <= 8000), `after first move fuses not full: ${fights1.map(i => left[i])}`);
  await sleep(2000);
  await mouseSwipe(page, p.B, p.dB);
  left = await fuseLeft(page);
  check(left[p.B] > 7700 && left[p.jB] > 7700, `split halves not fresh: ${left[p.B]}, ${left[p.jB]}`);
  check(left[p.A] > 5000 && left[p.A] < 6400 && left[p.jA] > 5000 && left[p.jA] < 6400, `other fights not burning: ${left[p.A]}, ${left[p.jA]}`);
  await sleep(3400); // first pair now under 3s, second pair near 4.5s
  const d = await page.evaluate(p => ({
    a: !!document.querySelector(`.cell[data-i="${p.A}"] .tile.danger`), b: !!document.querySelector(`.cell[data-i="${p.B}"] .tile.danger`),
  }), p);
  left = await fuseLeft(page);
  check(d.a && left[p.A] < 3000, `no .danger at ${left[p.A]}ms left`);
  check(!d.b, `.danger shown at ${left[p.B]}ms left`);
  await page.waitForFunction(() => S.lost, null, { timeout: 4000, polling: 50 });
  const b = await page.evaluate(() => ({ el: S.elapsed, boom: document.querySelector('.tile.boom') && +document.querySelector('.tile.boom').parentElement.dataset.i }));
  // Any fight armed at the first move can go first; the freshly split pair cannot.
  check(b.boom >= 0 && b.boom !== p.B && b.boom !== p.jB, `boom at ${b.boom}, fresh pair is ${p.B}/${p.jB}`);
  check(b.el >= 7900 && b.el <= 8400, `exploded at ${b.el}ms, want ~8000`);
  await page.waitForSelector('#overlay:not([hidden])', { timeout: 2000 });
  const title = await page.textContent('#winTitle');
  check(title === 'Cat fight!', `overlay title "${title}"`);
  check(!(await page.isVisible('#winNew')), 'lose dialog still offers New board');

  // Undo keeps fights burning: no refill for fights the undone split didn't touch.
  await page.click('#winRestart');
  const q = await loadFusePlan(page);
  await mouseSwipe(page, q.A, q.dA);
  await sleep(1500);
  const atMove = (await fuseLeft(page))[q.B];
  await mouseSwipe(page, q.B, q.dB);
  await sleep(2500);
  const before = await fuseLeft(page);
  await page.click('#undo');
  const after = await fuseLeft(page);
  const undos = await page.textContent('#undos');
  check(undos === '1', `undo counter ${undos}`);
  check(after[q.B] <= atMove + 200, `undone fight refilled: ${after[q.B]}ms, had ${atMove}ms at its split`);
  const refilled = before.map((v, i) => (v != null && i !== q.B && i !== q.jB && Math.abs(after[i] - v) > 300 ? `${i}:${v}->${after[i]}` : null)).filter(Boolean);
  check(!refilled.length, `undo refilled untouched fights ${refilled.join(', ')}`);
  await context.close();
  check(!errors.length, errors.join(' | '));
  await offRun;
  return `idle before first move; fresh halves, others burn; .danger <3s; boom at ${b.el}ms with "Cat fight!"; undo no refill; Off safe 25s`;
});

test('Skins', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('#fuse', '0');
  const out = [];
  for (const skin of ['kittens', 'slimes', 'numbers']) {
    await page.selectOption('#skin', skin);
    await page.waitForFunction(() => [...document.querySelectorAll('.tile img')].every(im => im.complete));
    const r = await page.evaluate(skin => {
      let bad = [];
      S.cells.forEach((t, i) => {
        const cell = document.querySelector(`.cell[data-i="${i}"]`), tile = cell.querySelector('.tile');
        if (!t) { if (tile || !cell.querySelector(skin === 'kittens' ? '.bed' : '.dot')) bad.push(i); return; }
        if (!tile) return bad.push(i);
        if (skin === 'kittens') { const im = tile.querySelector('.blob.kit img'); if (!im || !im.naturalWidth) bad.push(i); }
        if (skin === 'slimes' && !(tile.querySelector('.blob:not(.kit)') && tile.querySelectorAll('.eye').length === 2)) bad.push(i);
        if (skin === 'numbers' && tile.textContent.trim() !== String(t.v)) bad.push(i);
      });
      return { bad, count: S.cells.filter(Boolean).length };
    }, skin);
    check(!r.bad.length, `${skin}: cells ${r.bad} render wrong`);
    out.push(`${skin} ${r.count}`);
  }
  await page.selectOption('#skin', 'slimes');
  await page.reload(); await ready(page); await page.click('#playCasual'); await openSettings(page);
  const persisted = await page.evaluate(() => ({ s: S.skin, v: document.getElementById('skin').value, slime: !!document.querySelector('.tile.slime:not(.kitten)') }));
  check(persisted.s === 'slimes' && persisted.v === 'slimes' && persisted.slime, `skin after reload: ${JSON.stringify(persisted)}`);
  await page.selectOption('#skin', 'kittens');
  await page.reload(); await ready(page); await page.click('#playCasual'); await openSettings(page);
  check(await page.evaluate(() => S.skin === 'kittens' && !!document.querySelector('.tile.kitten')), 'kittens did not persist');

  // Effects off: only fuse bars animate.
  await page.click('#effects');
  await page.selectOption('#fuse', '8');
  const anims = [];
  for (const skin of ['kittens', 'slimes', 'numbers']) {
    await page.selectOption('#skin', skin);
    await hintSwipe(page);
    await sleep(500);
    const a = await page.evaluate(() => document.getAnimations()
      .filter(x => x.playState === 'running' && x.effect && x.effect.target && x.effect.target.closest('.tile'))
      .map(x => ({ fuse: x.effect.target.classList.contains('fuse'), name: x.animationName || x.transitionProperty, cls: x.effect.target.className })));
    const other = a.filter(x => !x.fuse);
    check(!other.length, `${skin}: running tile animations with effects off: ${other.map(x => `${x.name}@${x.cls}`).join(', ')}`);
    check(a.some(x => x.fuse), `${skin}: fuse bars not animating`);
    anims.push(`${skin} ${a.length} fuse`);
  }
  await context.close();
  check(!errors.length, errors.join(' | '));
  return `all tiles render (${out.join(', ')}); skin persists; effects off -> only fuse bars animate`;
});

test('Regression: swipe during hop', async () => {
  const { context, page, errors, cdp } = await open();
  await page.selectOption('#fuse', '0');
  // 5 = 4 splits right into 6; the kitten hopping into 6 starts over cell 5.
  await inject(page, 4, [[5, 4, 0]]);
  await touchSwipe(page, cdp, 5, 'right');
  await touchSwipe(page, cdp, 5, 'down');
  const r = await page.evaluate(() => ({ c: S.cells.map(t => t && t.v), gap: __downs[__downs.length - 1] - __ups[__ups.length - 2] }));
  await context.close();
  check(r.c[6] === 2, 'first split did not land in 6');
  check(r.gap < 300, `second swipe started ${Math.round(r.gap)}ms after the split, want <300`);
  check(r.c[9] === 1 && r.c[5] === 1 && r.c[10] == null, `second swipe hit the wrong tile: 5=${r.c[5]} 9=${r.c[9]} 10=${r.c[10]}`);
  check(!errors.length, errors.join(' | '));
  return `swipe ${Math.round(r.gap)}ms after split split the cell under the finger`;
});

test('Show solution', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('#fuse', '0');
  await page.click('#showSol');
  const h = await page.evaluate(() => {
    const h = nextHint(), dst = neighbour(S.n, h.from, h.dir);
    const arrow = document.querySelector(`.cell[data-i="${h.from}"] .arrow`);
    return { h, dst, arrow: arrow && arrow.textContent, outline: [...document.querySelectorAll('.cell.hint-dst')].map(c => +c.dataset.i),
      shadow: getComputedStyle(document.querySelector(`.cell[data-i="${dst}"]`)).boxShadow, status: document.getElementById('status').textContent };
  });
  check(h.arrow === { up: '↑', down: '↓', left: '←', right: '→' }[h.h.dir], `arrow "${h.arrow}" for ${h.h.dir}`);
  check(h.outline.length === 1 && h.outline[0] === h.dst && h.shadow.includes('inset'), `target outline on [${h.outline}], want ${h.dst}`);
  check(/^Hint:/.test(h.status), `status "${h.status}"`);
  let off = null;
  for (let t = 0; t < 5 && !off; t++) {
    off = await page.evaluate(() => {
      for (let i = 0; i < S.n * S.n; i++) for (const d in DIRS) {
        const nx = applySplit(S.cells, S.n, i, d);
        if (nx && !S.board.path.includes(keyOf(nx))) return { i, d };
      }
      return null;
    });
    if (!off) await page.click('#sizes .on');
  }
  check(off, 'no off-path move found');
  await mouseSwipe(page, off.i, off.d);
  const s = await page.evaluate(() => ({ text: document.getElementById('status').textContent, arrows: document.querySelectorAll('.arrow').length, out: document.querySelectorAll('.hint-dst').length }));
  await context.close();
  check(/off the solution path/i.test(s.text), `status after off-path move: "${s.text}"`);
  check(!s.arrows && !s.out, 'hint still shown off the path');
  check(!errors.length, errors.join(' | '));
  return 'arrow and outline shown; off-path move reports off the solution path';
});

test('Start page and stages', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await ready(page);
  check(await page.isVisible('#start'), 'start page not shown on boot');
  await page.click('#playCasual');
  await skipHowto(page);
  const st = () => page.evaluate(() => ({ mode: S.mode, stage: S.stage, n: S.n, fuse: S.fuseMs, title: document.getElementById('stageTitle').textContent, start: !document.getElementById('start').hidden }));
  let s = await st();
  check(!s.start && s.mode === 'casual' && s.stage === 0 && s.n === 4 && s.fuse === 0 && s.title === 'Stage 1', `casual: ${JSON.stringify(s)}`);
  while (await hintSwipe(page));
  await page.waitForSelector('#overlay:not([hidden])', { timeout: 3000 });
  check((await page.textContent('#winNew')) === 'Next stage', 'win offers no Next stage');
  await page.click('#winNew');
  s = await st();
  check(s.stage === 1 && s.title === 'Stage 2', `after Next stage: ${JSON.stringify(s)}`);
  const locked = await page.evaluate(() => [...document.querySelectorAll('#stagePick option')].map(o => o.disabled).join(''));
  check(locked.startsWith('falsefalsetrue'), 'stage picker should unlock only stages 1-2');
  await page.selectOption('#stagePick', '0');
  s = await st();
  check(s.stage === 0 && s.title === 'Stage 1', `stage picker did not go back: ${JSON.stringify(s)}`);
  await page.click('#menu');
  check(await page.isVisible('#start'), 'Menu did not open the start page');
  check((await page.textContent('#casualStage')) === 'Continue from stage 2' && (await page.textContent('#challengeStage')) === 'Start from stage 1', 'start page shows wrong progress');
  await page.click('#playChallenge');
  await skipHowto(page);
  s = await st();
  check(s.mode === 'challenge' && s.stage === 0 && s.fuse === 30000, `challenge: ${JSON.stringify(s)}`);
  await page.reload(); await ready(page);
  await page.click('#playCasual');
  s = await st();
  check(s.stage === 1 && s.fuse === 0, `casual after reload: ${JSON.stringify(s)}`);
  const ladder = await page.evaluate(() => STAGES.map(([n]) => n).join(''));
  const casual = await page.evaluate(() => CASUAL_TILES.length === STAGES.length && CASUAL_TILES.every((v, k) => v >= SIZES[STAGES[k][0]].min && v <= SIZES[STAGES[k][0]].max));
  check(casual, 'Casual tile curve must cover every stage within each size\'s tile range');
  check(/^4+5+6+$/.test(ladder), `stage ladder not 4x4 -> 5x5 -> 6x6: ${ladder}`);
  await context.close();
  check(!errors.length, errors.join(' | '));
  return 'start page on boot; Casual has no fuse; win -> Next stage; progress per mode survives reload; Challenge fuse from the stage';
});

test('How to play', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await ready(page);
  const shown = () => page.isVisible('#howto');
  await page.click('#playCasual');
  check(await shown(), 'no tutorial on first Casual entry');
  check(!(await page.isVisible('#howtoFuse')), 'Casual tutorial mentions fuses');
  check(await page.evaluate(() => [...document.querySelectorAll('#howto img')].every(i => i.src && i.naturalWidth)), 'tutorial sprites missing');
  const box = await page.evaluate(() => { const r = document.querySelector('.howto').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
  check(box, 'tutorial does not fit one 390x844 screen');
  await page.click('#howtoGo');
  check(!(await shown()), 'Got it did not close the tutorial');
  await page.click('#menu'); await page.click('#playCasual');
  check(!(await shown()), 'tutorial shown again on second Casual entry');
  await page.click('#menu'); await page.click('#playChallenge');
  check(await shown() && await page.isVisible('#howtoFuse'), 'first Challenge entry has no fuse step');
  await page.click('#howtoGo');
  // Start the clock with a split, then reopen: the clock and fuses wait.
  await hintSwipe(page);
  await page.click('#help');
  check(await shown(), 'How to play link did not open the tutorial');
  const before = await page.evaluate(() => ({ t0: S.t0, fuse: S.fuse.find(Boolean), timer: S.timer }));
  check(!before.timer, 'clock still running behind the tutorial');
  await page.waitForTimeout(600);
  await page.click('#howtoGo');
  const after = await page.evaluate(() => ({ t0: S.t0, fuse: S.fuse.find(Boolean), timer: S.timer }));
  check(after.timer && after.t0 - before.t0 >= 500 && after.fuse - before.fuse >= 500, `clock and fuses not shifted: ${JSON.stringify([before, after])}`);
  await context.close();
  check(!errors.length, errors.join(' | '));
  return 'first entry per mode shows it once, Challenge adds fuses, link reopens it and pauses the clock';
});

// Player-facing words stay consistent: cells (not beds), Normal (not Challenge), Kaboom Kitty.
test('Player text', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(URL.replace('?dev', ''));
  await ready(page);
  const words = () => page.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (!w.currentNode.parentElement.closest('script,style,.devonly')) out.push(w.currentNode.textContent);
    document.querySelectorAll('[aria-label],[alt],[title]').forEach(e => out.push(e.getAttribute('aria-label') || e.getAttribute('alt') || e.getAttribute('title')));
    return out.join(' ').replace(/\s+/g, ' ');
  });
  let text = await words();
  await page.click('#playChallenge'); // first entry: tutorial with the fuse step
  text += ' ' + await words();
  await page.click('#howtoGo');
  // Win, lose and status copy is set in code, so read it from the script.
  text += ' ' + await page.evaluate(() => document.querySelector('script:not([src])').textContent.match(/textContent = [^;]*'[^']*'/g).join(' '));
  for (const bad of [/\bbeds?\b/i, /\bChallenge\b/, /Kaboom Kittens/, /\bof \d+\b/]) check(!bad.test(text), `stale player text: ${text.match(bad)}`);
  for (const need of ['Kaboom Kitty', 'Casual', 'Normal', 'How to play', 'Swipe to break up a fight', 'empty cell']) check(text.includes(need), `missing "${need}"`);
  check(await page.evaluate(() => document.querySelectorAll('#howto .cot:not([data-kit]) .bed').length === 2), 'tutorial empty cells lack the dotted oval');
  await context.close();
  return 'no bed / Challenge / Kaboom Kittens / "of N" in visible or scripted copy; tutorial shows empty-cell ovals';
});

test('Install offer', async () => {
  const { context, page, errors } = await open({}, false);
  check(!(await page.isVisible('#startInstall')) && !(await page.isVisible('#installRow')), 'install shown before the browser offered it');
  const fire = () => page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    e.prompt = () => { window.__prompted = true; return Promise.resolve(); };
    dispatchEvent(e);
  });
  await fire();
  check(!(await page.isVisible('#pwa')), 'install bar shown in game; the offer belongs on the start page');
  await page.click('#menu');
  check(await page.isVisible('#startInstall'), 'start page has no Install button after beforeinstallprompt');
  await page.click('#startInstall');
  check(await page.evaluate(() => window.__prompted), 'start page Install did not open the prompt');
  check(!(await page.isVisible('#startInstall')), 'Install still shown after prompting');
  await page.evaluate(() => { window.__prompted = false; });
  await fire();
  await page.click('#playCasual');
  await openSettings(page);
  check(await page.isVisible('#installBtn'), 'Settings has no Install button');
  await page.click('#installBtn');
  check(await page.evaluate(() => window.__prompted), 'Settings Install did not open the prompt');
  await context.close();
  check(!errors.length, errors.join(' | '));
  return 'no in-game bar, start page Install prompts, Settings Install prompts';
});

// Serves the repo over http so the service worker registers. sw.js gets a version suffix we can bump.
test('Update banner', async () => {
  const http = require('http'), fs = require('fs');
  const root = path.join(__dirname, '..');
  let ver = 1;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/manifest+json', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html');
    const file = path.join(root, path.normalize(name));
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(file);
    if (name === '/sw.js') body = body.toString().replace("'kaboomkitty-v1'", `'kaboomkitty-test-${ver}'`);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await ready(page);
    await page.click('#playCasual');
    await skipHowto(page);
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 });
    check(!(await page.isVisible('#pwa')), 'first install showed the update banner');
    ver = 2;
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await page.waitForSelector('#pwa:not([hidden])', { timeout: 10000 });
    check((await page.textContent('#pwaGo')) === 'Update', 'banner button is not Update');
    check(!(await page.isVisible('#pwaNo')), 'update banner offers Not now');
    await Promise.all([page.waitForNavigation(), page.click('#pwaGo')]);
    await ready(page);
    check(!(await page.isVisible('#pwa')), 'banner still shown after reload');
    check(!errors.length, errors.join(' | '));
  } finally {
    await context.close();
    server.close();
  }
  return 'first install is quiet; a new sw.js shows Update, which reloads';
});

(async () => {
  browser = await chromium.launch();
  let pass = 0;
  for (const [k, c] of cases.entries()) {
    const t = Date.now();
    try {
      const why = await c.fn();
      pass++;
      console.log(`PASS ${k + 1}. ${c.name}: ${why} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    } catch (e) {
      console.log(`FAIL ${k + 1}. ${c.name}: ${e.message.split('\n')[0]}`);
    }
  }
  await browser.close();
  console.log(`Total: ${pass}/${cases.length} passed`);
  process.exit(pass === cases.length ? 0 : 1);
})();
