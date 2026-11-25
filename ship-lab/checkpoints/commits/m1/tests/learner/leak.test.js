// MILESTONE 1: reproduce the leak, as a test. On the shipped code this test FAILS, because the log holds what the customer typed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../../src/config.mjs';
import { startService } from '../../src/server.mjs';

// Each case is what a customer types, and the personal details inside it, in a different real format.
const CASES = [
  ['my number is 98765-43210 and address is 12 MG Road, can you check my plan?', ['98765-43210', '12 MG Road']],
  ['call me on +91 98765 43210 about the UP-24 plan', ['98765 43210']],
  ['my phone is 9876543210, what is the late fee?', ['9876543210']],
  ['my account is 1234 5678 9012 3456, why was I charged twice?', ['1234 5678 9012 3456']],
  ['account 50100234567890 needs a dispute', ['50100234567890']],
  ['I live at Flat 4B, Sunrise Apartments, Koramangala, can I get a new SIM delivered?', ['Flat 4B, Sunrise Apartments, Koramangala']],
];

for (const [query, secrets] of CASES) {
  test(`the log does not hold ${secrets.join(' and ')}`, async () => {
    const logFile = path.join(mkdtempSync(path.join(os.tmpdir(), 'leak-')), 'app.log');
    const svc = await startService({ config: { ...config, logFile } });
    try {
      await fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
    } finally { await svc.close(); }
    const log = readFileSync(logFile, 'utf8');
    for (const secret of secrets) assert.ok(!log.toLowerCase().includes(secret.toLowerCase()), `the log holds "${secret}" exactly as the customer typed it`);
  });
}
