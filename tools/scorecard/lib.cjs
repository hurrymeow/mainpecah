// Shared pieces: load the game script, the time model (GAME-DESIGN.md "How to read it"), and a fuse-aware playthrough.
// Nothing here reads the real clock. All time is modeled seconds.
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const SEED = 20261031; // default seed for every bot. Override with SCORECARD_SEED.

// Time model (decision D2, recalibrated): 0.8 s per swipe, 0.4 s per movable fight at that state, reading at 4 words/s.
const SWIPE_S = 0.8, OPTION_S = 0.4, WORDS_PER_S = 4;
const TAP_S = 2; // one tap on a button (Next stage, Got it, Play)
const DAWDLER_SLOW = 1.5; // the dawdler (M20) plays at 1/1.5 of the modeled pace: every swipe and every look takes half as long again

function loadGame() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, Math, console });
  return mod.exports;
}

function rng(seed) { // mulberry32
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Legal swipes at a state: every split, plus every rejoin that is not also a split (the game tries a split first).
function legalSteps(g, cells, n) {
  const out = [];
  cells.forEach((t, i) => {
    if (!t || t.lock) return;
    for (const dir of Object.keys(g.DIRS)) {
      if (g.splitTarget(cells, n, i, dir) >= 0) out.push({ from: i, dir, join: false });
      else if (g.mergeTarget(cells, n, i, dir) >= 0) out.push({ from: i, dir, join: true });
    }
  });
  return out;
}

// What the player chooses between is which fight to break up next, not which of its directions.
// So an "option" is a fight that can move (a tile that can split). With no split left, it is a tile that can rejoin.
// Counting every (tile, direction) pair instead puts a 7x8 stage at 8+ min and the loop at 15+ h.
function optionCount(options) {
  const splits = options.filter(s => !s.join), pool = splits.length ? splits : options;
  return new Set(pool.map(s => s.from)).size;
}
const stepCost = options => SWIPE_S + OPTION_S * optionCount(options);
const fuseSecondsFor = (g, mode, k) => (mode === 'challenge' ? g.STAGES[Math.min(k, g.STAGES.length - 1)][3] : 0);

// Play one board. chooser(state) returns a step {from, dir, join} or null to give up.
// Fuses follow the game: they arm at the first swipe, a split gives both halves a fresh fuse,
// a rejoin resumes the fuse the fight had when it split. A fuse that runs out before the swipe lands blows up.
function play(g, board, { fuseS = 0, chooser, maxSteps = 400, fuseOff = false, slow = 1 }) {
  const n = board.n;
  let cells = g.stageBoard ? board.cells : board.cells, t = 0, steps = 0, started = false;
  let fuse = [];
  const F = fuseOff ? 0 : fuseS;
  const state = () => ({ cells, steps, t, fuse });
  while (steps < maxSteps) {
    if (g.isWin(cells, n)) return { won: true, lost: false, t, steps, cells };
    const options = legalSteps(g, cells, n);
    if (!options.length) return { won: false, lost: false, stuck: true, t, steps, cells };
    const step = chooser({ cells, options, steps, t, fuse, n });
    if (!step) return { won: false, lost: false, gaveUp: true, t, steps, cells };
    const tm = t + stepCost(options) * slow; // slow > 1: a player who plays at 1/slow of the modeled pace (the dawdler)
    if (F && started && fuse.some(d => d != null && d <= tm)) return { won: false, lost: true, t: tm, steps, cells };
    if (F && !started) fuse = cells.map(c => (c && c.v > 1 ? tm + F : null));
    started = true;
    let next;
    if (step.join) {
      const j = g.neighbour(n, step.from, step.dir, cells.length / n);
      next = g.applyJoin(cells, n, step.from, step.dir);
      const left = cells[step.from].tw.left;
      fuse = fuse.slice(); fuse[step.from] = null;
      if (next) fuse[j] = F ? tm + (left != null ? left : F) : null;
    } else {
      const j = g.splitTarget(cells, n, step.from, step.dir);
      next = g.applySplit(cells, n, step.from, step.dir);
      if (next) {
        next[step.from].tw.left = fuse[step.from] ? fuse[step.from] - tm : null;
        fuse = fuse.slice();
        fuse[step.from] = F && next[step.from].v > 1 ? tm + F : null;
        fuse[j] = F && next[j].v > 1 ? tm + F : null;
      }
    }
    if (!next) return { won: false, lost: false, gaveUp: true, t, steps, cells };
    cells = next; t = tm; steps++;
  }
  return { won: g.isWin(cells, n), lost: false, capped: true, t, steps, cells };
}

// Builder: replays the generator's recorded solution. (An upper bound on the shortest solution; an exact search is too costly on 7x8.)
const builder = board => { let k = 0; return () => board.solution[k++] || null; };

// Builder under fuses: same steps, reordered by urgency. Two steps that touch no common cell commute,
// so any order that keeps each cell's steps in sequence still ends on the same solved board.
// Among the steps that are ready, it takes the fight whose fuse is shortest.
function urgentBuilder(g, board) {
  const n = board.n, h = board.cells.length / n, steps = board.solution;
  const line = (i, j) => { // cells from i to j in a straight line, both ends included
    const out = [i], di = Math.sign(Math.floor(j / n) - Math.floor(i / n)), dj = Math.sign((j % n) - (i % n));
    for (let c = i; c !== j;) { c = (Math.floor(c / n) + di) * n + (c % n) + dj; out.push(c); }
    return out;
  };
  const touched = [];
  let cur = board.cells;
  for (const s of steps) {
    const j = s.join ? g.neighbour(n, s.from, s.dir, h) : g.splitTarget(cur, n, s.from, s.dir);
    touched.push(new Set(line(s.from, j)));
    cur = g.applyStep(cur, n, s);
  }
  const deps = steps.map((_, b) => { const d = []; for (let a = 0; a < b; a++) if ([...touched[b]].some(c => touched[a].has(c))) d.push(a); return d; });
  const done = new Set();
  // Steps that touch no common cell usually commute, but floor tiles (cushions, cracks) can break that.
  // So a step is only taken if the rest of the recorded solution, replayed after it, still reaches the solved board.
  const finishes = (cells, skip, take) => {
    let cur = g.applyStep(cells, n, steps[take]);
    for (let a = 0; a < steps.length && cur; a++) if (!done.has(a) && a !== take) cur = g.applyStep(cur, n, steps[a]);
    return !!cur && g.isWin(cur, n);
  };
  return ({ fuse, cells }) => {
    const ready = [];
    for (let b = 0; b < steps.length; b++) {
      if (done.has(b) || !deps[b].every(a => done.has(a))) continue;
      ready.push({ b, at: fuse[steps[b].from] == null ? Infinity : fuse[steps[b].from] });
    }
    ready.sort((x, y) => x.at - y.at || x.b - y.b);
    const pick = ready.find(r => finishes(cells, null, r.b));
    if (!pick) return null;
    done.add(pick.b);
    return steps[pick.b];
  };
}

// Rookie: random split with a one-move lookahead (avoids moves that leave the board stuck),
// rejoins when no split is left. Under fuses it takes the fight with the least time left.
function rookie(g, rand) {
  return ({ cells, options, n, fuse }) => {
    const splits = options.filter(s => !s.join), joins = options.filter(s => s.join);
    const pick = a => a[Math.floor(rand() * a.length)];
    if (splits.length) {
      const safe = splits.filter(s => !g.isStuck(g.applySplit(cells, n, s.from, s.dir), n));
      let pool = safe.length ? safe : splits;
      // Under fuses a rookie still sees the bars: it goes for the fight with the least time left.
      if (fuse && fuse.some(d => d != null)) {
        const soonest = Math.min(...pool.map(s => (fuse[s.from] == null ? Infinity : fuse[s.from])));
        pool = pool.filter(s => (fuse[s.from] == null ? Infinity : fuse[s.from]) === soonest);
      }
      return pick(pool);
    }
    return joins.length ? pick(joins) : null;
  };
}

// Builder time for one stage with no fuse pressure, plus whether it survives the Normal fuses.
function builderStage(g, mode, k) {
  const board = g.stageBoard(mode, k);
  const fs_ = fuseSecondsFor(g, mode, k);
  const free = play(g, board, { chooser: builder(board) });
  const fused = fs_ ? play(g, board, { fuseS: fs_, chooser: urgentBuilder(g, board) }) : null;
  const dawdled = fs_ ? play(g, board, { fuseS: fs_, chooser: urgentBuilder(g, board), slow: DAWDLER_SLOW }) : null;
  const run = free; // progress time ignores fuse deaths; survival is reported on its own
  // Difficulty: average legal options per solution swipe, minus the one the solution takes
  // (wrong turns on offer per move). Cheap on 7x8; a stand-in for dead-end branches.
  let cur = board.cells, wrong = 0;
  for (const s of board.solution) {
    wrong += legalSteps(g, cur, board.n).filter(x => !x.join).length - 1;
    cur = g.applyStep(cur, board.n, s);
  }
  return {
    k, mode, board, steps: run.steps, seconds: run.t, won: free.won,
    survives: fused ? fused.won : true,
    dawdlerSurvives: dawdled ? dawdled.won : true,
    difficulty: board.solution.length ? wrong / board.solution.length : 0,
  };
}

// Words in a string, as the player would read them.
const wordCount = s => (s.match(/[A-Za-z0-9'’%.:×›-]+/g) || []).filter(w => /[A-Za-z0-9]/.test(w)).length;

module.exports = { DAWDLER_SLOW, urgentBuilder, ROOT, SEED, SWIPE_S, OPTION_S, WORDS_PER_S, TAP_S, loadGame, rng, legalSteps, optionCount, stepCost, fuseSecondsFor, play, builder, rookie, builderStage, wordCount };
