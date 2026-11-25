// MILESTONE 6: write guardrail tests that bite. The learner's suite must pass on a good service and FAIL on each broken one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app, countTests, mutant, oracleCopy, run, runTestFile, path, existsSync, readFileSync } from '../../../checks/lib/helpers.mjs';

const suite = path.join(app, 'tests', 'learner', 'guardrails.test.js');
const count = () => countTests(oracleCopy(), suite);      // counts the tests that really run, so a loop over a list of cases counts each one

const MUTANTS = [
  ['6.3', 'the input guardrail is switched off, so an attack reaches the model', [['src/answer.mjs', 'if (!screen.ok) {', 'if (false) {']], 'add a test that sends an injection attempt and asserts it is refused and that the model was NOT called'],
  ['6.4', 'the output guardrail is switched off, so what the model repeats reaches the customer', [['src/answer.mjs', 'const scan = scanOutput(r.text);', 'const scan = { ok: true, text: r.text };']], 'add a test with a model that repeats personal details, and assert the customer does not see them'],
  ['6.5', 'the log boundary is removed, so the log holds what customers typed', [['src/log.mjs', 'const record = redactDeep({', 'const record = ({']], 'add a test that sends personal details and reads the log file'],
  ['6.6', 'the length limit is never applied, so a huge question goes through', [['src/guards.mjs', 'query.length > maxChars', 'query.length > 1e9']], 'add a test with a question over the limit'],
  ['6.7', 'only one phrasing of an attack is caught (the others get through)', [['src/guards.mjs', 'INJECTION.some(re => re.test(query))', 'INJECTION.slice(0, 1).some(re => re.test(query))']], 'attacks come in many phrasings: test at least three different ones'],
  ['6.8', 'the guardrail is too strong, so an honest question about "instructions" is refused', [['src/guards.mjs', 'INJECTION.some(re => re.test(query))', '(INJECTION.some(re => re.test(query)) || /instructions/i.test(query))']], 'add a test that an honest question that sounds like an attack is NOT refused'],
  ['6.9', 'a leaked system prompt in the answer is not caught', [['src/guards.mjs', 'LEAK.some(re => re.test(text))', 'false']], 'add a test with a model that prints its own instructions, and assert the customer does not see them'],
  ['6.10', 'redaction is too greedy, so a price and a helpline number are hidden', [['src/redact.mjs', '\\d{11,16}', '\\d{4,16}']], 'add a test that ordinary numbers (a price, a helpline) survive every guardrail'],
];

test('6.1 there is a guardrail suite at tests/learner/guardrails.test.js, with at least six tests', () => {
  assert.ok(existsSync(suite), 'save your suite as tests/learner/guardrails.test.js');
  const n = count();
  assert.ok(n >= 6, `the file runs ${n} test(s): cover the log, the answer, an attack, a long question, an honest question and a leaked prompt (at least six)`);
});

test('6.2 the suite passes on your own code, and on a service that is correct', () => {
  const own = run(['--test', '--test-reporter=spec', suite], { cwd: app });
  assert.equal(own.status, 0, `your suite fails on your own service:\n${own.out.split('\n').filter(l => /✖|Error|holds|refused/.test(l)).slice(0, 4).join('\n')}`);
  const ref = runTestFile(oracleCopy(), suite);
  assert.equal(ref.status, 0, `your suite fails on the reference service, which is correct. A test must not ask for more than milestones 2 to 4 do: for example an attack phrasing that only YOUR guard catches (use the three families in milestone 3), or a stricter rule of your own. Failing:\n${ref.out.split('\n').filter(l => /✖|Error/.test(l)).slice(0, 4).join('\n')}`);
});

for (const [id, what, edits, advice] of MUTANTS) {
  test(`${id} it FAILS when ${what}`, () => {
    const r = runTestFile(mutant(edits), suite);
    assert.notEqual(r.status, 0, `the broken service still passed your suite: ${advice}`);
  });
}
