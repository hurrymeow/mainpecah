// Prints the Normal fuse table for index.html (FUSE_SECONDS).
// Rule: the shortest fuse the urgent builder clears the stage with at the modeled pace, plus 25%, rounded up to 5 s,
// never below the ladder's ramp value value and never above 60 s. Rerun after any change to the stage boards.
// Usage: node tools/scorecard/fuse-table.cjs
const L = require('./lib.cjs');
const g = L.loadGame();
const out = [];
for (let k = 0; k < 100; k++) {
  const b = g.stageBoard('challenge', k);
  let need = 90;
  for (let f = 3; f <= 90; f++) if (L.play(g, b, { fuseS: f, chooser: L.urgentBuilder(g, b) }).won) { need = f; break; }
  out.push(Math.min(60, Math.max(g.LADDER[k][3], Math.ceil((need * 1.25) / 5) * 5)));
}
console.log(JSON.stringify(out).replace(/,/g, ', '));
