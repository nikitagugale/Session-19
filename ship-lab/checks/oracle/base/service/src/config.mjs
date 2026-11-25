// The service's settings, in one place. STARTER CODE: this is how the demo was left.
//   model          a floating alias. The vendor can move it to a new version on any day, with nobody's approval (milestone 5 pins it)
//   maxTokens      no limit on how long an answer can be
//   timeoutMs      no limit on how long we wait for the model
//   maxQueryChars  no limit on how long a question can be (milestone 3)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const prices = JSON.parse(readFileSync(path.join(root, 'data', 'prices.json'), 'utf8'));

export const config = {
  root,
  model: 'marlow-llm-latest',
  maxTokens: null,
  timeoutMs: null,
  maxQueryChars: null,
  prices,
  kbDir: path.join(root, 'data', 'kb'),
  logFile: process.env.LOG_FILE ?? path.join(root, 'logs', 'app.log'),
  flagsFile: process.env.FLAGS_FILE ?? path.join(root, 'config', 'flags.json'),
};
