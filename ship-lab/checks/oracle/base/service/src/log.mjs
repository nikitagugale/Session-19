// The application log: one JSON line for each event, in logs/app.log (or LOG_FILE).
// STARTER CODE: it writes exactly what it is given.
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export function createLogger(config) {
  mkdirSync(path.dirname(config.logFile), { recursive: true });
  const write = (level, event, fields = {}) =>
    appendFileSync(config.logFile, JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields }) + '\n');
  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}
