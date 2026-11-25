import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../../src/config.mjs';
import { startService } from '../../src/server.mjs';

// Each case: a customer question carrying personal details, in a different real format.
// The log must hold none of the details (compared without case).
const cases = [
  { name: 'phone with a dash',        query: 'my number is 98765-43210, can you check my plan?',          pii: ['98765-43210'] },
  { name: 'phone with spaces',        query: 'my phone is +91 98765 43210, what is the roaming pack?',    pii: ['+91 98765 43210'] },
  { name: 'plain ten-digit phone',    query: 'call me on 9876543210 about the UP-24 plan',                pii: ['9876543210'] },
  { name: 'account in groups of 4',   query: 'account 1234 5678 9012 3456 shows a late fee, help',        pii: ['1234 5678 9012 3456'] },
  { name: 'account with no spaces',   query: 'my account is 1234567890123, why was I charged twice?',     pii: ['1234567890123'] },
  { name: 'address',                  query: 'I live at 12 MG Road, can you check my plan?',              pii: ['12 MG Road'] },
];

for (const c of cases) {
  test(`the log holds no personal data: ${c.name}`, async () => {
    const logFile = path.join(mkdtempSync(path.join(os.tmpdir(), 'ship-leak-')), 'app.log');
    const svc = await startService({ config: { ...config, logFile } });
    try {
      const res = await fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: c.query }) });
      assert.equal(res.status, 200);
      await res.json();
    } finally { await svc.close(); }
    const log = readFileSync(logFile, 'utf8').toLowerCase();
    assert.ok(log.length > 0, 'the log should hold the event lines');
    for (const p of c.pii) assert.ok(!log.includes(p.toLowerCase()), `the log holds personal data: ${p}`);
  });
}
