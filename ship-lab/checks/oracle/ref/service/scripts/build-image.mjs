// MILESTONE 8: build the image, tagged with the git SHA.   npm run image:build -- --dry     (prints the command)   npm run image:build   (runs it)
// The SHA goes in twice: as the image tag, and as --build-arg GIT_SHA, which the Dockerfile turns into a label and into the GIT_SHA that /version reports.
// The build context is the folder ABOVE this one, because the image also needs the engine/ folder.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tag = spawnSync(process.execPath, ['scripts/image-tag.mjs'], { cwd: root, encoding: 'utf8' });
if (tag.status !== 0) { process.stderr.write(tag.stderr); process.exit(1); }
const imageTag = tag.stdout.trim();
const sha = imageTag.split(':')[1];
const args = ['build', '-f', 'Dockerfile', '--build-arg', `GIT_SHA=${sha}`, '-t', imageTag, '..'];

const hasDocker = spawnSync('docker', ['--version'], { encoding: 'utf8' }).status === 0;
if (process.argv.includes('--dry') || !hasDocker) {
  if (!hasDocker && !process.argv.includes('--dry')) console.error('docker was not found, so this is a dry run. This is the command it would run:');
  console.log(['docker', ...args].join(' '));
  process.exit(0);
}
process.exit(spawnSync('docker', args, { cwd: root, stdio: 'inherit' }).status ?? 1);
