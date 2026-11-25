// Shared by the hidden milestone checks. `npm run step -- N` copies one check into the learner's tests/steps/, runs it from the learner's folder, and removes it.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const app = process.cwd();                                  // lab.mjs runs every check with the learner's folder as the working directory
export const kit = path.resolve(app, '..');
export const oracleRoot = path.join(kit, 'checks', 'oracle', 'ref');     // the full reference solution: service/ and engine/
export const baseRoot = path.join(kit, 'checks', 'oracle', 'base');     // the shipped starter code: service/ and engine/
export const oracleApp = path.join(oracleRoot, 'service');
export const baseApp = path.join(baseRoot, 'service');
export const tmpDir = () => mkdtempSync(path.join(os.tmpdir(), 'dd11-check-'));
export const imp = rel => import(pathToFileURL(path.join(app, rel)).href);              // the learner's code
export const impAt = (dir, rel) => import(pathToFileURL(path.join(dir, rel)).href);     // code in any copy
export const readJson = f => JSON.parse(readFileSync(f, 'utf8'));
export const CORPUS = readJson(path.join(kit, 'checks', 'lib', 'corpus.json'));         // the canonical corpus: 20 requests, then 3 with email

const skip = p => /[\\/](\.git|node_modules|\.lab|logs|results)([\\/]|$)/.test(p);

/** Copies a root (service/ + engine/) to a temp folder and returns the service folder. `edits` = [[file, from, to], ...] applied to files under service/. */
export function copyRoot(root, edits = []) {
  const dest = tmpDir();
  cpSync(root, dest, { recursive: true, filter: s => !skip(s) });
  for (const [rel, from, to] of edits) {
    const p = path.join(dest, 'service', rel);
    const t = readFileSync(p, 'utf8');
    if (!t.includes(from)) throw new Error(`the check cannot build its test copy: "${from.slice(0, 50)}" was not found in ${rel}`);
    writeFileSync(p, t.split(from).join(to));
  }
  return path.join(dest, 'service');
}
export const mutant = edits => copyRoot(oracleRoot, edits);
export const oracleCopy = () => copyRoot(oracleRoot);
export const baseCopy = () => copyRoot(baseRoot);

/** A copy of the LEARNER's own service (and the engine next to it). */
export function learnerCopy() {
  const dest = tmpDir();
  cpSync(app, path.join(dest, 'service'), { recursive: true, filter: s => !skip(s) });
  cpSync(path.join(kit, 'engine'), path.join(dest, 'engine'), { recursive: true });
  return path.join(dest, 'service');
}

export function put(dir, rel, content) {
  const p = path.join(dir, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, content);
}

export function run(args, { cwd = app, env = {}, timeout = 180000 } = {}) {
  const e = { ...process.env, ...env }; delete e.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout, env: e });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}`, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** Runs one test file (copied into dir/tests/learner/) with node --test, from dir. */
export function runTestFile(dir, file) {
  const dest = path.join(dir, 'tests', 'learner', path.basename(file));
  mkdirSync(path.dirname(dest), { recursive: true });
  if (path.resolve(file) !== path.resolve(dest)) cpSync(file, dest);
  return run(['--test', '--test-reporter=spec', dest], { cwd: dir });
}

/** How many tests a learner's file really runs (a loop over cases counts each case), found by running it in `dir` and reading node's own summary. */
export function countTests(dir, file) {
  const r = runTestFile(dir, file);
  return Number(/ℹ tests (\d+)/.exec(r.out)?.[1] ?? 0);
}

/** Starts the service from `dir` with its own temp log. Returns { svc, logFile }. `model` and `config` overrides are optional. */
export async function launch(dir, { model, config: extra = {}, flags } = {}) {
  const { startService } = await impAt(dir, 'src/server.mjs');
  const { config } = await impAt(dir, 'src/config.mjs');
  const work = tmpDir();
  const logFile = path.join(work, 'app.log');
  const flagsFile = path.join(work, 'flags.json');
  writeFileSync(flagsFile, JSON.stringify(flags ?? { faq_enabled: true }));
  const options = { config: { ...config, logFile, flagsFile, ...extra } };
  if (model) options.model = model;
  const svc = await startService(options);
  return { svc, logFile, flagsFile, config: options.config };
}

export const ask = async (svc, query) => {
  const res = await fetch(`${svc.url}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  return { status: res.status, headers: res.headers, body: await res.json() };
};

export const fakeModel = (text = 'Here is what the Marlow Mobile documents say: A payment more than 3 days late carries a late fee of 100 rupees. [late-fee]', id = 'marlow-llm-2026-10-14') => ({
  id, calls: 0,
  async complete() { this.calls += 1; return { text: typeof text === 'function' ? text() : text, usage: { inputTokens: 20, outputTokens: 10 }, finish: 'stop', model: 'fake' }; },
});

/** The same scan the gate uses, written independently of redactPII: exact text, or the same digits with separators between them. */
const digits = s => s.replace(/\D/g, '');
const compact = t => t.replace(/(?<=\d)[\s\-.,/]+(?=\d)/g, '');
export const holds = (text, pii) => text.toLowerCase().includes(pii.toLowerCase()) || (digits(pii).length >= 10 && compact(text).includes(digits(pii)));

export const listFiles = (d, base = d) => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? listFiles(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).split(path.sep).join('/')]));
export { existsSync, readFileSync, writeFileSync, mkdirSync, path };
