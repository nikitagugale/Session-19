// Print the image tag for this commit: marlow-faq:<7-character git sha>, and nothing else, on stdout.
// Uncommitted changes add -dirty to the tag and a warning on stderr. No commit is an error (exit 1). It is never "latest".
import { imageInfo } from './git-sha.mjs';

let info;
try { info = imageInfo(); } catch (e) { console.error(`image-tag: no commit to tag (${e.message}). Commit first.`); process.exit(1); }
if (info.dirty) console.error('warning: there are uncommitted changes, so the tag says -dirty: this image is not exactly any commit.');
console.log(info.tag);
