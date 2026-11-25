// `npm run chat -- "your question"`: starts the service in this process, asks it one question, and shows BOTH what the customer gets and what the log recorded.
// The log is where the demo bug lives, so it is printed next to the answer. The log file is logs/chat.log (not the service's own).
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { config, root } from '../src/config.mjs';
import { startService } from '../src/server.mjs';

const query = process.argv.slice(2).join(' ').trim();
if (!query) { console.error('usage: npm run chat -- "my number is 98765-43210 and address is 12 MG Road, can you check my plan?"'); process.exit(2); }
const logFile = path.join(root, 'logs', 'chat.log');
mkdirSync(path.dirname(logFile), { recursive: true });
rmSync(logFile, { force: true });
const svc = await startService({ config: { ...config, logFile } });
const res = await fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
const body = await res.json();
await svc.close();
console.log(`WHAT THE CUSTOMER GETS  (HTTP ${res.status})\n${JSON.stringify(body, null, 2)}\n`);
console.log(`WHAT THE LOG RECORDED  (${path.relative(root, logFile)})`);
console.log(existsSync(logFile) ? readFileSync(logFile, 'utf8').trim() : '(nothing)');
