// The health check behind GET /healthz (milestone 8). It EXERCISES what the feature depends on, so it can tell "running" from "working":
// the knowledge base is loaded, the log can be written, and the model answers a one-line ping within its timeout.
// The flag is reported, but a feature that is switched off on purpose is not unhealthy.
import { appendFileSync } from 'node:fs';
import { isEnabled } from './flags.mjs';

const writable = file => { try { appendFileSync(file, ''); return true; } catch { return false; } };

export async function checkHealth({ config, model, kb }) {
  const checks = {};
  checks.knowledge_base = kb.sections.length > 0 ? 'ok' : 'empty';
  checks.log = writable(config.logFile) ? 'ok' : 'not writable';
  try {
    const r = await model.complete({ system: 'health check', prompt: 'CONTEXT:\n[ping] pong\n\nQUESTION: ping', maxTokens: 8 });
    checks.model = r?.text ? 'ok' : 'no answer';
  } catch (e) {
    checks.model = `error: ${e.message}`;
  }
  checks.flag = isEnabled('faq', { flagsFile: config.flagsFile }) ? 'on' : 'off';
  return { ok: checks.knowledge_base === 'ok' && checks.log === 'ok' && checks.model === 'ok', checks };
}
