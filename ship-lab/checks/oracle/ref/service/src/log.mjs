// The application log: one JSON line for each event, in logs/app.log (or LOG_FILE).
// Every line passes through redactDeep() HERE, once, so that no call site has to remember to hide anything.
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { redactDeep } from './redact.mjs';

export function createLogger(config) {
  mkdirSync(path.dirname(config.logFile), { recursive: true });
  const write = (level, event, fields = {}) => {
    const record = redactDeep({ ts: new Date().toISOString(), level, event, ...fields });
    appendFileSync(config.logFile, JSON.stringify(record) + '\n');
  };
  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}
