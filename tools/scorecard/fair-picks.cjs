// Picks the generator attempt for stages 4-100 (M10, M20), per mode. Prints the pick object for index.html (EARLY_PICK[mode], stages 1-3 excluded).
// Among the attempts that hit the stage's tile target and are new, it keeps the one whose difficulty per split is closest to the usual
// ratio (so the band shape of M10 is not drowned by noise). On Normal stages 22+ it also prefers layouts a slow player clears with a short fuse (M20);
// every other stage skips that, so a slow player still loses some (10-30%).
// Run order after a board change: early-picks, MODE=challenge fair-picks, tile-table, MODE=casual fair-picks, fuse-table.
// Usage: MODE=challenge node tools/scorecard/fair-picks.cjs
const L = require('./lib.cjs');
const g = L.loadGame();
const mode = process.env.MODE || 'challenge', RHO = 0.68, ATTEMPTS = 20;
const need = b => {
  for (let f = 3; f <= 90; f++) if (L.play(g, b, { fuseS: f, chooser: L.urgentBuilder(g, b), slow: L.DAWDLER_SLOW, focus: true }).won) return f;
  return 91;
};
const ratio = b => { // difficulty (wrong turns per swipe) divided by the number of swipes
  let cur = b.cells, wrong = 0;
  for (const s of b.solution) { wrong += L.legalSteps(g, cur, b.n).filter(x => !x.join).length - 1; cur = g.applyStep(cur, b.n, s); }
  return wrong / b.solution.length ** 2;
};
const picks = {};
// Fixed Casual picks for stages 1-3 stay as they are; later picks of the other mode are not touched here.
Object.assign(g.EARLY_PICK[mode], Object.fromEntries(Object.entries(g.EARLY_PICK[mode]).filter(([k]) => k < 3)));
for (let k = 3; k < 100; k++) {
  if (g.TEACH[k]) continue;
  const [n, h, normal, , ladderLocks] = g.STAGES[k], locks = g.stageExtras(k).locks ?? ladderLocks;
  const target = mode === 'casual' ? g.CASUAL_TILES[k] : normal;
  const fair = mode === 'challenge' && k >= g.FOCUS_FROM && k % 2 === 0;
  const seen = new Set();
  for (let j = 0; j < k; j++) { const b = g.stageBoard(mode, j); seen.add(g.shapeKey(b.n, b.cells)); }
  let best = null;
  for (let a = 0; a < ATTEMPTS; a++) {
    const b = g.generate(n, target, g.seeded((mode === 'casual' ? 1e6 : 2e6) + k * 1000 + a), h, locks, g.stageExtras(k));
    if (b.tiles > target || seen.has(g.shapeKey(n, b.cells))) continue;
    const score = Math.abs(RHO - ratio(b)) * 10 + (fair ? Math.max(0, need(b) - 45) / 10 : 0);
    if (!best || score < best.score) best = { a, score };
  }
  if (best) { picks[k] = best.a; g.EARLY_PICK[mode][k] = best.a; }
  console.error(`${mode} stage ${k + 1}: attempt ${best ? best.a : '-'} score ${best ? best.score.toFixed(2) : '-'}`);
}
console.log(JSON.stringify(picks));
