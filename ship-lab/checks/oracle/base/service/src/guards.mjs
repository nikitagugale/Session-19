// The guardrails. STARTER CODE: both let everything through (milestones 3 and 4 write them).
//   screenInput(query)  -> { ok: true } or { ok: false, reason, response }   (the input guardrail: before the model sees the question)
//   scanOutput(text)    -> { ok: true, text } or { ok: false, reason, text }  (the output guardrail: before a customer or a log sees the answer)
// SAFE_REFUSAL is the fixed reply a customer gets when a question is refused. It must not repeat what they typed.
export const SAFE_REFUSAL = 'I can help with Marlow Mobile plans, bills, roaming and SIMs. I cannot help with that request.';

export function screenInput(query, options = {}) {
  return { ok: true };
}

export function scanOutput(text, options = {}) {
  return { ok: true, text };
}
