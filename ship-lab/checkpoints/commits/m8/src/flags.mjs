// The feature flag (milestone 8). The file is read EVERY time it is asked, so that switching the feature off takes effect on the next request, with no restart.
// If the file is missing or cannot be read, the feature is OFF: when we cannot tell, the safe answer is no.
import { readFileSync } from 'node:fs';

export function isEnabled(name, { flagsFile } = {}) {
  try {
    return JSON.parse(readFileSync(flagsFile, 'utf8'))[`${name}_enabled`] === true;
  } catch {
    return false;
  }
}
