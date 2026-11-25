// The guardrails. screenInput is the input guardrail (milestone 3). scanOutput is still the starter (milestone 4).
export const SAFE_REFUSAL = 'I can help with Marlow Mobile plans, bills, roaming and SIMs. I cannot help with that request.';

const INJECTION = [
  /\b(?:ignore|disregard|forget|override)\b[^.?!]{0,50}\b(?:instructions?|prompts?|rules|guidelines)\b/i,
  /\b(?:ignore|disregard|forget)\b[^.?!]{0,30}\b(?:what you (?:were|was) (?:told|said)|everything (?:above|before|you (?:were|know)))\b/i,
  /\b(?:reveal|show|print|display|repeat|output|leak|tell me)\b[^.?!]{0,30}\b(?:system\s*prompt|your\s+(?:(?:hidden|secret|internal)\s+)?(?:instructions?|prompt|rules)|hidden\s+(?:setup|prompt|instructions?))\b/i,
  /\byou are now\b[^.?!]{0,40}\b(?:dan|unrestricted|jailbroken|without rules|no rules)\b/i,
];

export function screenInput(query, { maxChars = 500 } = {}) {
  if (typeof query !== 'string') return { ok: false, reason: 'not_text', response: SAFE_REFUSAL };
  if (query.length > maxChars) return { ok: false, reason: 'too_long', response: SAFE_REFUSAL };
  if (INJECTION.some(re => re.test(query))) return { ok: false, reason: 'injection', response: SAFE_REFUSAL };
  return { ok: true };
}

export function scanOutput(text, options = {}) {
  return { ok: true, text };
}
