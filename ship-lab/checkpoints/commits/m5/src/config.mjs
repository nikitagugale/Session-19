// The service's settings, in one place. Locked in milestone 5:
//   model          pinned to an exact version, so behaviour and the bill cannot change on a Tuesday with nobody's approval
//   maxTokens      the longest answer we will pay for
//   timeoutMs      the longest we will wait for the model
//   monthlyCapUSD  the monthly cap the client set, and expected volume to check the design against it (the budget before the design)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const prices = JSON.parse(readFileSync(path.join(root, 'data', 'prices.json'), 'utf8'));

export const config = {
  root,
  model: 'marlow-llm-2026-10-14',
  maxTokens: 300,
  timeoutMs: 5000,
  maxQueryChars: 500,
  monthlyCapUSD: 300,
  alertAt: 0.8,
  expected: { requestsPerMonth: 20000, avgInputTokens: 700, avgOutputTokens: 120 },
  prices,
  kbDir: path.join(root, 'data', 'kb'),
  logFile: process.env.LOG_FILE ?? path.join(root, 'logs', 'app.log'),
  flagsFile: process.env.FLAGS_FILE ?? path.join(root, 'config', 'flags.json'),
};
