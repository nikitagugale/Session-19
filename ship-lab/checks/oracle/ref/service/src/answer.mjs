// One question in, one answer out. Guardrails at both ends, and now the model, the token limit and the cost are in the response (milestone 5).
import { SYSTEM_PROMPT, buildPrompt } from './prompt.mjs';
import { screenInput, scanOutput } from './guards.mjs';
import { estimateCost } from './cost.mjs';

export async function answer(query, { config, logger, model, retrieve }) {
  logger.info('chat.request', { query });
  const screen = screenInput(query, { maxChars: config.maxQueryChars ?? 500 });
  if (!screen.ok) {
    logger.warn('guardrail.input_blocked', { reason: screen.reason, queryLength: query.length, preview: query.slice(0, 80) });
    return { answer: screen.response, refused: true, reason: screen.reason, citations: [], meta: {} };
  }
  const hits = retrieve(query, 3);
  const r = await model.complete({ system: SYSTEM_PROMPT, prompt: buildPrompt(hits, query), maxTokens: config.maxTokens });
  const scan = scanOutput(r.text);
  if (!scan.ok) logger.warn('guardrail.output_blocked', { reason: scan.reason });
  const citations = hits.map(h => h.id);
  const cost = config.prices?.[model.id] ? Number(estimateCost(r.usage, model.id, config.prices).toFixed(6)) : null;
  const meta = { model: model.id, maxTokens: config.maxTokens, usage: r.usage, costUSD: cost, finish: r.finish };
  logger.info('chat.response', { answer: scan.text, citations, costUSD: cost, outputTokens: r.usage.outputTokens });
  return { answer: scan.text, citations, meta };
}
