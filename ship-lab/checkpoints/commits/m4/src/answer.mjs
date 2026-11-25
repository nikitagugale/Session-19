// One question in, one answer out. Guardrails at BOTH ends: the input before the model (milestone 3), the output before a customer or a log (milestone 4).
import { SYSTEM_PROMPT, buildPrompt } from './prompt.mjs';
import { screenInput, scanOutput } from './guards.mjs';

export async function answer(query, { config, logger, model, retrieve }) {
  logger.info('chat.request', { query });
  const screen = screenInput(query, { maxChars: config.maxQueryChars ?? 500 });
  if (!screen.ok) {
    logger.warn('guardrail.input_blocked', { reason: screen.reason, queryLength: query.length, preview: query.slice(0, 80) });
    return { answer: screen.response, refused: true, reason: screen.reason, citations: [], meta: {} };
  }
  const hits = retrieve(query, 3);
  const r = await model.complete({ system: SYSTEM_PROMPT, prompt: buildPrompt(hits, query), maxTokens: config.maxTokens ?? undefined });
  const scan = scanOutput(r.text);
  if (!scan.ok) logger.warn('guardrail.output_blocked', { reason: scan.reason });
  const citations = hits.map(h => h.id);
  logger.info('chat.response', { answer: scan.text, citations });
  return { answer: scan.text, citations, meta: {} };
}
