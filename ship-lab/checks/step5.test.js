// MILESTONE 5: lock the model and the cost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { imp, launch, ask, path } from '../../../checks/lib/helpers.mjs';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('5.1 the settings are locked: a pinned model with a price, a token limit and a timeout', async () => {
  const { config } = await imp('src/config.mjs');
  assert.ok(/\d/.test(config.model) && !/(latest|auto|default|stable|current)/i.test(config.model), `"${config.model}" is not pinned: an exact version has digits in it, and "latest" is not a version`);
  assert.ok(config.prices[config.model], `there is no price for "${config.model}" in data/prices.json, so its cost cannot be worked out`);
  assert.ok(Number.isInteger(config.maxTokens) && config.maxTokens >= 50 && config.maxTokens <= 1000, `maxTokens is ${config.maxTokens}: set a limit between 50 and 1000 that a FAQ answer fits in`);
  assert.ok(config.timeoutMs >= 500 && config.timeoutMs <= 30000, `timeoutMs is ${config.timeoutMs}: set a timeout between 0.5 and 30 seconds`);
  assert.ok(config.maxQueryChars > 0 && config.maxQueryChars <= 2000);
});

test('5.2 estimateCost is input tokens times the input price plus output tokens times the output price, per million', async () => {
  const { estimateCost } = await imp('src/cost.mjs');
  const prices = { m: { inPerM: 2, outPerM: 10 } };
  assert.ok(near(estimateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'm', prices), 12));
  assert.ok(near(estimateCost({ inputTokens: 700, outputTokens: 120 }, 'm', prices), 0.0026), 'for 700 in and 120 out at 2 and 10 dollars per million, it is 0.0026');
  assert.throws(() => estimateCost({ inputTokens: 1, outputTokens: 1 }, 'unknown', prices), 'an unknown model must throw: a silent zero hides a bill');
});

test('5.3 projectMonthly turns a volume into a per-request and a monthly cost', async () => {
  const { projectMonthly } = await imp('src/cost.mjs');
  const r = projectMonthly({ requestsPerMonth: 20000, avgInputTokens: 700, avgOutputTokens: 120 }, { model: 'm', prices: { m: { inPerM: 2, outPerM: 10 } } });
  assert.ok(near(r.perRequestUSD, 0.0026), `perRequestUSD is ${r.perRequestUSD}`); assert.ok(near(r.monthlyUSD, 52, 1e-6), `monthlyUSD is ${r.monthlyUSD}`);
});

test('5.4 costAlert is ok below the warning line, warn from it up to the cap, and breach above the cap', async () => {
  const { costAlert } = await imp('src/cost.mjs');
  const lvl = (p, c, w) => costAlert({ projectedMonthlyUSD: p, capUSD: c, warnAt: w }).level;
  assert.equal(lvl(50, 100), 'ok'); assert.equal(lvl(79, 100), 'ok'); assert.equal(lvl(80, 100), 'warn'); assert.equal(lvl(100, 100), 'warn', 'exactly at the cap is a warning, not a breach');
  assert.equal(lvl(101, 100), 'breach'); assert.equal(lvl(60, 100, 0.5), 'warn', 'warnAt must be honoured');
  assert.ok(near(costAlert({ projectedMonthlyUSD: 52, capUSD: 100 }).ratio, 0.52));
});

test('5.5 the design fits its own cap: the expected volume projects below the monthly cap, and the settings say so', async () => {
  const { config } = await imp('src/config.mjs'); const { projectMonthly, costAlert } = await imp('src/cost.mjs');
  assert.ok(config.monthlyCapUSD > 0 && config.expected, 'put the monthly cap (monthlyCapUSD) and the expected volume (expected) in the settings');
  const p = projectMonthly(config.expected, { model: config.model, prices: config.prices });
  assert.notEqual(costAlert({ projectedMonthlyUSD: p.monthlyUSD, capUSD: config.monthlyCapUSD, warnAt: config.alertAt ?? 0.8 }).level, 'breach', `projected ${p.monthlyUSD.toFixed(2)} a month against a cap of ${config.monthlyCapUSD}`);
});

test('5.6 every response says which model answered, the token limit, the tokens used and what it cost', async () => {
  const { estimateCost } = await imp('src/cost.mjs');
  const { svc, config } = await launch(process.cwd());
  try {
    const { body } = await ask(svc, 'What is the late fee?');
    assert.equal(body.meta.model, config.model); assert.equal(body.meta.maxTokens, config.maxTokens);
    assert.ok(Number.isInteger(body.meta.usage.inputTokens) && Number.isInteger(body.meta.usage.outputTokens));
    assert.ok(typeof body.meta.costUSD === 'number' && near(body.meta.costUSD, estimateCost(body.meta.usage, config.model, config.prices), 1e-6), `costUSD is ${body.meta.costUSD}`);
  } finally { await svc.close(); }
});

test('5.7 the token limit is enforced: an answer that would be long is cut at maxTokens', async () => {
  const { svc } = await launch(process.cwd(), { config: { maxTokens: 20 } });
  try {
    const { body } = await ask(svc, 'Tell me everything about the late fee');
    assert.ok(body.meta.usage.outputTokens <= 20, `the answer used ${body.meta.usage.outputTokens} tokens against a limit of 20`);
  } finally { await svc.close(); }
});

test('5.8 a floating alias is refused: the service will not start with an unpinned model', async () => {
  const { startService } = await imp('src/server.mjs'); const { config } = await imp('src/config.mjs');
  let svc;
  try { svc = await startService({ config: { ...config, model: 'marlow-llm-latest' } }); } catch (e) { assert.match(`${e.name} ${e.message}`, /pinned|UnpinnedModel/i, `starting with "marlow-llm-latest" failed, but not with a clear error about the model not being pinned: ${e.message}`); return; }
  await svc.close();      // it started, which is the failure: close it so that this check can end
  assert.fail('the service started with the floating alias "marlow-llm-latest": it must refuse');
});

test('5.9 a model that is too slow is cut off at the timeout, with a 504 and a log line, and not left hanging', async () => {
  const slow = http.createServer((req, res) => { setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: 'late' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 1 } })); }, 400); });
  await new Promise(r => slow.listen(0, '127.0.0.1', r));
  const keep = { ...process.env };
  Object.assign(process.env, { LLM_MODE: 'live', LLM_BASE_URL: `http://127.0.0.1:${slow.address().port}`, LLM_API_KEY: 'not-a-real-key', LLM_MODEL: 'fake-model-2026-01' });
  let svc;
  try {
    ({ svc } = await launch(process.cwd(), { config: { timeoutMs: 60 } }));
    const t0 = Date.now(); const { status, body } = await ask(svc, 'What is the late fee?');
    assert.equal(status, 504, `a slow model gave HTTP ${status}`); assert.equal(body.error, 'model_timeout'); assert.ok(Date.now() - t0 < 350, 'it should not wait for the slow model');
  } finally { if (svc) await svc.close(); for (const k of ['LLM_MODE', 'LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL']) { if (k in keep) process.env[k] = keep[k]; else delete process.env[k]; } slow.close(); }
});
