// The model adapter: complete({ system, prompt, maxTokens }) -> { text, usage, finish, model }.
// By default it uses the stand-in model in ../../engine. With LLM_MODE=live and a key in the environment it calls a real provider instead
// (see engine/live.mjs). Either way the rest of the service sees the same function.
// It also: refuses a model that is not pinned (at start), and cuts a call off at config.timeoutMs (504 model_timeout).
import { complete } from '../../engine/index.mjs';
import { createLive } from '../../engine/live.mjs';

// Pinned = an exact version (it has digits in it) and not a floating alias.
export const isPinned = id => typeof id === 'string' && /\d/.test(id) && !/(^|[-_.])(latest|stable|default|current|auto)([-_.]|$)/i.test(id);

function withTimeout(promise, ms) {
  if (!ms) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`model did not answer within ${ms} ms`), { status: 504, code: 'model_timeout' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createModel(config) {
  const live = process.env.LLM_MODE === 'live';
  const id = live ? process.env.LLM_MODEL : config.model;
  if (!isPinned(id)) throw new Error(`model "${id}" is not pinned: use an exact version (with digits in it), not a floating alias such as "latest"`);
  const call = live
    ? (a => { const l = createLive({ baseUrl: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY, model: id }); return l.complete(a); })
    : (a => complete({ model: id, ...a }));
  return { id, complete: args => withTimeout(Promise.resolve().then(() => call(args)), config.timeoutMs) };
}
