// Prints the Normal fuse table for index.html (FUSE_SECONDS).
// Rule: the shortest fuse a player at 1/1.5 of the modeled pace (the dawdler, M20) clears the stage with, rounded up to 5 s,
// never below the ladder's ramp value and never above 60 s. So a slow player survives except where the 60 s cap binds
// (late, many-fight boards), and a player at the modeled pace has about 50% slack. Uses the focus rule from stage 22.
// Rerun after any change to the stage boards.
// Usage: node tools/scorecard/fuse-table.cjs
const L = require('./lib.cjs');
const g = L.loadGame();
const out = [];
for (let k = 0; k < 100; k++) {
  const b = g.stageBoard('challenge', k);
  let need = 90;
  for (let f = 3; f <= 90; f++) if (L.play(g, b, { fuseS: f, chooser: L.urgentBuilder(g, b), slow: L.DAWDLER_SLOW, focus: k >= g.FOCUS_FROM }).won) { need = f; break; }
  out.push(Math.min(60, Math.max(g.LADDER[k][3], Math.ceil(need / 5) * 5)));
}
console.log(JSON.stringify(out).replace(/,/g, ', '));
