// The milestones, in one place: the lab runner, `npm run hint`, `npm run progress` and `npm run help` all read this.
// `hintMinutes` are the times (minutes after you start the milestone) when each hint opens. They are a nudge, not a lock.
// `targetMinutes` is the pace to aim for. Milestones 1 to 4 are one block of work, and 5 to 8 are another.
export const MILESTONES = [
  { n: 1, title: 'Reproduce the leak, as a test', check: 'a test that sends personal data in several formats, reads the log, and FAILS on the shipped code because the log holds it (and passes on a fixed service)', hintMinutes: [4, 6, 8], targetMinutes: 9, block: 'A' },
  { n: 2, title: 'Redact at the log boundary', check: 'a redaction function for phone numbers, account numbers and addresses in their real formats that leaves ordinary numbers alone, applied once, centrally, by the logger', hintMinutes: [6, 9, 12], targetMinutes: 14, block: 'A' },
  { n: 3, title: 'Guard the input', check: 'an input guardrail that refuses prompt injection and over-long questions with a fixed reply, before the model is called, and lets a similar but honest question through', hintMinutes: [5, 8, 10], targetMinutes: 12, block: 'A' },
  { n: 4, title: 'Guard the output', check: 'an output guardrail that removes personal data and a leaked system prompt from the answer before a customer or a log sees it, without damaging a normal answer', hintMinutes: [5, 7, 9], targetMinutes: 11, block: 'A' },
  { n: 5, title: 'Lock the model and the cost', check: 'a pinned model, a token limit and a timeout; a cost for every response, a monthly projection, and an alert before the cap', hintMinutes: [5, 8, 10], targetMinutes: 12, block: 'B' },
  { n: 6, title: 'Write guardrail tests that bite', check: 'a guardrail test suite that passes on the fixed service and FAILS on eight deliberately broken versions of it', hintMinutes: [6, 9, 12], targetMinutes: 14, block: 'B' },
  { n: 7, title: 'The mandatory PII gate', check: 'a gate that sends the PII corpus through the service, scans the log and the answers, and exits non-zero on any leak, with no way to override it and no pass for checking nothing', hintMinutes: [5, 8, 10], targetMinutes: 12, block: 'B' },
  { n: 8, title: 'Flag, deep health, drill and image tag', check: 'a feature flag that switches the feature off at once, a health check that exercises the feature, a deploy and rollback drill, and an image tagged with the git SHA', hintMinutes: [8, 12, 16], targetMinutes: 18, block: 'B' },
  { n: 9, title: 'Homework: the runbook, the purge and a second type', check: 'a runbook for PII found in logs, a script that purges already-written lines, and email addresses added to the redaction and to the gate', hintMinutes: [10, 20, 30], targetMinutes: 60, block: 'homework' },
];

export const titleOf = n => MILESTONES.find(m => m.n === Number(n))?.title ?? `Milestone ${n}`;
