// Picks the Normal layout for stages 22-100 (M20): among the generator attempts that hit the stage's tile target and are new,
// keep the one a player at 1/1.5 of the modeled pace clears with the shortest fuse. Every fifth stage (a peak) keeps its default layout, so a slow player still loses some (M20: 10-30%).
// Run it before fuse-table.cjs and tile-table.cjs; both depend on the layouts it picks. Prints the EARLY_PICK object for index.html.
// Usage: node tools/scorecard/fair-picks.cjs
const L = require('./lib.cjs');
const g = L.loadGame();
const ATTEMPTS = 20, FROM = g.FOCUS_FROM, mode = 'challenge';
const need = b => {
  for (let f = 3; f <= 90; f++) if (L.play(g, b, { fuseS: f, chooser: L.urgentBuilder(g, b), slow: L.DAWDLER_SLOW, focus: true }).won) return f;
  return 91;
};
const picks = {};
for (let k = 0; k < 100; k++) {
  if (k < FROM || k % 5 === 4 || g.TEACH[k]) continue;
  const [n, h, target, , ladderLocks] = g.STAGES[k], locks = g.stageExtras(k).locks ?? ladderLocks;
  const seen = new Set();
  for (let j = 0; j < k; j++) { const b = g.stageBoard(mode, j); seen.add(g.shapeKey(b.n, b.cells)); }
  let best = null;
  for (let a = 0; a < ATTEMPTS; a++) {
    const b = g.generate(n, target, g.seeded(2e6 + k * 1000 + a), h, locks, g.stageExtras(k));
    if (b.tiles > target || seen.has(g.shapeKey(n, b.cells))) continue;
    const f = need(b);
    if (!best || f < best.f) best = { a, f };
    if (f <= 30) break;
  }
  if (best) { picks[k] = best.a; g.EARLY_PICK[mode][k] = best.a; }
  console.error(`stage ${k + 1}: attempt ${best ? best.a : '-'} need ${best ? best.f : '-'}`);
}
console.log(JSON.stringify(picks));
