// The application log: one JSON line for each event, in logs/app.log (or LOG_FILE).
// The one boundary: every record is redacted here, so no call site has to remember to.
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { redactDeep } from './redact.mjs';

export function createLogger(config) {
  mkdirSync(path.dirname(config.logFile), { recursive: true });
  const write = (level, event, fields = {}) =>
    appendFileSync(config.logFile, JSON.stringify(redactDeep({ ts: new Date().toISOString(), level, event, ...fields })) + '\n');
  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}
