import { test } from 'node:test';
import assert from 'node:assert/strict';
import { complete, estimateTokens } from '../../../engine/index.mjs';

const prompt = 'CONTEXT:\n[up-24] Plan code UP-24. 799 rupees a month.\n\nQUESTION: What does UP-24 cost?';

test('the stand-in model is deterministic and cites the section it answered from', () => {
  const a = complete({ model: 'marlow-llm-2026-10-14', system: 's', prompt });
  const b = complete({ model: 'marlow-llm-2026-10-14', system: 's', prompt });
  assert.deepEqual(a, b);
  assert.match(a.text, /\[up-24\]/);
  assert.ok(a.usage.inputTokens > 0 && a.usage.outputTokens > 0);
});

test('the stand-in model refuses a model name it does not know', () => {
  assert.throws(() => complete({ model: 'gpt-nonexistent', prompt }), /unknown model/);
});

test('a token count is about one token for four characters, and never zero', () => {
  assert.equal(estimateTokens('abcdefgh'), 2);
  assert.equal(estimateTokens(''), 1);
});
