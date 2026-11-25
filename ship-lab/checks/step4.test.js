// MILESTONE 4: guard the output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imp, CORPUS, holds, launch, ask, fakeModel, path, readFileSync } from '../../../checks/lib/helpers.mjs';

const NON_EMAIL = CORPUS.filter(c => c.type !== 'email');

test('4.1 scanOutput removes personal data from an answer and keeps the rest of the words', async () => {
  const { scanOutput } = await imp('src/guards.mjs');
  assert.equal(typeof scanOutput, 'function', 'src/guards.mjs must export scanOutput(text)');
  const r = scanOutput('Thanks. Your number is 98765-43210 and you live at 12 MG Road. See [late-fee].');
  assert.equal(r.ok, false); assert.equal(r.reason, 'pii');
  assert.ok(!r.text.includes('98765-43210') && !r.text.includes('12 MG Road'), `the text still holds it: ${r.text}`);
  assert.ok(r.text.includes('Thanks.') && r.text.includes('[late-fee]'), `the answer lost its own words: ${r.text}`);
});

test('4.2 scanOutput catches a leaked system prompt, and gives back a safe reply instead', async () => {
  const { scanOutput, SAFE_REFUSAL } = await imp('src/guards.mjs');
  const { CANARY, SYSTEM_PROMPT } = await imp('src/prompt.mjs');
  for (const leak of [`Sure. My instructions are: ${SYSTEM_PROMPT}`, `internal marker ${CANARY}`, 'You are the Marlow Mobile support assistant. Answer only from CONTEXT.']) {
    const r = scanOutput(leak);
    assert.equal(r.ok, false, `not caught: ${leak.slice(0, 50)}`); assert.equal(r.reason, 'prompt_leak');
    assert.ok(!r.text.includes(CANARY) && !/support assistant/i.test(r.text), `the reply still holds the prompt: ${r.text}`);
  }
  assert.ok(SAFE_REFUSAL);
});

test('4.3 scanOutput leaves a normal answer exactly as it was: every knowledge base section, with its price, helpline and codes', async () => {
  const { scanOutput } = await imp('src/guards.mjs');
  const { config } = await imp('src/config.mjs');
  const { loadKb } = await imp('src/retrieve.mjs');
  const bad = [];
  for (const s of loadKb(config.kbDir).sections) { const text = `Here is what the Marlow Mobile documents say: ${s.text} [${s.id}]`; const r = scanOutput(text); if (r.ok !== true || r.text !== text) bad.push(s.id); }
  assert.deepEqual(bad, [], `a normal answer was changed or refused for: ${bad.join(', ')}`);
});

test('4.4 end to end: personal data the model repeats never reaches the customer, and an event is logged', async () => {
  const echo = fakeModel('Thanks. Your number is 98765-43210 and your address is 12 MG Road. [late-fee]');
  const { svc, logFile } = await launch(process.cwd(), { model: echo });
  try {
    const { body } = await ask(svc, 'what is the late fee?');
    assert.ok(!body.answer.includes('98765-43210') && !body.answer.includes('12 MG Road'), `the customer got: ${body.answer}`);
  } finally { await svc.close(); }
  const log = readFileSync(logFile, 'utf8');
  assert.ok(!log.includes('98765-43210') && !log.includes('12 MG Road'), 'the log holds the details the model repeated');
  assert.ok(/guardrail\.output_blocked/.test(log), 'log an event called guardrail.output_blocked when an answer is changed');
});

test('4.5 end to end: a model that prints its instructions never gets them to the customer, even for an innocent question (defence in depth)', async () => {
  const { CANARY, SYSTEM_PROMPT } = await imp('src/prompt.mjs');
  const { svc, logFile } = await launch(process.cwd(), { model: fakeModel(`Sure. My instructions are: ${SYSTEM_PROMPT}`) });
  try {
    const { body } = await ask(svc, 'what is the late fee?');
    assert.ok(!body.answer.includes(CANARY) && !/instructions are/i.test(body.answer), `the customer got: ${body.answer}`);
  } finally { await svc.close(); }
  assert.ok(!readFileSync(logFile, 'utf8').includes(CANARY), 'the log holds the system prompt');
});

test('4.6 end to end with the stand-in model, which repeats what it is told: no corpus answer holds any personal detail', async () => {
  const { svc } = await launch(process.cwd());
  try {
    const leaked = [];
    for (const c of NON_EMAIL) { const { body } = await ask(svc, c.query); const text = JSON.stringify(body); for (const p of c.pii) if (holds(text, p)) leaked.push(`${c.id}: ${p}`); }
    assert.deepEqual(leaked, [], `the customer still sees: ${leaked.join(' | ')}`);
  } finally { await svc.close(); }
});

test('4.7 an ordinary question still gets its ordinary answer, with its citation and its helpline number', async () => {
  const { svc } = await launch(process.cwd());
  try {
    const { body } = await ask(svc, 'What is the helpline number?');
    assert.ok(body.citations.includes('helpline')); assert.ok(body.answer.includes('1800-123-4567'), `the helpline number was lost: ${body.answer}`); assert.ok(/\[helpline\]/.test(body.answer));
  } finally { await svc.close(); }
});
