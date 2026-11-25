// `npm run help`: every command in this kit, in one screen.
const sections = [
  ['Look at the service', [
    ['npm run chat -- "your question"', 'Starts the service, asks it one question, and shows the answer AND what the log recorded. Start here: it is how you see the leak.'],
    ['npm run serve', 'Starts the service on port 4000 (PORT=5000 to change it). Ctrl+C stops it. Try: curl -s localhost:4000/healthz'],
    ['npm run logs [-- 30]', 'The last lines of logs/app.log.'],
  ]],
  ['What you build', [
    ['npm run test:pii-boundary -- --require-pass', 'Milestone 7: the mandatory PII gate.'],
    ['npm run drill', 'Milestone 8: the deploy and rollback drill.'],
    ['npm run image:tag', 'Milestone 8: prints the image tag, which is the git commit.'],
    ['npm run image:build -- --dry', 'Milestone 8: prints the docker build command (builds it if docker is installed and you leave --dry off).'],
    ['npm run purge-logs -- in.log out.log', 'Milestone 9: redacts lines that were already written.'],
    ['npm test', 'The lab\'s own tests, and any tests you add under tests/learner.'],
  ]],
  ['The lab', [
    ['npm run setup', 'Makes the starting commit, "Shipped code as delivered". Do it once, before you change anything.'],
    ['npm run start -- N', 'Starts the clock for milestone N and shows when its hints open. (The first step or hint command starts it for you.)'],
    ['npm run step -- N', 'Checks milestone N (1 to 9). It tells you which success criteria are not met yet.'],
    ['npm run progress', 'Checks every milestone and prints one line to paste in the chat. Takes a few seconds to a minute.'],
    ['npm run hint -- N', 'The next hint for milestone N. Three hints, then --reveal for the reference solution. --now takes one early.'],
    ['npm run checkpoint -- N', 'Replaces your work with the reference solution for milestone N, as real commits. Your own work is kept on a branch called my-work-<time>.'],
    ['npm run doctor', 'Checks Node, git, the kit layout, and that the stand-in model loads.'],
    ['npm run help', 'This screen.'],
  ]],
  ['Git, which the lab uses all the time', [
    ['git status --short', 'What you have changed and not committed yet.'],
    ['git add -A && git commit -m "..."', 'Save one small step. Commit after each milestone that is ready.'],
    ['git log --oneline', 'The steps so far, newest first. The bottom one is the starting commit.'],
    ['git diff', 'What changed since the last commit. Read it before you commit.'],
  ]],
];

console.log('DD11 lab commands\n');
for (const [title, rows] of sections) {
  console.log(title.toUpperCase());
  for (const [cmd, what] of rows) console.log(`  ${cmd}\n      ${what}`);
  console.log('');
}
console.log('Your guide is LAB-GUIDE.md. Your evidence log is LAB-LOG.md.');
