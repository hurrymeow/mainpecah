// Scorecard rows that come from bot playthroughs on the game logic (no browser).
// Every row: { id, title, result: 'Pass'|'Fail'|'Unknown', measured, target, note? }.
const L = require('./lib.cjs');

const MODES = ['casual', 'challenge'];
const NAME = { casual: 'Casual', challenge: 'Normal' };
const min1 = s => (s / 60).toFixed(1);
const row = (id, title, ok, measured, target, note) => ({ id, title, result: ok === null ? 'Unknown' : ok ? 'Pass' : 'Fail', measured, target, note });
const inBand = (x, [lo, hi]) => x >= lo && x <= hi;
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };

function build(g, count = 150) {
  const stages = {};
  for (const mode of MODES) stages[mode] = Array.from({ length: count }, (_, k) => L.builderStage(g, mode, k));
  return stages;
}

// Elapsed seconds at the end of each stage: stage play plus one tap on Next stage, after the first-run intro.
function cumulative(list, introS) {
  let t = introS;
  return list.map(s => (t += s.seconds + L.TAP_S));
}
// The stage the player is on after `seconds` (1-based).
const reach = (cum, seconds) => Math.min(100, 1 + cum.slice(0, 100).filter(t => t <= seconds).length);

// Rules and the stage (0-based) where each first appears.
function ruleStages(g) {
  const first = f => { for (let k = 0; k < 100; k++) if (f(k)) return k; return -1; };
  return {
    blocked: first(k => g.STAGES[k][4] > 0),
    rejoin: Math.min(...Object.keys(g.TEACH).map(Number)),
    cracked: first(k => g.stageExtras(k).cracks > 0),
    grumpy: first(k => g.stageExtras(k).grumpy > 0),
    cushions: first(k => g.stageExtras(k).cushions > 0),
  };
}

function fitS1(list, upto) {
  // Up to stage 60: every stage 0.5-3 min. After 60: none under 0.5, none over 4, never two over 3 in a row.
  const bad = [];
  list.slice(0, upto).forEach((s, k) => {
    const m = s.seconds / 60;
    if (m < 0.5 || (k < 60 && m > 3) || m > 4 || (k >= 60 && m > 3 && list[k - 1].seconds / 60 > 3)) bad.push(k + 1);
  });
  return bad;
}

// Replay a board's recorded solution, landing arrivals as the game does. onStep(cells, step) sees
// each state before its step is applied.
function replayBoard(g, board, onStep) {
  const arrivals = board.arrivals || [];
  let cur = board.cells, splits = 0, queue = 0;
  for (const st of board.solution) {
    if (onStep) onStep(cur, st);
    cur = g.applyStep(cur, board.n, st);
    if (!cur) return { cells: null, splits, queue };
    if (st.join) splits = Math.max(0, splits - 1);
    else { splits++; const r = L.landDue(g, cur, splits, queue, arrivals); cur = r.cells; queue = r.queue; }
  }
  return { cells: cur, splits, queue };
}

function uniqueAndSolvable(g, list, upto) {
  const seen = new Set(); let dup = 0, unsolved = 0;
  list.slice(0, upto).forEach(s => {
    const r = replayBoard(g, s.board);
    if (!r.cells || r.queue < (s.board.arrivals || []).length || !g.isWin(r.cells, s.board.n)) unsolved++;
    const key = g.shapeKey(s.board.n, s.board.cells);
    if (seen.has(key)) dup++; else seen.add(key);
  });
  return { dup, unsolved };
}

// Exhaustive split-only search: can the stage's authored board be won without ever rejoining?
function winsWithoutJoin(g, board, cap = 400000) {
  const seen = new Set(), stack = [board.cells], n = board.n;
  while (stack.length) {
    const cur = stack.pop();
    if (g.isWin(cur, n)) return true;
    if (seen.size > cap) return null;
    cur.forEach((t, i) => {
      if (!t || t.lock || t.v < 2) return;
      for (const dir of Object.keys(g.DIRS)) {
        const next = g.applySplit(cur, n, i, dir);
        if (!next) continue;
        const key = g.keyOf(next);
        if (!seen.has(key)) { seen.add(key); stack.push(next); }
      }
    });
  }
  return false;
}


// Split-only depth-first solver in a fixed move order: the route a player who ignores the new rule would walk.
function solveSplits(g, cells, n, cap = 4000) {
  const sig = c => { const ids = new Map(); return c.map(t => (t ? (t.lock ? 'x' : t.v + (t.g ? 'g' : '') + (t.tw ? ':' + (ids.has(t.tw) ? ids.get(t.tw) : (ids.set(t.tw, ids.size), ids.size - 1)) : '')) : '.')).join(',') + '|' + (c.floor || []).map(f => (f ? f[1] : '')).join(''); };
  const seen = new Set([sig(cells)]);
  const go = (cur, path) => {
    if (g.isWin(cur, n)) return path;
    if (seen.size > cap) return null;
    for (const st of L.legalSteps(g, cur, n)) {
      if (st.join) continue;
      const next = g.applyStep(cur, n, st); if (!next) continue;
      const key = sig(next); if (seen.has(key)) continue;
      seen.add(key);
      const r = go(next, [...path, st]); if (r) return r;
    }
    return null;
  };
  return go(cells, []);
}
const stripRule = cells => Object.assign(cells.map(t => (t && t.lock ? t : t && { ...t, g: undefined })), { floor: undefined });
function replayWins(g, cells, n, path) {
  let cur = cells;
  for (const st of path) cur = cur && g.applyStep(cur, n, st);
  return !!cur && g.isWin(cur, n);
}

function rookieRuns(g, mode, k, seeds, seed0) {
  const board = g.stageBoard(mode, k), fuseS = L.fuseSecondsFor(g, mode, k);
  let wins = 0; const times = [];
  for (let s = 0; s < seeds; s++) {
    const r = L.play(g, board, { fuseS, chooser: L.rookie(g, L.rng(seed0 + s * 7919 + k)), maxSteps: 150 });
    if (r.won) { wins++; times.push(r.t); }
  }
  return { rate: wins / seeds, median: median(times) };
}

// Play random no-lookahead walks on early boards and ask a bounded search whether a win is still reachable.
// A state that is dead but still has moves is something the game cannot flag today (it flags only "stuck").
function silentDeadStates(g, seed0, walks = 20, nodeCap = 12000) {
  let dead = 0, checked = 0, unknown = 0;
  const sig = cells => { const ids = new Map(); return cells.map(t => (t ? (t.lock ? 'x' : t.v + (t.g ? 'g' : '') + (t.tw ? ':' + (ids.has(t.tw) ? ids : ids.set(t.tw, ids.size)).get(t.tw) : '')) : '.')).join(',') + '|' + (cells.floor || []).join(','); };
  const reachable = (start, n) => {
    const seen = new Set([sig(start)]), stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      if (g.isWin(cur, n)) return true;
      if (seen.size > nodeCap) return null;
      for (const st of L.legalSteps(g, cur, n)) {
        const next = g.applyStep(cur, n, st);
        const key = sig(next);
        if (next && !seen.has(key)) { seen.add(key); stack.push(next); }
      }
    }
    return false;
  };
  for (let w = 0; w < walks; w++) {
    const rand = L.rng(seed0 + w), k = w % 4, board = g.stageBoard('casual', k), n = board.n;
    let cells = board.cells;
    for (let step = 0; step < 60 && !g.isWin(cells, n); step++) {
      const splits = L.legalSteps(g, cells, n).filter(s => !s.join);
      if (!splits.length) break;
      const s = splits[Math.floor(rand() * splits.length)];
      cells = g.applySplit(cells, n, s.from, s.dir);
      if (step % 2 === 1 && !g.isStuck(cells, n) && !g.isJammed(cells, n)) {
        const r = reachable(cells, n);
        if (r === null) unknown++; else { checked++; if (!r) dead++; }
      }
    }
  }
  return { dead, checked, unknown };
}

function run(g, { introS = {}, seed = L.SEED, stages: pre } = {}) {
  const stages = pre || build(g);
  const rows = [];
  const cum = {}; for (const m of MODES) cum[m] = cumulative(stages[m], introS[m] || 0);
  const first100 = m => stages[m].slice(0, 100);

  // S1
  {
    const bad = {}; for (const m of MODES) bad[m] = fitS1(first100(m), 100);
    const range = m => `${min1(Math.min(...first100(m).map(s => s.seconds)))}-${min1(Math.max(...first100(m).map(s => s.seconds)))}`;
    rows.push(row('S1', 'A stage fits between two stops', !MODES.some(m => bad[m].length),
      MODES.map(m => `${NAME[m]} ${range(m)} min, ${bad[m].length} stages out of band`).join('; '),
      '0.5-3 min up to stage 60; after, up to 4 min, no two over 3 in a row',
      MODES.map(m => bad[m].length ? `${NAME[m]} out: ${bad[m].slice(0, 8).join(',')}${bad[m].length > 8 ? '...' : ''}` : '').filter(Boolean).join('; ')));
  }
  // M3, M4
  {
    const N = 200;
    const r3 = MODES.map(m => ({ m, ...rookieRuns(g, m, 0, N, seed) }));
    rows.push(row('M3', 'First win almost at once', r3.every(r => r.rate >= 0.95 && inBand(r.median, [30, 90])),
      r3.map(r => `${NAME[r.m]} ${(r.rate * 100).toFixed(0)}% win, median ${r.median.toFixed(0)} s`).join('; '), 'rookie wins stage 1 in >=95% of seeds, 30-90 s'));
    const r4 = MODES.map(m => [0, 1, 2].map(k => ({ m, k, ...rookieRuns(g, m, k, N, seed) })));
    const worst = r4.flat().reduce((a, b) => (b.rate < a.rate ? b : a));
    rows.push(row('M4', 'Early stages are friendly', r4.flat().every(r => r.rate >= 0.9),
      `lowest: ${NAME[worst.m]} stage ${worst.k + 1} at ${(worst.rate * 100).toFixed(0)}%`, 'rookie wins stages 1-3, both modes, >=90% of seeds'));
  }
  // M5, M9, M14
  const reaches = (id, title, secs, bands) => {
    const got = MODES.map(m => reach(cum[m], secs));
    rows.push(row(id, title, MODES.every((m, i) => inBand(got[i], bands[m])),
      MODES.map((m, i) => `${NAME[m]} stage ${got[i]}`).join('; '),
      `by ${secs / 60} min: ` + MODES.map(m => `${NAME[m]} ${bands[m].join('-')}`).join(', ')));
  };
  reaches('M5', 'Progress in the first sitting', 300, { casual: [4, 8], challenge: [4, 8] });
  // M6, M7, M8 (rules)
  const rules = ruleStages(g);
  {
    const startMin = MODES.map(m => (cum[m][rules.blocked - 1]) / 60);
    rows.push(row('M6', 'First new idea arrives', startMin.every(x => inBand(x, [8, 15])),
      `blocked cells at stage ${rules.blocked + 1}: ` + MODES.map((m, i) => `${NAME[m]} ${startMin[i].toFixed(1)} min`).join(', '), '8-15 min'));
    const dims = k => g.STAGES[k].slice(0, 2).join('x');
    const bad = Object.entries(rules).filter(([, k]) => dims(k) !== dims(k - 1));
    rows.push(row('M7', 'One new thing at a time', !bad.length,
      Object.entries(rules).map(([r, k]) => `${r} stage ${k + 1} (${dims(k - 1)}->${dims(k)})`).join('; '),
      "a rule's first stage keeps the previous board size", bad.length ? `new size with the rule: ${bad.map(([r]) => r).join(', ')}` : ''));
    // M8: rejoin, grumpy kittens and cushions have an authored first stage where the route that ignores the rule fails.
    // Blocked cells and cracks are fixed obstacles (a blocked cell is a kitten that never moves, a crack is a delayed block), so a route cannot ignore them; their boards are checked by eye.
    const taught = ['rejoin', 'grumpy', 'cushions'];
    const authored = taught.filter(r => g.TEACH[rules[r]]);
    const rejoinNeedsJoin = winsWithoutJoin(g, g.stageBoard('casual', rules.rejoin));
    const ignoredFails = r => { // the first split-only route on the board without the rule is not a win on the board with it
      const board = g.stageBoard('casual', rules[r]);
      const naive = solveSplits(g, stripRule(board.cells), board.n);
      return !!naive && !replayWins(g, board.cells, board.n, naive);
    };
    const missing = taught.filter(r => r === 'rejoin' ? rejoinNeedsJoin !== false : !ignoredFails(r));
    rows.push(row('M8', 'The new rule matters on its first stage', authored.length === taught.length && !missing.length,
      `authored first-stage boards ${authored.length}/${taught.length} (${authored.join(', ') || 'none'}); route that ignores the rule fails: ${taught.map(r => `${r} ${missing.includes(r) ? 'no' : 'yes'}`).join(', ')}`,
      'rejoin, grumpy and cushions have an authored first stage and the route that ignores the rule fails there',
      'Blocked cells and cracks are checked by eye: ignoring them is not possible, a route cannot cross a blocked cell.'));
  }
  reaches('M9', 'Progress', 900, { casual: [12, 20], challenge: [10, 18] });
  // M10
  {
    const out = MODES.map(m => {
      const d = first100(m).map(s => s.brainy);
      let rising = 0, relief = 0;
      for (let b = 0; b < 10; b++) {
        const xs = d.slice(b * 10, b * 10 + 10), mx = (xs.length - 1) / 2, my = xs.reduce((a, x) => a + x, 0) / xs.length;
        const slope = xs.reduce((a, x, i) => a + (i - mx) * (x - my), 0) / xs.reduce((a, _, i) => a + (i - mx) ** 2, 0);
        if (slope > 0) rising++;
        if (b < 9) { const peak = (xs[8] + xs[9]) / 2, drop = 1 - d[b * 10 + 10] / peak; if (drop >= 0.1 && drop <= 0.4) relief++; }
      }
      return { m, rising, relief };
    });
    rows.push(row('M10', 'Hard, then relief', out.every(o => o.rising === 10 && o.relief === 9),
      out.map(o => `${NAME[o.m]} rising ${o.rising}/10 bands, relief 10-40% at ${o.relief}/9 band starts`).join('; '), 'rising in every band, 10-40% drop at every band start',
      'Relief = first stage of a band vs the mean of the last two stages of the one before. Difficulty is the M22 delayed-trap share.'));
  }
  // M22
  {
    const late = m => first100(m).slice(46);
    const out = MODES.map(m => {
      const xs = late(m);
      const share = xs.reduce((a, s) => a + s.brainy, 0) / xs.length;
      const low = xs.reduce((a, s) => (s.brainy < a.brainy ? s : a));
      return { m, share, low };
    });
    rows.push(row('M22', 'Wrong turns look right for a while', out.every(o => o.share >= 0.3),
      out.map(o => `${NAME[o.m]} ${(o.share * 100).toFixed(0)}% (lowest stage ${o.low.k + 1} at ${(o.low.brainy * 100).toFixed(0)}%)`).join('; '),
      '>=30% of solution swipes on stages 47-100',
      'A trap split leaves 3+ split swipes of play but no win reachable by a bounded split-only search; a rejoin is not a way out.'));
  }
  reaches('M14', 'Progress', 3600, { casual: [35, 55], challenge: [30, 50] });
  // M15
  {
    const h = MODES.map(m => cum[m][99] / 3600);
    rows.push(row('M15', 'Loop length', inBand(h[0], [2.5, 4]) && inBand(h[1], [3, 5]),
      MODES.map((m, i) => `${NAME[m]} ${h[i].toFixed(1)} h`).join('; '), 'Casual 2.5-4 h, Normal 3-5 h'));
  }
  // M16
  {
    // A mark is a rule's first stage, or a twist: a stage whose mix of blocked cells, cracks, grumpy kittens and cushions has not appeared before.
    const mix = k => { const e = g.stageExtras(k); return [(e.locks ?? g.STAGES[k][4]) > 0, e.cracks > 0, e.grumpy > 0, e.cushions > 0].map(Number).join(''); };
    const seen = new Set(), twists = [];
    for (let k = 0; k < 100; k++) { const m = mix(k); if (!seen.has(m) && g.TWISTS[k]) twists.push(k); seen.add(m); }
    const unnew = Object.keys(g.TWISTS).map(Number).filter(k => !twists.includes(k));
    const marks = [...Object.values(rules), g.FOCUS_FROM, ...twists].sort((a, b) => a - b);
    let gap = 0, from = 0;
    [-1, ...marks, 100].forEach((k, i, a) => { if (i) { const run = k - a[i - 1] - 1; if (run > gap) { gap = run; from = a[i - 1] + 2; } } });
    rows.push(row('M16', 'Something new every so often', gap <= 15 && !unnew.length,
      `longest run without a new rule or mix: ${gap} stages (${from}-${from + gap - 1}); twists at ${twists.map(k => k + 1).join(', ')}${unnew.length ? '; not new: ' + unnew.map(k => k + 1).join(', ') : ''}`,
      '<=15 stages', 'A twist counts only if its mix of existing rules has not appeared at an earlier stage.'));
  }
  // M18
  {
    const res = MODES.map(m => uniqueAndSolvable(g, stages[m], 100));
    const ok = res.every(r => !r.dup && !r.unsolved);
    rows.push(row('M18', 'Every board solvable and unique', ok,
      MODES.map((m, i) => `${NAME[m]} unsolved ${res[i].unsolved}, duplicates ${res[i].dup}`).join('; '), '200 boards replay, none match under rotation or mirror (checked per mode)'));
  }
  // M20
  {
    const ratios = Array.from({ length: 100 }, (_, k) => stages.challenge[k].seconds / stages.casual[k].seconds);
    const med = median(ratios);
    const survive = stages.challenge.slice(0, 100).filter(s => s.survives).length;
    const lost = stages.challenge.slice(40, 100).filter(s => !s.dawdlerSurvives).length;
    const pct = Math.round((lost / 60) * 100);
    rows.push(row('M20', 'Normal is the NG+', inBand(med, [1.2, 1.6]) && pct >= 10 && pct <= 30,
      `median Normal/Casual time ${med.toFixed(2)}x; dawdler (${L.DAWDLER_SLOW}x slower) loses ${pct}% of Normal 41-100; builder at modeled pace clears ${survive}/100 Normal fuses`,
      '1.2-1.6x; dawdler loses 10-30% of Normal 41-100',
      'The dawdler is the urgent builder at 1/1.5 of the modeled pace. Both use the focus rule (only fights near the last swipe burn, from stage 22).'));
  }
  // M21
  {
    const res = MODES.map(m => uniqueAndSolvable(g, stages[m], 150));
    const bad = MODES.map(m => fitS1(stages[m], 150).filter(k => k > 100));
    const ok = res.every(r => !r.dup && !r.unsolved) && bad.every(b => !b.length);
    rows.push(row('M21', 'Past 100 stays sound', ok,
      MODES.map((m, i) => `${NAME[m]} 101-150: unsolved ${res[i].unsolved}, duplicates ${res[i].dup}, out of S1 band ${bad[i].length}`).join('; '), 'solvable, unique, fit S1'));
  }
  // hint-follower and dead-state sampling feed page rows
  const hintFollowerWins = MODES.reduce((a, m) => a + stages[m].slice(0, 100).filter(s => s.won).length, 0);
  const dead = silentDeadStates(g, seed);
  // The first hint tap lights one fight. It helps when it narrows the pick from several fights to one, and it does not play
  // when the player still has to choose the direction on a real share of steps (a fight that can split two or more ways).
  const hint = MODES.map(m => {
    let steps = 0, choice = 0, fights = 0;
    for (let k = 0; k < 100; k++) {
      const b = stages[m][k].board;
      replayBoard(g, b, (cur, st) => {
        if (st.join) return;
        steps++;
        if (Object.keys(g.DIRS).filter(d => g.splitTarget(cur, b.n, st.from, d) >= 0).length >= 2) choice++;
        fights += new Set(L.legalSteps(g, cur, b.n).filter(x => !x.join).map(x => x.from)).size;
      });
    }
    return { choice: choice / steps, narrow: fights / steps };
  });
  return { rows, hintFollowerWins, hint, dead, rules, cum, stages };
}

module.exports = { run, build, MODES, NAME, row };
