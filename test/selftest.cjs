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
process.exit(fail ? 1 : 0);
