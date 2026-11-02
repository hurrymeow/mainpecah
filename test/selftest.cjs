// Run: node test/selftest.cjs  — extracts the game script from index.html and checks 1000 boards per size.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
vm.runInNewContext(src, { module: mod, Math, console });
const g = mod.exports;
const r = g.selfTest(1000);
let fail = false;
for (const [n, x] of Object.entries(r)) {
  console.log(`${n}x${n}: sum ${x.sum}/${x.boards}, max<=16 ${x.cap}/${x.boards}, solution reaches all-1s ${x.solved}/${x.boards} (hit exact tile target ${x.hitTarget}/${x.boards}), arrivals ${x.arrivalSolved}/${x.arrivals}`);
  if (x.sum !== x.boards || x.cap !== x.boards || x.solved !== x.boards || !x.arrivals || x.arrivalSolved !== x.arrivals) fail = true;
}
if (g.ARRIVALS_FROM !== 46) { console.log('ARRIVALS_FROM should be 46'); fail = true; }
// Every stage, in both modes, must replay from its start board to a win, arrivals included.
let checked = 0, arrivalBoards = 0;
for (const mode of ['casual', 'challenge']) {
  for (let k = 0; k < g.STAGES.length; k++) {
    const b = g.stageBoard(mode, k);
    const arrivals = b.arrivals || [];
    if (k >= g.ARRIVALS_FROM) {
      if (!arrivals.length) { console.log(`${mode} stage ${k + 1}: no arrivals`); fail = true; }
      else arrivalBoards++;
    } else if (arrivals.length) {
      console.log(`${mode} stage ${k + 1}: arrivals before stage ${g.ARRIVALS_FROM + 1}`);
      fail = true;
    }
    let cur = b.cells, splits = 0;
    for (const s of b.solution) {
      cur = g.applyStep(cur, b.n, s);
      if (!cur) break;
      if (!s.join) { splits++; cur = g.applyArrivals(cur, arrivals, splits); }
    }
    if (!cur || !g.isWin(cur, b.n)) { console.log(`${mode} stage ${k + 1}: solution does not win`); fail = true; }
    checked++;
  }
}
console.log(`stages: ${checked} replayed, ${arrivalBoards} with arrivals`);
process.exit(fail ? 1 : 0);
