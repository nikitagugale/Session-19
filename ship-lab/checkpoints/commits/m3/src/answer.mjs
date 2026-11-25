// One question in, one answer out. The input guardrail now runs BEFORE the model (milestone 3).
import { SYSTEM_PROMPT, buildPrompt } from './prompt.mjs';
import { screenInput } from './guards.mjs';

export async function answer(query, { config, logger, model, retrieve }) {
  logger.info('chat.request', { query });
  const screen = screenInput(query, { maxChars: config.maxQueryChars ?? 500 });
  if (!screen.ok) {
    logger.warn('guardrail.input_blocked', { reason: screen.reason, queryLength: query.length, preview: query.slice(0, 80) });
    return { answer: screen.response, refused: true, reason: screen.reason, citations: [], meta: {} };
  }
  const hits = retrieve(query, 3);
  const r = await model.complete({ system: SYSTEM_PROMPT, prompt: buildPrompt(hits, query), maxTokens: config.maxTokens ?? undefined });
  const citations = hits.map(h => h.id);
  logger.info('chat.response', { answer: r.text, citations });
  return { answer: r.text, citations, meta: {} };
}
