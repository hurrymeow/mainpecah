// Run: node test/selftest.cjs  — extracts the game script from index.html and checks 1000 boards per size.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
vm.runInNewContext(src, { module: mod, Math, console });
const r = mod.exports.selfTest(1000);
let fail = false;
for (const [n, x] of Object.entries(r)) {
  console.log(`${n}x${n}: sum ${x.sum}/${x.boards}, max<=16 ${x.cap}/${x.boards}, solution reaches all-1s ${x.solved}/${x.boards} (hit exact tile target ${x.hitTarget}/${x.boards})`);
  if (x.sum !== x.boards || x.cap !== x.boards || x.solved !== x.boards) fail = true;
}
if (mod.exports.ARRIVALS_FROM !== 46) { console.log('ARRIVALS_FROM should be 46'); fail = true; }
{ // Every stage must replay its recorded solution, landing arrivals at their net split count.
  const { stageBoard, shapeKey, applyArrivals, applyStep, isWin, keyOf, STAGES, ARRIVALS_FROM } = mod.exports;
  for (const m of ['casual', 'challenge']) {
    for (let k = 0; k < STAGES.length; k++) {
      const b = stageBoard(m, k), arrivals = b.arrivals || [];
      if ((k >= ARRIVALS_FROM) !== (arrivals.length > 0)) { console.log(`${m} stage ${k + 1}: arrivals ${arrivals.length}`); fail = true; }
      const bkey = cells => (arrivals.length ? keyOf(cells) + '|' + arrivals.reduce((q, a) => q + (cells[a.cell] ? 1 : 0), 0) : keyOf(cells));
      let cur = applyArrivals(b.cells, arrivals, 0), hints = b.path[0] === bkey(cur);
      for (let p = 0; cur && p < b.solution.length; p++) {
        cur = applyStep(cur, b.n, b.solution[p]);
        if (!cur) break;
        cur = applyArrivals(cur, arrivals, p + 1);
        if (b.path[p + 1] !== bkey(cur)) hints = false;
      }
      if (!(cur && isWin(cur, b.n))) { console.log(`${m} stage ${k + 1}: replay did not win`); fail = true; }
      if (!hints) { console.log(`${m} stage ${k + 1}: path key mismatch`); fail = true; }
    }
  }
  // Stages 1-46 must keep the boards they had before arrivals were added.
  let h = 2166136261;
  for (const m of ['casual', 'challenge']) for (let k = 0; k < ARRIVALS_FROM; k++) {
    const b = stageBoard(m, k), s = m + k + shapeKey(b.n, b.cells);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  if ((h >>> 0).toString(16) !== 'd0cf2609') { console.log('stages 1-46 boards changed: ' + (h >>> 0).toString(16)); fail = true; }
}
process.exit(fail ? 1 : 0);
