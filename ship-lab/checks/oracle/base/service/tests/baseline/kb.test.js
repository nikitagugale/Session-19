import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../src/config.mjs';
import { loadKb, retrieve } from '../../src/retrieve.mjs';

test('the knowledge base has 21 Marlow Mobile sections, each with an id', () => {
  const kb = loadKb(config.kbDir);
  assert.equal(kb.sections.length, 21);
  assert.ok(kb.sections.every(s => s.id && s.text));
});

test('a keyword search finds the UP-24 section first for a question about UP-24', () => {
  const kb = loadKb(config.kbDir);
  const hits = retrieve(kb, 'What does the UP-24 plan cost?', 3);
  assert.equal(hits[0].id, 'up-24');
});

test('the price table has a mid and a small stand-in model, with a price for input and for output', () => {
  assert.ok(config.prices['marlow-llm-2026-10-14'].inPerM > config.prices['marlow-llm-mini-2026-10-14'].inPerM);
  assert.ok(config.prices['marlow-llm-2026-10-14'].outPerM > config.prices['marlow-llm-2026-10-14'].inPerM);
});
