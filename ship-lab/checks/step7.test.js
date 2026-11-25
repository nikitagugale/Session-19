// MILESTONE 7: the mandatory PII gate. The learner's scripts/pii-boundary.mjs is run on copies: a good service, broken services, a broken corpus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app, CORPUS, mutant, oracleCopy, put, run, path, existsSync, readFileSync } from '../../../checks/lib/helpers.mjs';
import { copyFileSync, rmSync } from 'node:fs';

const gateFile = path.join(app, 'scripts', 'pii-boundary.mjs');
const corpus = CORPUS.filter(c => c.type !== 'email');
const setup = dir => { put(dir, 'scripts/pii-boundary.mjs', readFileSync(gateFile, 'utf8')); put(dir, 'data/pii-corpus.json', JSON.stringify(corpus)); return dir; };
const gate = (dir, args = []) => run(['scripts/pii-boundary.mjs', ...args], { cwd: dir });
const leaky = edits => setup(mutant(edits));

test('7.1 the gate exists and passes on a service that does not leak', () => {
  assert.ok(existsSync(gateFile));
  const r = gate(setup(oracleCopy()), ['--require-pass']);
  assert.equal(r.status, 0, `the gate failed on a good service:\n${r.out.split('\n').slice(-6).join('\n')}`);
});

test('7.2 it blocks a service that leaks in the LOG only (protected in the answer, not in the log)', () => {
  const r = gate(leaky([['src/log.mjs', 'const record = redactDeep({', 'const record = ({']]), ['--require-pass']);
  assert.notEqual(r.status, 0, 'the log leaked, and the gate passed: it must scan the log file, not only the answers');
});

test('7.3 it blocks a service that leaks in the ANSWER only (protected in the log, not in the answer)', () => {
  const r = gate(leaky([['src/answer.mjs', 'return { answer: scan.text, citations, meta };', 'return { answer: r.text, citations, meta };']]), ['--require-pass']);
  assert.notEqual(r.status, 0, 'the answers leaked, and the gate passed: it must scan what the customer gets back');
});

test('7.4 it blocks a service that leaks only ONE format (a phone number written with spaces)', () => {
  const r = gate(leaky([['src/redact.mjs', "(?:\\(?\\+?91\\)?[\\s-]?|0)?[6-9]\\d{4}[\\s-]?\\d{5}", "(?:\\(?\\+?91\\)?-?|0)?[6-9]\\d{4}-?\\d{5}"]]), ['--require-pass']);
  assert.notEqual(r.status, 0, 'one format leaked, and the gate passed: the corpus has many formats, and every one must be checked');
});

test('7.5 there is no way to override it: no flag turns a leak into a pass', () => {
  const dir = leaky([['src/log.mjs', 'const record = redactDeep({', 'const record = ({']]);
  for (const flag of ['--force', '--skip', '--allow', '--ignore', '--no-fail', '--override', '--warn-only', '--continue-on-error']) {
    const r = gate(dir, ['--require-pass', flag]);
    assert.notEqual(r.status, 0, `with ${flag} a leaking service passed the gate: sign-off must be blocked with no override`);
  }
});

test('7.6 it fails closed: a missing, empty or malformed corpus blocks, and so does an entry with no details to look for, because a gate that checks nothing proves nothing', () => {
  const dir = setup(oracleCopy());
  rmSync(path.join(dir, 'data', 'pii-corpus.json'));
  assert.notEqual(gate(dir, ['--require-pass']).status, 0, 'a missing corpus passed the gate');
  for (const [name, body] of [['an empty list', '[]'], ['not JSON', 'oops'], ['entries with no personal data to look for', '[{"id":"x","query":"hi","pii":[]}]']]) {
    put(dir, 'data/pii-corpus.json', body);
    assert.notEqual(gate(dir, ['--require-pass']).status, 0, `${name} passed the gate`);
  }
});

test('7.7 it fails closed when the service cannot start, instead of passing because nothing ran', () => {
  const dir = setup(oracleCopy());
  rmSync(path.join(dir, 'data', 'kb'), { recursive: true });
  assert.notEqual(gate(dir, ['--require-pass']).status, 0, 'a service that could not start passed the gate');
});

test('7.8 it says what it found: a leak names the request, and a pass says how many requests it checked', () => {
  const bad = gate(leaky([['src/log.mjs', 'const record = redactDeep({', 'const record = ({']]), ['--require-pass']);
  assert.ok(/p0\d|LEAK|leak/i.test(bad.out), 'a failing gate should print which request leaked');
  const good = gate(setup(oracleCopy()), ['--require-pass']);
  assert.ok(new RegExp(String(corpus.length)).test(good.out), `a passing gate should say how many requests it checked (${corpus.length})`);
});
