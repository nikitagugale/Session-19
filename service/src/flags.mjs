// The feature flag, read from the flag file EVERY time it is asked, so that flipping it takes effect at once, with no restart.
//   isEnabled('faq', { flagsFile }) -> true only when the file says { "faq_enabled": true }.
// Fail closed: a missing, unreadable or malformed file, a missing key, or any value other than true all mean OFF.
import { readFileSync } from 'node:fs';
import { config } from './config.mjs';

export function isEnabled(name, { flagsFile = config.flagsFile } = {}) {
  try {
    const flags = JSON.parse(readFileSync(flagsFile, 'utf8'));
    return flags?.[`${name}_enabled`] === true;
  } catch {
    return false;
  }
}
