// Hide personal data in text. Order matters: email, phone, account, address. Email addresses were added in milestone 9.
// The patterns are heuristics. Their limits are written down at the bottom of this file.
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?<!\d)(?:\(?\+?91\)?[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const ACCOUNT = /(?<!\d)(?:(?:\d{4}[\s-]){2,3}\d{2,4}|\d{11,16})(?!\d)/g;
const NEXT = String.raw`(?:\s*,\s*[A-Z0-9][\w.'-]*(?: [A-Z0-9][\w.'-]*){0,3}){1,4}`;
const ADDRESS_WORDS = '(?:Road|Rd|Street|St|Lane|Ln|Nagar|Colony|Layout|Marg|Avenue|Cross|Main|Park|Apartments|Enclave)';
const ADDRESS = [
  new RegExp(String.raw`\b(?:[Ff]lat|[Hh]ouse|[Dd]oor|[Pp]lot)\s*(?:No\.?\s*)?[\w/-]+${NEXT}`, 'g'),
  new RegExp(String.raw`(?<![\w#])#\d+\w*${NEXT}`, 'g'),
  new RegExp(String.raw`\b\d{1,4}[A-Za-z]?(?:/\d+)?\s+(?:[A-Z][\w.'-]*\s+){1,3}${ADDRESS_WORDS}\b`, 'g'),
];

export function redactPII(text) {
  if (typeof text !== 'string') return text;
  let out = text.replace(EMAIL, '[REDACTED_EMAIL]').replace(PHONE, '[REDACTED_PHONE]').replace(ACCOUNT, '[REDACTED_ACCOUNT]');
  for (const re of ADDRESS) out = out.replace(re, '[REDACTED_ADDRESS]');
  return out;
}

/** Redacts every string inside an object or array, and makes an Error loggable. Used by the logger, once, for every line. */
export function redactDeep(value) {
  if (typeof value === 'string') return redactPII(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value instanceof Error) return { name: value.name, message: redactPII(value.message) };
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  return value;
}

// LIMITS. Phone: Indian mobile numbers (start 6 to 9, ten digits, optional +91, 91 or 0). Account: 11 to 16 digits, or groups of four.
// A twelve-digit account number that starts with 91 reads as a phone with a country code. Addresses are a HEURISTIC: a house or flat word
// followed by comma-separated capitalised parts, a "#number" followed by the same, or "number Name Road". An address written another way is missed.
// Email: anything shaped like name@domain.tld. A name written with "at" instead of @ is missed.
