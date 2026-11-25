// `npm run logs [-- N]`: the last N lines (default 20) of the service log, logs/app.log (or LOG_FILE).
import { existsSync, readFileSync } from 'node:fs';
import { config } from '../src/config.mjs';

const n = Number(process.argv[2] ?? 20);
if (!existsSync(config.logFile)) { console.log(`There is no log yet at ${config.logFile}. Start the service (npm run serve), send a request, then run this again.`); process.exit(0); }
const lines = readFileSync(config.logFile, 'utf8').trim().split('\n');
console.log(lines.slice(-n).join('\n'));
