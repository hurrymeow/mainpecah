// Prints the Casual starting-tile table for index.html (CASUAL_TILES).
// Rule: from stage 11, Casual aims for the number of splits a Normal stage has, divided by 1.3, so Normal runs about 1.4x
// as long (M20), but never under 0.5 min of modeled play while that still leaves Normal 1.2x as long. The first 10 stages keep the old ramp. Rerun after any change to the Normal tiles, then rerun fuse-table.cjs.
// Usage: node tools/scorecard/tile-table.cjs
const L = require('./lib.cjs');
const g = L.loadGame();
const RATIO = Number(process.env.RATIO || 1.3);
const out = [];
for (let k = 0; k < 100; k++) {
  const [w, h, , , locks] = g.STAGES[k];
  if (k < 10) { out.push(g.CASUAL_TILES[k]); continue; }
  const bn = g.stageBoard('challenge', k), stepsN = bn.solution.length;
  const cost = L.play(g, bn, { chooser: L.builder(bn) }).t / stepsN; // modeled seconds per step on this board
  // Aim at stepsN / RATIO, but a Casual stage should not drop under 0.5 min (S1) while Normal can still be 1.2x as long.
  let stepsC = Math.round(stepsN / RATIO);
  if (stepsC * cost < 31) stepsC = Math.min(Math.floor(stepsN / 1.2), Math.ceil(31 / cost));
  const shorter = k >= 60 && k % 2 === 1 ? Math.round(w * h * 0.1) : 0; // stageBoard adds this to every target on a short stage
  out.push(Math.max(2, w * h - locks - stepsC - shorter));
}
console.log(JSON.stringify(out).replace(/,/g, ', '));
