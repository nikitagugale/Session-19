// One question in, one answer out. STARTER CODE: the happy path only, as it was in the demo.
//   retrieve the best sections, ask the model to answer from them, log the request and the response, return the answer.
// You will change this file in several milestones: the guardrails (3 and 4), the model and cost settings (5).
import { screenInput, scanOutput } from './guards.mjs';
import { estimateCost } from './cost.mjs';
import { SYSTEM_PROMPT, buildPrompt } from './prompt.mjs';

export async function answer(query, { config, logger, model, retrieve }) {
  const screened = screenInput(query, { maxChars: config.maxQueryChars ?? undefined });
  if (!screened.ok) {
    logger.warn('guardrail.input_blocked', { reason: screened.reason, query });   // the logger hides personal details
    return { answer: screened.response, refused: true, reason: screened.reason, citations: [], meta: {} };
  }
  logger.info('chat.request', { query });
  const hits = retrieve(query, 3);
  const r = await model.complete({ system: SYSTEM_PROMPT, prompt: buildPrompt(hits, query), maxTokens: config.maxTokens });
  const citations = hits.map(h => h.id);
  const scanned = scanOutput(r.text);
  if (!scanned.ok) logger.warn('guardrail.output_blocked', { reason: scanned.reason });
  logger.info('chat.response', { answer: scanned.text, citations });
  const usage = { inputTokens: r.usage?.inputTokens ?? 0, outputTokens: r.usage?.outputTokens ?? 0 };
  let costUSD = null;
  try { costUSD = estimateCost(usage, model.id, config.prices); } catch { /* a live model with no price: cost unknown */ }
  return { answer: scanned.text, citations, meta: { model: model.id, maxTokens: config.maxTokens, usage, costUSD } };
}
