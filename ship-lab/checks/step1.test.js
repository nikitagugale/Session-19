// MILESTONE 1: reproduce the leak, as a test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app, baseCopy, countTests, mutant, oracleCopy, runTestFile, path, existsSync, readFileSync } from '../../../checks/lib/helpers.mjs';

const leak = path.join(app, 'tests', 'learner', 'leak.test.js');
const testCount = () => countTests(baseCopy(), leak);      // counts the cases that really run, so a loop over a list of cases counts each one
const ASSERTS = /holds|log|AssertionError|leak/i;
const BROKEN = /Cannot find module|SyntaxError|ReferenceError|ERR_MODULE_NOT_FOUND|is not a function/;

test('1.1 there is a test file at tests/learner/leak.test.js, with at least three cases', () => {
  assert.ok(existsSync(leak), 'save your test as tests/learner/leak.test.js');
  const n = testCount();
  assert.ok(n >= 3, `the file runs ${n} test(s): use at least three different formats of personal data (a phone number, an account number, an address)`);
});

test('1.2 it is RED on the shipped code: it fails, and it fails because the log holds the personal data', () => {
  const r = runTestFile(baseCopy(), leak);
  assert.notEqual(r.status, 0, 'your test passed on the shipped code, so it does not prove the leak. It must fail until the leak is fixed');
  assert.ok(!BROKEN.test(r.out), `your test is broken, it does not run:\n${r.out.split('\n').filter(l => BROKEN.test(l)).slice(0, 2).join('\n')}`);
  assert.ok(ASSERTS.test(r.out), 'it failed, but not on an assertion about the log: check that you read the log file and assert on what is in it');
});

test('1.3 it is GREEN on a service that is fixed, so it is a real test and not a test that always fails', () => {
  const r = runTestFile(oracleCopy(), leak);
  assert.equal(r.status, 0, `your test fails even on the fixed service. It must pass once the log is clean:\n${r.out.split('\n').filter(l => /✖|holds|Error/.test(l)).slice(0, 4).join('\n')}`);
});

test('1.4 it catches a phone number that leaks only in one format (with spaces)', () => {
  const r = runTestFile(mutant([['src/redact.mjs', "(?:\\(?\\+?91\\)?[\\s-]?|0)?[6-9]\\d{4}[\\s-]?\\d{5}", "(?:\\(?\\+?91\\)?-?|0)?[6-9]\\d{4}-?\\d{5}"]]), leak);
  assert.notEqual(r.status, 0, 'a service that leaks "+91 98765 43210" and "98765 43210" (with spaces) still passed your test: add a phone number written with spaces');
});

test('1.5 it catches an account number that leaks', () => {
  const r = runTestFile(mutant([['src/redact.mjs', ".replace(ACCOUNT, '[REDACTED_ACCOUNT]')", '']]), leak);
  assert.notEqual(r.status, 0, 'a service that leaks account numbers still passed your test: add an account number (14 digits, or in groups of four)');
});

test('1.6 it catches an address that leaks', () => {
  const r = runTestFile(mutant([['src/redact.mjs', "for (const re of ADDRESS) out = out.replace(re, '[REDACTED_ADDRESS]');", '']]), leak);
  assert.notEqual(r.status, 0, 'a service that leaks addresses still passed your test: add an address such as "Flat 4B, Sunrise Apartments, Koramangala"');
});
