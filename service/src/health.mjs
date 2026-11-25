// The health check behind GET /healthz. It EXERCISES the feature instead of saying "the process is running":
//   knowledge_base  a real search finds a section        log  the log file can be written        model  the model answers a tiny test call
//   flag            reported, but a feature switched off on purpose is NOT unhealthy.
// Any check that throws, or cannot tell, is a failure (fail closed).
import { appendFileSync } from 'node:fs';
import { isEnabled } from './flags.mjs';

const run = async fn => { try { return (await fn()) ? 'ok' : 'FAILED'; } catch (e) { return `FAILED: ${e.message}`; } };

export async function checkHealth(deps) {
  const checks = {
    knowledge_base: await run(() => deps.retrieve('late fee', 1).length > 0),
    log: await run(() => { appendFileSync(deps.config.logFile, ''); return true; }),
    model: await run(async () => typeof (await deps.model.complete({ system: 'health check', prompt: 'ping', maxTokens: 5 }))?.text === 'string'),
  };
  const ok = Object.values(checks).every(v => v === 'ok');
  checks.flag = isEnabled('faq', { flagsFile: deps.config.flagsFile }) ? 'on' : 'off (switched off on purpose)';
  return { ok, checks };
}
