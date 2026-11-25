// One question in, one answer out. STARTER CODE: the happy path only, as it was in the demo.
//   retrieve the best sections, ask the model to answer from them, log the request and the response, return the answer.
// You will change this file in several milestones: the guardrails (3 and 4), the model and cost settings (5).
import { SYSTEM_PROMPT, buildPrompt } from './prompt.mjs';

export async function answer(query, { config, logger, model, retrieve }) {
  logger.info('chat.request', { query });
  const hits = retrieve(query, 3);
  const r = await model.complete({ system: SYSTEM_PROMPT, prompt: buildPrompt(hits, query), maxTokens: config.maxTokens ?? undefined });
  const citations = hits.map(h => h.id);
  logger.info('chat.response', { answer: r.text, citations });
  return { answer: r.text, citations, meta: {} };
}
