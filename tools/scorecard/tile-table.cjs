// Prints the Casual starting-tile table for index.html (CASUAL_TILES).
// Rule: from stage 4, Casual aims for the number of splits a Normal stage has, divided by 1.3, so Normal runs about 1.4x
// as long (M20), but never under 0.5 min of modeled play while that still leaves Normal 1.2x as long. The first 3 stages keep their picked tiles. Rerun after any change to the Normal tiles, then rerun fuse-table.cjs.
// Usage: node tools/scorecard/tile-table.cjs
const L = require('./lib.cjs');
const g = L.loadGame();
const RATIO = Number(process.env.RATIO || 1.2);
const out = [];
for (let k = 0; k < 100; k++) {
  const [w, h, , , ladderLocks] = g.STAGES[k], locks = g.stageExtras(k).locks ?? ladderLocks;
  if (k < 3) { out.push(g.CASUAL_TILES[k]); continue; }
  const bn = g.stageBoard('challenge', k), stepsN = bn.solution.length;
  const cost = L.play(g, bn, { chooser: L.builder(bn) }).t / stepsN; // modeled seconds per step on this board
  // Aim at stepsN / RATIO, but a Casual stage should not drop under 0.5 min (S1) while Normal can still be 1.2x as long.
  let stepsC = k < 8 ? stepsN : Math.round(stepsN / RATIO); // the first sitting (M5) needs full-length stages in Casual too
  if (k >= 8 && stepsC * cost < 31) stepsC = Math.min(Math.floor(stepsN / 1.2), Math.ceil(31 / cost));
  out.push(Math.max(2, w * h - locks - stepsC));
}
console.log(JSON.stringify(out).replace(/,/g, ', '));
