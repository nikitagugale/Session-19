// Shared by image-tag.mjs and build-image.mjs: the short git SHA of HEAD, and whether the tree is dirty. Lives in scripts/ so each script stands alone.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// -> { sha, dirty, tag } or throws when there is no commit (no repository, or a repository with no commits yet).
export function imageInfo() {
  const sha = git(['rev-parse', '--short=7', 'HEAD']);
  if (!/^[0-9a-f]{7}$/.test(sha)) throw new Error('could not read a 7-character commit sha');
  const dirty = git(['status', '--porcelain']) !== '';
  return { sha, dirty, tag: `marlow-faq:${sha}${dirty ? '-dirty' : ''}`, suffix: `${sha}${dirty ? '-dirty' : ''}` };
}
