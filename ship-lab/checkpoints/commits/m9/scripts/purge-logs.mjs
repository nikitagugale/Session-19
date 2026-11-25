// MILESTONE 9 (homework): redact lines that were ALREADY written.   npm run purge-logs -- data/sample-leaked.log results/clean.log
// Stopping new leaks is not enough: the old lines are still on disk. This writes a cleaned COPY (it never edits the input), keeps every line that
// had nothing to hide exactly as it was, keeps every cleaned line valid JSON, and says how many lines it changed.
import { readFileSync, writeFileSync } from 'node:fs';
import { redactDeep, redactPII } from '../src/redact.mjs';

const [, , input, output] = process.argv;
if (!input || !output) { console.error('usage: npm run purge-logs -- <input.log> <output.log>'); process.exit(2); }

const lines = readFileSync(input, 'utf8').split('\n');
let total = 0;
let changed = 0;
const out = lines.map(line => {
  if (!line.trim()) return line;
  total += 1;
  let cleaned;
  try {
    const record = JSON.parse(line);
    const redacted = redactDeep(record);
    cleaned = JSON.stringify(redacted) === JSON.stringify(record) ? line : JSON.stringify(redacted);
  } catch {
    cleaned = redactPII(line);
  }
  if (cleaned !== line) changed += 1;
  return cleaned;
});
writeFileSync(output, out.join('\n'));
console.log(`${changed} of ${total} lines changed. The cleaned copy is ${output}. The input was not touched.`);
