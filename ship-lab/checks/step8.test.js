// MILESTONE 8: the flag, the deep health check, the drill, and the image tag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { app, imp, launch, ask, fakeModel, mutant, oracleCopy, put, run, tmpDir, path, existsSync, readFileSync, writeFileSync } from '../../../checks/lib/helpers.mjs';
import { cpSync } from 'node:fs';

const setFlag = (file, on) => writeFileSync(file, JSON.stringify({ faq_enabled: on }));
const withEnv = async (vars, fn) => { const keep = { ...process.env }; Object.assign(process.env, vars); for (const k of Object.keys(vars)) if (vars[k] === undefined) delete process.env[k]; try { return await fn(); } finally { for (const k of Object.keys(vars)) { if (k in keep) process.env[k] = keep[k]; else delete process.env[k]; } } };

test('8.1 isEnabled reads the flag file EVERY time, so a change takes effect at once, and a missing file means off', async () => {
  const { isEnabled } = await imp('src/flags.mjs');
  const f = path.join(tmpDir(), 'flags.json');
  setFlag(f, true); assert.equal(isEnabled('faq', { flagsFile: f }), true, 'isEnabled("faq", { flagsFile }) must be true when the file holds { "faq_enabled": true }: the key in the file is the name plus _enabled');
  setFlag(f, false); assert.equal(isEnabled('faq', { flagsFile: f }), false, 'the flag was read once and kept: switching it off must work without a restart');
  setFlag(f, true); assert.equal(isEnabled('faq', { flagsFile: f }), true);
  assert.equal(isEnabled('faq', { flagsFile: path.join(tmpDir(), 'missing.json') }), false, 'with no flag file the feature must be OFF: when we cannot tell, the safe answer is no');
  writeFileSync(f, 'not json'); assert.equal(isEnabled('faq', { flagsFile: f }), false, 'an unreadable flag file must mean off');
});

test('8.2 the service honours the flag on the next request, with no restart: 503 and a retry-after when off, and back to 200 when on', async () => {
  const { svc, flagsFile } = await launch(process.cwd());
  try {
    assert.equal((await ask(svc, 'What is the late fee?')).status, 200);
    setFlag(flagsFile, false);
    const off = await ask(svc, 'What is the late fee?');
    assert.equal(off.status, 503, 'with the flag off the feature must stop at once'); assert.equal(off.body.error, 'feature_disabled'); assert.ok(off.headers.get('retry-after'), 'send a Retry-After header');
    setFlag(flagsFile, true);
    assert.equal((await ask(svc, 'What is the late fee?')).status, 200, 'switching the flag back on must restore the feature');
  } finally { await svc.close(); }
});

test('8.3 GET /version says which commit is running (GIT_SHA), the pinned model, and whether the feature is on', async () => {
  await withEnv({ GIT_SHA: 'abc1234' }, async () => {
    const { svc, config } = await launch(process.cwd());
    try { const v = await (await fetch(`${svc.url}/version`)).json(); assert.equal(v.gitSha, 'abc1234'); assert.equal(v.model, config.model); assert.equal(v.faq, 'on'); } finally { await svc.close(); }
  });
  await withEnv({ GIT_SHA: undefined }, async () => {
    const { svc } = await launch(process.cwd());
    try { assert.equal((await (await fetch(`${svc.url}/version`)).json()).gitSha, 'unknown'); } finally { await svc.close(); }
  });
});

test('8.4 the health check EXERCISES the feature: it is healthy when it works, and 503 when the knowledge base, the log or the model is broken', async () => {
  const { svc, flagsFile } = await launch(process.cwd());
  try {
    const ok = await fetch(`${svc.url}/healthz`); const h = await ok.json();
    assert.equal(ok.status, 200); assert.ok(h.checks.knowledge_base && h.checks.log && h.checks.model, `the health check should report the knowledge base, the log and the model, and it reports: ${Object.keys(h.checks).join(', ')}`);
    const sections = svc.deps.kb.sections; const saved = sections.splice(0, sections.length);
    assert.equal((await fetch(`${svc.url}/healthz`)).status, 503, 'an empty knowledge base must make the health check fail'); sections.push(...saved);
    const logSaved = svc.deps.config.logFile; svc.deps.config.logFile = path.join(path.dirname(flagsFile), 'flags.json', 'x', 'app.log');
    assert.equal((await fetch(`${svc.url}/healthz`)).status, 503, 'a log that cannot be written must make the health check fail'); svc.deps.config.logFile = logSaved;
    setFlag(flagsFile, false); assert.equal((await fetch(`${svc.url}/healthz`)).status, 200, 'a feature that is switched off on purpose is not unhealthy');
  } finally { await svc.close(); }
  const { svc: s2 } = await launch(process.cwd(), { model: { id: 'marlow-llm-2026-10-14', async complete() { throw new Error('the model is down'); } } });
  try { assert.equal((await fetch(`${s2.url}/healthz`)).status, 503, 'a model that is down must make the health check fail'); } finally { await s2.close(); }
});

test('8.5 the drill passes on your service, and writes a report with the rollback time', () => {
  const r = run(['scripts/drill.mjs'], { cwd: app });
  assert.equal(r.status, 0, `the drill failed:\n${r.out.split('\n').filter(l => /FAIL|not written/.test(l)).join('\n') || r.out.slice(-300)}`);
  const report = JSON.parse(readFileSync(path.join(app, 'results', 'drill-report.json'), 'utf8'));
  assert.equal(report.ok, true); assert.ok(Number.isFinite(report.rollbackMs) && report.rollbackMs < 2000, `rollbackMs is ${report.rollbackMs}`); assert.ok(report.steps.length >= 7, 'the drill should have at least seven steps: deploy, health, smoke, guardrail, redaction, rollback, recovery');
});

const drill = edits => { const d = mutant(edits); put(d, 'scripts/drill.mjs', readFileSync(path.join(app, 'scripts', 'drill.mjs'), 'utf8')); return run(['scripts/drill.mjs'], { cwd: d }); };
test('8.6 the drill FAILS when the flag is read once and kept, so a rollback would need a restart', () => {
  const r = drill([['src/flags.mjs', 'JSON.parse(readFileSync(flagsFile, \'utf8\'))[`${name}_enabled`] === true', '(globalThis.__flag ??= JSON.parse(readFileSync(flagsFile, \'utf8\'))[`${name}_enabled`] === true)']]);
  assert.notEqual(r.status, 0, 'the rollback did not work and the drill passed: it must flip the flag off and check that requests STOP');
});
test('8.7 the drill FAILS when the deployed release has no input guardrail, and when its log is not redacted', () => {
  assert.notEqual(drill([['src/answer.mjs', 'if (!screen.ok) {', 'if (false) {']]).status, 0, 'the guardrail was missing and the drill passed: the drill must test the guardrail in the deployed release');
  assert.notEqual(drill([['src/log.mjs', 'const record = redactDeep({', 'const record = ({']]).status, 0, 'the log held personal data and the drill passed: the drill must read the deployed log');
});

// The image tag: a throwaway git repository holds a copy of the reference service, with YOUR whole scripts/ folder laid over it.
// So the two scripts may share a helper inside scripts/, but not a file in src/.
const why = out => (out.split('\n').filter(l => /Error|Cannot find|ERR_|not found|usage/i.test(l)).slice(0, 2).join(' | ') || out.slice(-300)).slice(0, 400);
const withYourScripts = dir => { cpSync(path.join(app, 'scripts'), path.join(dir, 'scripts'), { recursive: true, force: true }); return dir; };
function repoWith() {
  const dir = withYourScripts(oracleCopy());
  const git = (...a) => spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
  git('-c', 'init.defaultBranch=main', 'init', '-q'); git('config', 'user.email', 'check@lab.local'); git('config', 'user.name', 'check');
  git('add', '-A'); git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'check'); return { dir, git, sha: git('rev-parse', '--short=7', 'HEAD').stdout.trim() };
}
test('8.8 the image tag is the git SHA, never "latest": clean means marlow-faq:<sha>, uncommitted changes mean -dirty, no commit means no tag', () => {
  const { dir, git, sha } = repoWith();
  const clean = run(['scripts/image-tag.mjs'], { cwd: dir });
  assert.equal(clean.status, 0, `image-tag failed in a copy of the repository where only your scripts/ folder is yours (does it import anything outside scripts/?): ${why(clean.out)}`); assert.equal(clean.stdout.trim(), `marlow-faq:${sha}`, `on a clean commit the tag should be marlow-faq:${sha}, and ONLY the tag goes to the output`);
  writeFileSync(path.join(dir, 'README.txt'), 'changed');
  const dirty = run(['scripts/image-tag.mjs'], { cwd: dir });
  assert.equal(dirty.stdout.trim(), `marlow-faq:${sha}-dirty`, 'uncommitted changes must show in the tag'); assert.ok(dirty.stderr.trim().length > 0, 'warn on stderr when the tree is dirty');
  const none = withYourScripts(tmpDir());
  const r = run(['scripts/image-tag.mjs'], { cwd: none }); assert.notEqual(r.status, 0, 'with no git commit there is nothing to tag the image with');
  assert.ok(!/latest/.test(clean.stdout + dirty.stdout + r.stdout), 'never tag an image "latest"');
});

test('8.9 the build command carries the SHA twice: as the tag and as the build argument', () => {
  const { dir, sha } = repoWith();
  const r = run(['scripts/build-image.mjs', '--dry'], { cwd: dir });
  assert.equal(r.status, 0, `build-image failed in a copy of the repository where only your scripts/ folder is yours (does it import anything outside scripts/?): ${why(r.out)}`);
  assert.ok(/docker build/.test(r.stdout), 'print the docker build command'); assert.ok(r.stdout.includes(`GIT_SHA=${sha}`), `the command must pass --build-arg GIT_SHA=${sha}`); assert.ok(r.stdout.includes(`marlow-faq:${sha}`), `the command must tag the image marlow-faq:${sha}`); assert.ok(!/latest/.test(r.stdout));
});

test('8.10 the Dockerfile pins its base image, takes the SHA as an argument, labels the image with it, runs as a non-root user, and has a health check', () => {
  const f = path.join(app, 'Dockerfile'); assert.ok(existsSync(f), 'write a Dockerfile in this folder');
  const d = readFileSync(f, 'utf8');
  const from = /^FROM\s+(\S+)/m.exec(d); assert.ok(from, 'no FROM line'); assert.ok(/:\d/.test(from[1]) && !/latest/.test(from[1]), `the base image "${from[1]}" must be pinned to a version, not latest`);
  assert.ok(/^ARG\s+GIT_SHA/m.test(d), 'ARG GIT_SHA'); assert.ok(/^ENV\s+.*GIT_SHA/m.test(d), 'ENV GIT_SHA, so that /version can report it');
  assert.ok(/org\.opencontainers\.image\.revision\s*=\s*\$\{?GIT_SHA\}?/.test(d), 'LABEL org.opencontainers.image.revision=$GIT_SHA');
  const user = /^USER\s+(\S+)/m.exec(d); assert.ok(user && !/^(root|0)$/.test(user[1]), 'run as a user that is not root (USER node)');
  assert.ok(/^HEALTHCHECK/m.test(d), 'HEALTHCHECK'); assert.ok(/^(CMD|ENTRYPOINT)\s+.*node/m.test(d), 'CMD ["node", ...]');
  assert.ok(/^ENV\s+.*HOST=0\.0\.0\.0/m.test(d), 'ENV HOST=0.0.0.0: the server listens on HOST (127.0.0.1 by default), and a container must listen on every address or a published port cannot reach it');
  assert.ok(!/^COPY\s+(\.|service\/?|\.\/?)\s/m.test(d), 'copy only what runs (engine, package.json, src, data, config), not the whole folder: it would carry .git and your logs into the image');
});
