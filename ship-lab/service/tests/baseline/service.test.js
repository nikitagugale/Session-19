import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../../src/config.mjs';
import { startService } from '../../src/server.mjs';

const fresh = () => ({ ...config, logFile: path.join(mkdtempSync(path.join(os.tmpdir(), 'ship-base-')), 'app.log') });
const post = (svc, body) => fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the service answers a normal question from the documents, with a citation', async () => {
  const svc = await startService({ config: fresh() });
  try {
    const res = await post(svc, { query: 'What is the late fee?' });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.citations.includes('late-fee'));
    assert.match(body.answer, /late fee/i);
  } finally { await svc.close(); }
});

test('the service refuses a request with no question', async () => {
  const svc = await startService({ config: fresh() });
  try {
    assert.equal((await post(svc, {})).status, 400);
    assert.equal((await post(svc, { query: '   ' })).status, 400);
  } finally { await svc.close(); }
});

test('the service writes one JSON line to the log for the request and one for the response', async () => {
  const cfg = fresh();
  const svc = await startService({ config: cfg });
  try {
    await post(svc, { query: 'What is the late fee?' });
    assert.ok(existsSync(cfg.logFile));
    const events = readFileSync(cfg.logFile, 'utf8').trim().split('\n').map(l => JSON.parse(l).event);
    assert.deepEqual(events.slice(0, 2), ['chat.request', 'chat.response']);
  } finally { await svc.close(); }
});

test('the health endpoint answers 200', async () => {
  const svc = await startService({ config: fresh() });
  try {
    const res = await fetch(`${svc.url}/healthz`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  } finally { await svc.close(); }
});
