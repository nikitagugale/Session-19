// MILESTONE 8: print the image tag for this commit.   npm run image:tag
// The tag is the git commit (the short SHA), so that a running image can always be traced to the exact code in it. Never "latest".
// If there are uncommitted changes the tag says so (-dirty), and a warning goes to stderr. With no commit at all there is nothing to tag: exit 1.
// Only the tag goes to stdout, so it can be used in a script:   TAG=$(npm run -s image:tag)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });

const sha = git('rev-parse', '--short=7', 'HEAD');
if (sha.status !== 0) {
  console.error('There is no git commit here, so there is nothing to tag the image with. Commit your work first (npm run setup makes the starting commit).');
  process.exit(1);
}
const dirty = git('status', '--porcelain').stdout.trim().length > 0;
if (dirty) console.error('warning: there are uncommitted changes, so this tag ends in -dirty. Do not ship a -dirty image.');
console.log(`marlow-faq:${sha.stdout.trim()}${dirty ? '-dirty' : ''}`);
