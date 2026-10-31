// Plain-text and Markdown table for scorecard and ui-check rows.
const cell = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s+/g, ' ');

function table(rows, heading) {
  const lines = [`# ${heading}`, '', '| ID | Result | Item | Measured | Target |', '|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.id} | ${r.result} | ${cell(r.title)} | ${cell(r.measured)} | ${cell(r.target)} |`);
  const count = k => rows.filter(r => r.result === k).length;
  lines.push('', `Pass ${count('Pass')} - Fail ${count('Fail')} - Unknown ${count('Unknown')}`);
  const notes = rows.filter(r => r.note && r.result !== 'Pass');
  if (notes.length) { lines.push('', 'Notes', ...notes.map(r => `- ${r.id}: ${cell(r.note)}`)); }
  return lines.join('\n');
}

module.exports = { table };
