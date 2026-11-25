// The model adapter: complete({ system, prompt, maxTokens }) -> { text, usage, finish, model }.
// By default it uses the stand-in model in ../../engine. With LLM_MODE=live and a key in the environment it calls a real provider instead
// (see engine/live.mjs). Either way the rest of the service sees the same function.
import { complete } from '../../engine/index.mjs';
import { createLive } from '../../engine/live.mjs';

export function createModel(config) {
  if (process.env.LLM_MODE === 'live') {
    const live = createLive({ baseUrl: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY, model: process.env.LLM_MODEL });
    return { id: process.env.LLM_MODEL, complete: args => live.complete(args) };
  }
  return { id: config.model, complete: args => complete({ model: config.model, ...args }) };
}
