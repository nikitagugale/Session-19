// Hide personal data in text. Heuristics, applied at the log boundary (src/log.mjs) and nowhere else.
//   redactPII(text) -> the same text with each phone number, account number and address replaced by a token:
//   [REDACTED_PHONE], [REDACTED_ACCOUNT], [REDACTED_ADDRESS]
// Order matters: addresses first (they contain digits), then phones (an 11-digit "09876543210" is a phone, not an account),
// then accounts. Every pattern is bounded by "not next to another digit", so a long number is never cut in the middle.
// The tokens hold no digits, so redacting twice changes nothing.

const CAP_PART = String.raw`[A-Z0-9][\w.'-]*(?:[ ][A-Z0-9][\w.'-]*)*`;          // "Sunrise Apartments", "3rd Cross"
const ADDRESS = [
  // Flat 4B, Sunrise Apartments, Koramangala  /  House No. 7, Gandhi Nagar  /  house 14, Rose Colony
  new RegExp(String.raw`\b(?:[Ff]lat|[Hh]ouse|[Dd]oor|[Pp]lot)(?:[ ]+No\.?)?[ ]*#?\w+(?:,[ ]*${CAP_PART})+`, 'g'),
  // #45, 3rd Cross, Indiranagar
  new RegExp(String.raw`#\d+\w*(?:,[ ]*${CAP_PART})+`, 'g'),
  // 12 MG Road, 22 Park Street
  /\b\d{1,5}[A-Za-z]?(?:[ ]+[A-Z][A-Za-z.]*){0,3}[ ]+(?:Road|Rd|Street|St|Lane|Ln|Avenue|Ave|Marg|Cross|Main|Nagar|Colony|Layout)\b\.?/g,
];
const PHONE = /(?<!\d)(?:(?:\(\+91\)|\+91|91|0)[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)/g;
const ACCOUNT = /(?<!\d)(?:\d{11,16}|\d{4}(?:[ -]\d{4}){2,3})(?!\d)/g;

export function redactPII(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const re of ADDRESS) out = out.replace(re, '[REDACTED_ADDRESS]');
  return out.replace(PHONE, '[REDACTED_PHONE]').replace(ACCOUNT, '[REDACTED_ACCOUNT]');
}

// redactPII on every string inside an object or array. An Error becomes a plain object that can be logged.
export function redactDeep(value, seen = new WeakSet()) {
  if (typeof value === 'string') return redactPII(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (value instanceof Error) {
    return redactDeep({ name: value.name, message: value.message, stack: value.stack, ...(value.code !== undefined && { code: value.code }) }, seen);
  }
  if (Array.isArray(value)) return value.map(v => redactDeep(v, seen));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v, seen);
  return out;
}

// Things these patterns do NOT catch (they are heuristics):
//  1. Emails, names, and addresses with no keyword or street word ("near the temple in Whitefield", "Sector 5 Noida").
//  2. Numbers split by other characters or words ("98765 four three two one zero", "9 8 7 6 5 4 3 2 1 0"), and landline or non-Indian numbers.
//  3. A lowercase address typed all in lowercase ("12 mg road"), and account numbers shorter than 11 digits or in groups not of four.
