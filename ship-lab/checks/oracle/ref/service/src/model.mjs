// The model adapter: complete({ system, prompt, maxTokens }) -> { text, usage, finish, model }.
// Milestone 5: the model must be PINNED (an exact version), and every call has a timeout.
import { complete } from '../../engine/index.mjs';
import { createLive } from '../../engine/live.mjs';

export class UnpinnedModelError extends Error {
  constructor(id) { super(`the model "${id}" is not pinned to a version: a floating alias can change behaviour and cost with no approval`); this.name = 'UnpinnedModelError'; }
}
export class ModelTimeoutError extends Error {
  constructor(ms) { super(`the model did not answer within ${ms} ms`); this.name = 'ModelTimeoutError'; this.status = 504; this.code = 'model_timeout'; }
}

/** A pinned id has a version in it (a digit) and is not a moving alias. */
export const isPinned = id => typeof id === 'string' && /\d/.test(id) && !/(latest|auto|default|stable|current)/i.test(id);

function withTimeout(work, ms) {
  if (!ms) return work;
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new ModelTimeoutError(ms)), ms); });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

export function createModel(config) {
  const live = process.env.LLM_MODE === 'live';
  const id = live ? process.env.LLM_MODEL : config.model;
  if (!isPinned(id)) throw new UnpinnedModelError(id);
  const inner = live
    ? createLive({ baseUrl: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY, model: id })
    : { complete: args => complete({ model: config.model, ...args }) };
  return { id, complete: args => withTimeout(Promise.resolve().then(() => inner.complete(args)), config.timeoutMs) };
}
