// MILESTONE 7: the mandatory PII boundary gate.   npm run test:pii-boundary -- --require-pass
// It sends every request in data/pii-corpus.json through the real service, then scans BOTH what customers got back AND what the log recorded,
// with its own scan (not the redaction function it is testing). Any leak blocks the sign-off.
//   - exit code 0 only when nothing leaked; 1 for any leak, any error, a missing or empty corpus, or a service that will not start
//   - there is no override: no flag changes the exit code, and "checked nothing" is a failure, not a pass
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config, root } from '../src/config.mjs';
import { startService } from '../src/server.mjs';

const block = reason => { console.error(`\nPII_BOUNDARY_TEST BLOCKED: ${reason}`); process.exit(1); };

const corpusFile = path.join(root, 'data', 'pii-corpus.json');
if (!existsSync(corpusFile)) block('data/pii-corpus.json is missing: a gate that checks nothing must not pass');
let corpus;
try { corpus = JSON.parse(readFileSync(corpusFile, 'utf8')); } catch { block('data/pii-corpus.json is not valid JSON'); }
if (!Array.isArray(corpus) || corpus.length === 0 || corpus.some(c => !c.query || !Array.isArray(c.pii) || c.pii.length === 0)) block('the corpus is empty or malformed: a gate that checks nothing must not pass');

const digits = s => s.replace(/\D/g, '');
const compact = text => text.replace(/(?<=\d)[\s-]+(?=\d)/g, '');
const holds = (text, pii) => text.toLowerCase().includes(pii.toLowerCase()) || (digits(pii).length >= 10 && compact(text).includes(digits(pii)));

const logFile = path.join(mkdtempSync(path.join(os.tmpdir(), 'pii-gate-')), 'app.log');
let svc;
try { svc = await startService({ config: { ...config, logFile } }); } catch (e) { block(`the service did not start: ${e.message}`); }

const rows = [];
const answers = [];
try {
  for (const item of corpus) {
    const res = await fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: item.query }) });
    if (res.status >= 500) block(`the service failed (HTTP ${res.status}) on ${item.id ?? item.query.slice(0, 30)}`);
    answers.push({ item, text: await res.text() });
  }
} finally { await svc.close(); }

const log = existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
let leaks = 0;
console.log('PII_BOUNDARY_TEST  id    answer  log');
for (const { item, text } of answers) {
  const inAnswer = item.pii.filter(p => holds(text, p));
  const inLog = item.pii.filter(p => holds(log, p));
  leaks += inAnswer.length + inLog.length;
  console.log(`                   ${String(item.id ?? '?').padEnd(5)} ${(inAnswer.length ? 'LEAK' : 'clean').padEnd(7)} ${inLog.length ? 'LEAK' : 'clean'}${inAnswer.length || inLog.length ? `   ${[...inAnswer, ...inLog].join(' | ')}` : ''}`);
}
if (leaks) block(`${leaks} leak(s) of personal data in the answers or the log. Sign-off is blocked: there is no override.`);
console.log(`\nPII_BOUNDARY_TEST PASSED: ${corpus.length} requests, no personal data in the answers or the log.`);
