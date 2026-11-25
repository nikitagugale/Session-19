// Build the image, tagged with the git SHA. `--dry` only prints the docker command. The SHA is in the tag AND in the image (--build-arg GIT_SHA).
// The build context is the folder above this one, because the image needs ../engine.
import { spawnSync } from 'node:child_process';
import { imageInfo } from './git-sha.mjs';

let info;
try { info = imageInfo(); } catch (e) { console.error(`build-image: no commit to tag (${e.message}). Commit first.`); process.exit(1); }
if (info.dirty) console.error('warning: there are uncommitted changes, so the tag says -dirty.');
const args = ['build', '-f', 'Dockerfile', '--build-arg', `GIT_SHA=${info.suffix}`, '-t', info.tag, '..'];
if (process.argv.includes('--dry')) { console.log(`docker ${args.join(' ')}`); process.exit(0); }
const r = spawnSync('docker', args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
