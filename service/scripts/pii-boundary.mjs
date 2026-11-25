// MILESTONE 7: the mandatory PII boundary gate.
//   node scripts/pii-boundary.mjs --require-pass
// Sends every request in data/pii-corpus.json through the REAL service (own temporary log) and looks for the personal details in
//   (a) what the customer got back, and (b) what the log recorded for that request.
// It uses its OWN scan, never redactPII: the exact text (any case), or the same digits with spaces, dashes or dots between them.
// Exit 0 only when every request was checked and nothing leaked. Exit 1 for anything else.
// NO FLAG CHANGES THE RESULT: arguments are ignored on purpose, so there is no --force, --skip or --allow to turn a leak into a pass.
// It fails closed: a missing, empty or malformed corpus, an entry with nothing to look for, a service that will not start,
// a request that does not get a 200, or a request that left no log line, all block the release.
import { readFileSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const block = msg => { console.error(`BLOCKED: ${msg}`); process.exit(1); };
process.on('uncaughtException', e => block(`gate crashed: ${e.message}`));
process.on('unhandledRejection', e => block(`gate crashed: ${e?.message ?? e}`));

// ---- the corpus: anything odd blocks ----
function loadCorpus() {
  const file = path.join(root, 'data', 'pii-corpus.json');
  if (!existsSync(file)) block(`corpus not found: ${file}`);
  let items;
  try { items = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { block(`corpus is not valid JSON: ${e.message}`); }
  if (!Array.isArray(items) || items.length === 0) block('corpus is empty: nothing to check');
  items.forEach((it, i) => {
    const where = `corpus entry ${i}${it && it.id ? ` (${it.id})` : ''}`;
    if (!it || typeof it !== 'object') block(`${where} is not an object`);
    if (typeof it.query !== 'string' || !it.query.trim()) block(`${where} has no query`);
    if (!Array.isArray(it.pii) || it.pii.length === 0 || it.pii.some(d => typeof d !== 'string' || !d.trim())) block(`${where} has no details to look for`);
    if (!it.pii.every(d => it.query.toLowerCase().includes(d.toLowerCase()))) block(`${where}: a detail is not in its own query, so the check would prove nothing`);
  });
  return items.map((it, i) => ({ id: String(it.id ?? `#${i}`), query: it.query, pii: it.pii }));
}

// ---- our own scan ----
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function matchers(detail) {
  const out = [new RegExp(esc(detail.trim()).replace(/\s+/g, '\\s+'), 'i')];            // the exact text, any case, any spacing
  const digits = detail.replace(/\D/g, '');
  const forms = new Set();
  if (digits.length >= 7) {
    forms.add(digits);
    if (digits.length === 12 && digits.startsWith('91')) forms.add(digits.slice(2));    // the number without +91
    if (digits.length === 11 && digits.startsWith('0')) forms.add(digits.slice(1));     // the number without the trunk 0
  }
  for (const d of forms) out.push(new RegExp(`(?<!\\d)${d.split('').join('[\\s.\\-]*')}(?!\\d)`));
  return out;
}
const find = (text, details) => details.filter(d => matchers(d).some(re => re.test(text)));

// ---- run ----
const corpus = loadCorpus();
const dir = mkdtempSync(path.join(os.tmpdir(), 'ship-gate-'));
const logFile = path.join(dir, 'app.log');
let svc;
try {
  const { config } = await import(pathToFileURL(path.join(root, 'src', 'config.mjs')).href);
  const { startService } = await import(pathToFileURL(path.join(root, 'src', 'server.mjs')).href);
  svc = await startService({ config: { ...config, logFile } });
} catch (e) { rmSync(dir, { recursive: true, force: true }); block(`the service did not start: ${e.message}`); }

let leaks = 0, checked = 0, offset = 0;
try {
  for (const item of corpus) {
    let status, answerText;
    try {
      const res = await fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: item.query }) });
      status = res.status; answerText = await res.text();
    } catch (e) { console.log(`${item.id}: UNCHECKED (request failed: ${e.message})`); leaks++; continue; }
    const logAll = existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
    const logNew = logAll.slice(offset); offset = logAll.length;
    if (status !== 200) { console.log(`${item.id}: UNCHECKED (HTTP ${status})`); leaks++; continue; }
    if (!logNew.trim()) { console.log(`${item.id}: UNCHECKED (the log recorded nothing for this request, so the log was not checked)`); leaks++; continue; }
    checked++;
    const inAnswer = find(answerText, item.pii), inLog = find(logNew, item.pii);
    if (inAnswer.length || inLog.length) {
      leaks++;
      const parts = [];
      if (inAnswer.length) parts.push(`in the ANSWER: ${inAnswer.join(' | ')}`);
      if (inLog.length) parts.push(`in the LOG: ${inLog.join(' | ')}`);
      console.log(`${item.id}: LEAK ${parts.join('; ')}`);
    } else console.log(`${item.id}: clean`);
  }
} finally { await svc.close(); rmSync(dir, { recursive: true, force: true }); }

if (leaks > 0 || checked !== corpus.length) block(`${leaks} request(s) leaked or could not be checked (checked ${checked} of ${corpus.length}). The release is blocked.`);
console.log(`PASS: checked ${checked} of ${corpus.length} requests (answers and log), no leaks.`);
process.exit(0);
