# Runbook: personal data found in the production logs

**Owner:** the on-call engineer for the FAQ service. **Rehearsed:** 2026-11-25, against the sample leaked log. Result: every step could be followed cold, and it took 9 minutes.

## Severity

- **High: the guardrail is not firing at all.** Personal data appears in logs written AFTER the last release, or the PII boundary gate is failing in production. Page the on-call and the security lead now. Treat it as a live incident until the flag is off.
- **Low: one redacted-but-logged instance.** One line holds one value that an unusual format let through, and the boundary is otherwise working. Fix in working hours, but still purge.

## Who is paged

1. The on-call engineer (first, always).
2. The security lead, for High, or for any exposure of more than one customer.
3. The data protection contact, within one working day, so that the client can be told on time.

## Contain (the first ten minutes)

1. **Switch the feature off:** set `faq_enabled` to `false` in `config/flags.json`. It takes effect on the next request, with no restart. Confirm with `npm run drill` or a request that returns `feature_disabled`.
2. Stop shipping the logs onward (to the log store or an alert channel) until they are cleaned.
3. Write down the time you switched it off. The exposure window ends there.

## How far back does it go

1. Find the first line that holds personal data: search for a ten-digit number, a long digit run, or a street word in `logs/app.log`.
2. The window runs from that line to the time you switched the feature off. List every file in that window, including rotated and shipped copies.
3. Count the lines and the distinct customers. The release history tells you the start: `git log --oneline` and `GET /version` show which commit was running.

## Purge what is already written

1. Run: `npm run purge-logs -- <input.log> <output.log>` on a COPY of each file in the window. It writes a cleaned copy and says how many lines changed.
2. Check the copy: no personal data remains, and every line is still valid JSON.
3. Replace the stored files with the cleaned copies, keep the originals only in the secure location the security lead names, then delete them on their word.

## Verify the fix

1. Reproduce the leak with the original request: `npm run chat -- "my number is 98765-43210 and address is 12 MG Road, can you check my plan?"`. The log line must show tokens, not the number.
2. Run the mandatory gate: `npm run test:pii-boundary -- --require-pass`. It must pass before the feature is switched back on.
3. Switch the flag on, run `npm run drill`, and watch the deployed log for an hour.

## After

Add the format that got through to `data/pii-corpus.json` so the gate catches it next time. Record the window, the count and the fix in the incident note.
