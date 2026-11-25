// MILESTONE 9 (homework): the runbook, the purge, and a second type of personal data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { app, CORPUS, baseApp, imp, launch, ask, learnerCopy, put, run, tmpDir, holds, path, existsSync, readFileSync, writeFileSync } from '../../../checks/lib/helpers.mjs';

const runbook = path.join(app, 'docs', 'RUNBOOK-pii-in-logs.md');
const section = (text, re) => { const parts = text.split(/^#{1,3}\s+/m); return (parts.find(p => re.test(p.split('\n')[0])) ?? '').split('\n').slice(1).filter(l => l.trim()).join('\n'); };

test('9.1 the runbook exists and every part an on-call engineer needs is filled in, with real commands', () => {
  assert.ok(existsSync(runbook), 'write docs/RUNBOOK-pii-in-logs.md');
  const t = readFileSync(runbook, 'utf8');
  for (const [name, re] of [['who is paged', /page|who/i], ['containment', /contain|stop|switch/i], ['how far back', /how far|window|back|scope/i], ['purge', /purge|clean|redact/i], ['verify the fix', /verify|confirm|check/i], ['severity', /severity|threshold/i]]) {
    assert.ok(section(t, re).split('\n').length >= 2, `the runbook has no section about ${name} with at least two lines in it`);
  }
  assert.ok(/faq_enabled|flag/i.test(t), 'containment should name the flag'); assert.ok(/purge-logs/.test(t), 'the purge step should name npm run purge-logs'); assert.ok(/test:pii-boundary/.test(t), 'the verify step should run the gate');
  assert.ok(/high|critical/i.test(t) && /low|minor/i.test(t), 'name two severity levels: a guardrail that is not firing, and one value that got through');
});

test('9.2 the runbook has been rehearsed, and says when and what happened', () => {
  const t = readFileSync(runbook, 'utf8');
  assert.ok(/rehears\w*[^\n]{0,80}\d{4}-\d{2}-\d{2}/i.test(t), 'add a line such as "Rehearsed: 2026-11-25, against the sample leaked log, and what you found" with a date');
});

test('9.3 purge-logs cleans a copy of an already-leaked log: no personal data, valid JSON, clean lines untouched, a count, and the input left alone', () => {
  const dir = tmpDir(); const input = path.join(dir, 'in.log'); const output = path.join(dir, 'out.log');
  const sample = readFileSync(path.join(baseApp, 'data', 'sample-leaked.log'), 'utf8'); writeFileSync(input, sample);
  const r = run(['scripts/purge-logs.mjs', input, output], { cwd: app });
  assert.equal(r.status, 0, r.out.slice(-300));
  const out = readFileSync(output, 'utf8'); const inLines = sample.split('\n'); const outLines = out.split('\n');
  assert.equal(outLines.length, inLines.length, 'the cleaned copy must have the same number of lines');
  for (const secret of ['98765-43210', '12 MG Road', '91234 56780', '9123456780', '1234 5678 9012 3456', '50100234567890', 'Sunrise Apartments']) assert.ok(!holds(out, secret), `the cleaned copy still holds ${secret}`);
  let changed = 0;
  inLines.forEach((l, i) => { if (!l.trim()) return; JSON.parse(outLines[i]); if (outLines[i] !== l) changed += 1; });
  assert.equal(changed, 7, `7 of the 12 lines hold personal data and every other line must be left exactly as it was: yours changed ${changed}`);
  assert.ok(/7 of 12/.test(r.stdout), `say how many lines changed, for example "7 of 12 lines changed". You printed: ${r.stdout.trim()}`);
  assert.equal(createHash('sha256').update(readFileSync(input)).digest('hex'), createHash('sha256').update(sample).digest('hex'), 'the input file was changed: write a COPY');
});

test('9.4 email addresses are hidden too, in text and in the log', async () => {
  const { redactPII } = await imp('src/redact.mjs');
  const out = redactPII('write to anil.k+bills@example.co.in or meera_s@marlow-test.com please');
  assert.ok(!/@/.test(out), `an email address is still visible: ${out}`); assert.match(out, /\[REDACTED_EMAIL\]/);
  const { svc, logFile } = await launch(process.cwd());
  try { await ask(svc, 'my email is ravi@example.org, what is the late fee?'); } finally { await svc.close(); }
  assert.ok(!readFileSync(logFile, 'utf8').includes('ravi@example.org'), 'the log holds an email address');
});

test('9.5 the gate still passes with the email requests added to the corpus, and nothing from before has regressed', () => {
  const dir = learnerCopy(); put(dir, 'data/pii-corpus.json', JSON.stringify(CORPUS));
  const r = run(['scripts/pii-boundary.mjs', '--require-pass'], { cwd: dir });
  assert.equal(r.status, 0, `the gate failed with all ${CORPUS.length} requests:\n${r.out.split('\n').filter(l => /LEAK|BLOCKED/.test(l)).slice(0, 4).join('\n')}`);
  const tests = run(['scripts/test.mjs'], { cwd: app });
  assert.equal(tests.status, 0, `npm test fails after the change:\n${tests.out.split('\n').filter(l => /✖|Error/.test(l)).slice(0, 4).join('\n')}`);
});
