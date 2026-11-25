// MILESTONE 2: redact at the log boundary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imp, CORPUS, holds, launch, ask, tmpDir, path, readFileSync, existsSync } from '../../../checks/lib/helpers.mjs';

const NON_EMAIL = CORPUS.filter(c => c.type !== 'email');
const NEGATIVES = ['Plan 599 gives 100 GB for 28 days', 'The UP-24 plan costs 799 rupees a month', 'Error E-5012 appears when the SIM is locked', 'Call 1800-123-4567 from 10:00 to 19:00', 'Order #12345 is delayed', 'The IR-7 pack costs 1499 rupees for 7 days in 40 countries', 'Your bill of 2,499 rupees is due on 2026-11-30', 'Send PORT and your number to 1900 to get a code'];

test('2.1 every phone, account and address format in the corpus is hidden', async () => {
  const { redactPII } = await imp('src/redact.mjs');
  assert.equal(typeof redactPII, 'function', 'src/redact.mjs must export redactPII(text)');
  const missed = [];
  for (const c of NON_EMAIL) { const out = redactPII(c.query); for (const p of c.pii) if (out.toLowerCase().includes(p.toLowerCase())) missed.push(p); }
  assert.deepEqual(missed, [], `still visible after redaction: ${missed.join(' | ')}`);
});

test('2.2 each kind of detail becomes its own token', async () => {
  const { redactPII } = await imp('src/redact.mjs');
  assert.match(redactPII('call 98765-43210 now'), /\[REDACTED_PHONE\]/);
  assert.match(redactPII('account 1234 5678 9012 3456 is late'), /\[REDACTED_ACCOUNT\]/);
  assert.match(redactPII('I live at Flat 4B, Sunrise Apartments, Koramangala'), /\[REDACTED_ADDRESS\]/);
  assert.equal(redactPII('my number is 98765-43210 and address is 12 MG Road, can you check my plan?'), 'my number is [REDACTED_PHONE] and address is [REDACTED_ADDRESS], can you check my plan?');
});

test('2.3 ordinary numbers and words are left alone: prices, codes, a helpline, a date', async () => {
  const { redactPII } = await imp('src/redact.mjs');
  for (const s of NEGATIVES) assert.equal(redactPII(s), s, `over-redacted: "${s}" became "${redactPII(s)}"`);
});

test('2.4 every line of the knowledge base survives untouched, and redacting twice changes nothing', async () => {
  const { redactPII } = await imp('src/redact.mjs');
  const { config } = await imp('src/config.mjs');
  const { readdirSync } = await import('node:fs');
  for (const f of readdirSync(config.kbDir)) for (const line of readFileSync(path.join(config.kbDir, f), 'utf8').split('\n')) if (line.trim()) assert.equal(redactPII(line), line, `a knowledge base line was changed: ${line}`);
  for (const c of NON_EMAIL) assert.equal(redactPII(redactPII(c.query)), redactPII(c.query), `not idempotent on ${c.id}`);
  assert.equal(redactPII(42), 42); assert.equal(redactPII(null), null);
});

test('2.5 the logger applies it to every line, deep inside objects, arrays and errors, and keeps the line valid JSON', async () => {
  const { createLogger } = await imp('src/log.mjs');
  const logFile = path.join(tmpDir(), 'app.log');
  const log = createLogger({ logFile });
  log.info('probe', { a: { b: ['call 98765-43210', { c: 'Flat 4B, Sunrise Apartments, Koramangala' }] }, err: new Error('failed for 98765 43210'), costUSD: 0.0012, n: 7 });
  log.warn('probe2', { account: '1234 5678 9012 3456' });
  const lines = readFileSync(logFile, 'utf8').trim().split('\n');
  const recs = lines.map(l => JSON.parse(l));
  for (const secret of ['98765-43210', '98765 43210', 'Sunrise Apartments', '1234 5678 9012 3456']) assert.ok(!lines.join('\n').includes(secret), `the log holds ${secret}`);
  assert.equal(recs[0].event, 'probe'); assert.equal(recs[0].level, 'info'); assert.ok(recs[0].ts);
  assert.equal(recs[0].costUSD, 0.0012, 'a number must stay a number'); assert.equal(recs[0].n, 7);
  assert.equal(recs[1].level, 'warn');
});

test('2.6 it is applied ONCE, at the boundary: server.mjs and answer.mjs do not call redaction themselves', async () => {
  const { config } = await imp('src/config.mjs');
  for (const f of ['server.mjs', 'answer.mjs']) assert.ok(!/redact/i.test(readFileSync(path.join(config.root, 'src', f), 'utf8')), `src/${f} mentions redaction: put it in the logger, so that no call site has to remember`);
});

test('2.7 end to end: after every request in the corpus, the log holds none of the personal details', async () => {
  const { svc, logFile } = await launch(path.join(process.cwd()));
  try { for (const c of NON_EMAIL) await ask(svc, c.query); } finally { await svc.close(); }
  assert.ok(existsSync(logFile));
  const log = readFileSync(logFile, 'utf8');
  const leaked = NON_EMAIL.flatMap(c => c.pii.filter(p => holds(log, p)));
  assert.deepEqual(leaked, [], `the log still holds: ${leaked.join(' | ')}`);
});
