# LAB GUIDE: make a working demo safe to ship

**Everything here is made up.** Marlow Mobile is not a real company, and its plans, prices and customers are invented, down to every phone number, account number and address in the test data. Please never paste anything real (a key, a password, a customer's details) into the chat or into Claude.

A phone company's FAQ service worked in the demo: a customer asks a question, the service finds the right sections of the knowledge base, and a model answers from them. Then someone opened the log. It holds **what customers typed, word for word**, and customers type their phone numbers, account numbers and home addresses. Over eight milestones you will reproduce that as a test, fix it at the one place that matters, guard the model at both ends, lock its version and its cost, write tests that catch a broken guardrail, build a gate that nobody can switch off, and rehearse a rollback. You finish with an image tagged with the git commit, and (as homework) the runbook for the day it happens again.

**This is a milestone lab, not a follow-along.** There are no prompts to paste. Each card gives a goal, an interface and success criteria. **Claude Code is your pair**: how you get there is up to you. You work at your own pace, and the facilitator checks in twice: after milestone 4 and after milestone 8.

---

## How the lab works

| | |
|---|---|
| **Start** | `npm test` should say `pass 10`. Then `npm run setup` (it makes the starting commit, so git shows only what you change). Open **only this folder** (`service`) in VS Code, and read this guide. |
| **See the leak** | `npm run chat -- "my number is 98765-43210 and address is 12 MG Road, can you check my plan?"` starts the service, asks the question, and prints the answer **and** what the log recorded. |
| **Check yourself** | `npm run step -- N` runs a hidden check for milestone N. It tells you which success criterion is not met yet, in words. `npm run progress` checks milestones 1 to 8 and prints one line to paste in the chat. |
| **Stuck?** | `npm run hint -- N` gives you the next of three hints, when it opens (a nudge, not a lock: `--now` always works, and it is noted). The fourth step, `--reveal`, is the reference. |
| **Fallen behind?** | `npm run checkpoint -- N` replaces your work with the reference solution for milestone N, **as real git commits**. Your own work is kept on a branch called `my-work-<time>`. It is free. Use it, so one slow milestone does not cost you the rest. |
| **Evidence** | `LAB-LOG.md`: a line or two for each milestone, with something you **saw**. |
| **Commands** | `npm run help` lists them all. |

**Nothing runs in the background.** Every command prints and ends. `npm run serve` is the only one that stays running, and you do not need it for any milestone.

## The project in two minutes

```
src/server.mjs      the HTTP service: POST /api/chat, GET /healthz (and /version in milestone 8). startService() returns { url, deps, close }. Keep that shape
src/answer.mjs      one question in, one answer out: retrieve, ask the model, log, return. STARTER CODE: the happy path only
src/log.mjs         the application log: one JSON line for each event, in logs/app.log
src/redact.mjs      hides personal data in text                       (you write it: milestone 2)
src/guards.mjs      screenInput and scanOutput, the two guardrails     (you write them: milestones 3 and 4)
src/config.mjs      the model, the limits, the cap                     (you lock it: milestone 5)
src/cost.mjs        what a request and a month cost                    (you write it: milestone 5)
src/flags.mjs       the feature flag; src/health.mjs the health check  (you write them: milestone 8)
data/kb/*.md        the knowledge base: 5 documents, 21 sections. A section is "## [id] Heading"
data/pii-corpus.json   20 requests that carry personal data, each with the details to look for. THE GATE'S MEMORY
data/sample-leaked.log a log that has already leaked: 12 lines. Milestone 9 cleans it
data/prices.json    what the stand-in models cost per million tokens
scripts/            the tools: pii-boundary, drill, image-tag, build-image, purge-logs (you write them)
tests/learner/      your tests go here (npm test runs them with the lab's own)
../engine/          the stand-in model. It behaves like the bad days of a real one. Use it like an API
```

**The model is a stand-in with bad habits**, on purpose, so a guardrail has something to catch: it **repeats what a customer tells it** ("You said: ..."), it **can be talked into printing its own instructions**, and it **writes a long answer** when asked for "everything". Real models do all three, on a bad day.

**The rules.** A test comes first and goes red on the shipped code. Hide personal data **at the boundary, once**, not all over the service. A guardrail needs a test that fails when the guardrail is broken. When a check cannot tell, it fails (**fail closed**). A gate has **no override**. Keep each change small and commit after each milestone.

---

## Milestone 1 · Reproduce the leak, as a test
*Target: 9 min · Block A*

**Goal.** Before you fix anything, prove the problem with a test that **fails on the shipped code because the log holds the personal data**. That red test is your evidence now, and your regression test for ever after.

**Interface.** A node:test file at `tests/learner/leak.test.js`. For each case it starts the service with its **own temporary log file** (`startService({ config: { ...config, logFile } })`), sends a customer question to `POST /api/chat`, closes the service, reads the log file, and asserts that **none of the personal details appears in it**. Compare without caring about upper or lower case.

**Success criteria.**
- [ ] The file exists and has at least three cases (six is better), in **different real formats**: a phone number with a dash, a phone number with spaces, a plain ten-digit phone, an account number in groups of four, an account number with no spaces, an address.
- [ ] It is **red on the shipped code**, and it fails on an assertion about the log (not because it is broken).
- [ ] It is **green on a service that is fixed**, so it is a real test and not one that always fails.
- [ ] It catches a service that leaks only one format: the check breaks a copy of the service in three ways (spaces in a phone number, account numbers, addresses), and your test has to go red each time.

**Where to start.** Run `npm run chat` with a message that holds a phone number, and read the log line. What exactly would a test look at? Why does the format matter, when you come to fix it?

**Log it.** What the log held, in one line (copy the line with the number in it).

## Milestone 2 · Redact at the log boundary
*Target: 14 min · Block A*

**Goal.** Hide personal data in every log line, **once, at the logger**, so that no call site has to remember to do it. Your milestone 1 test goes green.

**Interface.** `src/redact.mjs` exports
- `redactPII(text)`: replaces Indian mobile numbers (start 6 to 9, ten digits, optional `+91`, `91` or `0` in front, a space or a dash allowed in the middle) with `[REDACTED_PHONE]`, account numbers (11 to 16 digits, or groups of four digits) with `[REDACTED_ACCOUNT]`, and addresses with `[REDACTED_ADDRESS]` (a flat, house, door or plot word followed by capitalised comma-separated parts, a `#12` followed by parts, or a number and a name ending in Road, Street and the like). Anything that is not a string comes back unchanged.
- `redactDeep(value)`: the same for every string inside an object or an array, and it makes an `Error` into a plain object that can be logged.

`src/log.mjs` applies `redactDeep` to the whole record of every line. **`src/server.mjs` and `src/answer.mjs` must not call redaction themselves.**

**Success criteria.**
- [ ] Every phone, account and address format in `data/pii-corpus.json` is hidden.
- [ ] Each kind of detail becomes **its own token**.
- [ ] **Ordinary numbers are left alone**: a price (1499), a plan code (UP-24), a helpline (1800-123-4567), a date, a time.
- [ ] Every line of the knowledge base comes through untouched, and redacting twice changes nothing.
- [ ] The logger applies it to every line, deep inside objects, arrays and errors, and every line is still valid JSON.
- [ ] It is applied **once**, at the boundary.
- [ ] End to end: after every request in the corpus, the log holds none of the details.

**Where to start.** Which of `9876543210`, `1499` and `1800-123-4567` is personal data, and what in the text tells you? Which order should the patterns run in? Where is the single place everything passes through?

**Stretch.** Write down, in a comment at the bottom of the file, three things your patterns do **not** catch. They are heuristics.

**Log it.** The format that gave you the most trouble, and what you did about it.

## Milestone 3 · Guard the input
*Target: 12 min · Block A*

**Goal.** Refuse a prompt-injection attempt or an over-long question **before** the model is called, with a fixed reply, and let an honest question that merely sounds like an attack go through.

**Interface.** `src/guards.mjs` exports `SAFE_REFUSAL` (one fixed sentence) and `screenInput(query, { maxChars = 500 })`, which returns `{ ok: true }` or `{ ok: false, reason, response }`, with reason `not_text`, `too_long` or `injection`, and `response` always `SAFE_REFUSAL`. `src/answer.mjs` calls it **first**, uses `config.maxQueryChars` as the limit, and for a refusal returns `{ answer, refused: true, reason, citations: [], meta: {} }` without calling the model. A refusal is logged as an event named `guardrail.input_blocked`, with its reason. The customer's details must not appear in that line: the log boundary from milestone 2 hides them, so write it through the logger.

**Success criteria.**
- [ ] Every injection phrasing the check tries is refused, with a reason and the one fixed reply. Attacks come in three families: *ignore, disregard, forget or override* your instructions, prompt or rules; *reveal, show or print* the system prompt or your instructions; and *you are now* an unrestricted assistant. Cover all three, in several wordings.
- [ ] A question over the limit is refused, and `maxChars` is honoured.
- [ ] An **honest question that sounds like an attack** is NOT refused ("How do I ignore a bill reminder in the app?"), and neither is any customer question in the corpus.
- [ ] End to end: an attack is refused **before the model**, and the reply does not repeat the question.
- [ ] The attempt is logged without the customer's details.
- [ ] A normal question still reaches the model and gets a grounded answer.

**Where to start.** Write down five ways to say "ignore your instructions". Then five honest questions with the same words in them. What is the difference? How cheap can the first check be?

**Log it.** One attack phrasing you did not think of at first, and one honest question your first pattern refused.

## Milestone 4 · Guard the output
*Target: 11 min · Block A*

**Goal.** The model is not under your control. Whatever it says, make sure that personal data and its own instructions never reach a customer, or a log. This is the second guardrail: **defence in depth**.

**Interface.** `src/guards.mjs` exports `scanOutput(text)`, which returns `{ ok, text, reason? }`. A sign of the system prompt (the internal marker `CANARY` from `src/prompt.mjs`, or wording that only the system prompt has) gives the fixed safe reply and the reason `prompt_leak`. Personal data gives the **redacted** text and the reason `pii`. A clean answer comes back unchanged. `src/answer.mjs` scans the model's text and **logs and returns the scanned text, never the raw one**. When the scan changed anything, it logs an event named `guardrail.output_blocked` with the reason.

**Success criteria.**
- [ ] `scanOutput` removes personal data and keeps the rest of the words.
- [ ] It catches a leaked system prompt and gives the safe reply instead.
- [ ] It leaves a **normal answer exactly as it was**: every knowledge-base section, with its price, helpline and codes.
- [ ] End to end: personal data the model repeats never reaches the customer, and an event is logged.
- [ ] End to end: a model that prints its instructions never gets them to the customer, **even for an innocent question**.
- [ ] With the stand-in model (which repeats what it is told), no corpus answer holds any personal detail.
- [ ] An ordinary question gets its ordinary answer, with its citation and its helpline number.

**Where to start.** Run the corpus through the stand-in: where does the model repeat personal data? If the input guard had caught everything, would you still need this one? How would you recognise a leaked prompt?

> **Facilitator check-in after this milestone.** Then take a break and carry on with milestone 5.

**Log it.** A case where the input guard did not catch something and the output guard did.

## Milestone 5 · Lock the model and the cost
*Target: 12 min · Block B*

**Goal.** The model is `marlow-llm-latest`, a name that can point at a different model next Tuesday with nobody's approval. Pin it. Put a limit on how long an answer can be and how long you wait. Work out what a request costs and what a month will cost against the cap the client set, and say so in every response.

**Interface.**
- `src/config.mjs`: a **pinned** `model` (an exact version, with digits in it, that has a price in `data/prices.json`), `maxTokens` (50 to 1000), `timeoutMs` (500 to 30000), `maxQueryChars`, `monthlyCapUSD`, `alertAt` (the warning line, as a share of the cap, for example 0.8), and `expected: { requestsPerMonth, avgInputTokens, avgOutputTokens }`. **The client's cap is $300 a month.** The service is expected to see about 20,000 requests a month, at about 700 tokens in and 120 out each: start from those, and say in a comment where any number you change comes from.
- `src/cost.mjs`: `estimateCost({ inputTokens, outputTokens }, modelId, prices)` in dollars (input and output are priced **separately**, per million tokens, and an unknown model **throws**); `projectMonthly({ requestsPerMonth, avgInputTokens, avgOutputTokens }, { model, prices })` returns `{ perRequestUSD, monthlyUSD }`; `costAlert({ projectedMonthlyUSD, capUSD, warnAt = 0.8 })` returns `{ level, ratio }` where level is `ok` below the warning line, `warn` from it up to **and including** the cap, and `breach` above the cap.
- `src/model.mjs`: refuses an unpinned model when the service starts, with an error that says so, and cuts a call off at `timeoutMs` with an error that carries `status: 504` and `code: 'model_timeout'` (the server already turns that into the response). The check tests the timeout by starting the service in live mode (`LLM_MODE=live`, with `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` set) against a deliberately slow local fake provider, so the timeout belongs in `src/model.mjs`, around whatever the adapter does.
- Every response from `/api/chat` has `meta: { model, maxTokens, usage: { inputTokens, outputTokens }, costUSD }`, and `maxTokens` is passed to the model.

**Success criteria.**
- [ ] The settings are locked: pinned, priced, limited, with a cap.
- [ ] `estimateCost`, `projectMonthly` and `costAlert` give the right numbers, including exactly at the cap.
- [ ] **The design fits its own cap**: the expected volume projects below the monthly cap.
- [ ] Every response says which model answered, the token limit, the tokens used and what it cost.
- [ ] The token limit is enforced: a long answer is cut.
- [ ] The service will not start with `marlow-llm-latest`.
- [ ] A slow model is cut off at the timeout, with a 504 and a log line, and not left hanging.

**Where to start.** What did Monday's cost card say about output tokens against input tokens? Whose number is the cap, and whose is the expected volume? What should happen when the model is slow: the customer waits, or gets a clear error?

**Log it.** The projected monthly cost and the cap, with the share (`ratio`).

## Milestone 6 · Write guardrail tests that bite
*Target: 14 min · Block B*

**Goal.** A test that never fails tells you nothing. Write the suite that **passes on a good service and fails on eight broken ones**. The check will break a copy of the service in eight ways and run your suite against each.

**Interface.** `tests/learner/guardrails.test.js`, with at least six tests. Use a **fake model**: an object with an `id` and a `complete()` that counts how often it was called and returns the text you choose. Pass it to `startService({ config, model })`. The eight breaks, which your suite must catch:
1. the input guardrail is switched off, so an attack reaches the model
2. the output guardrail is switched off, so what the model repeats reaches the customer
3. the logger does not redact, so the log holds what customers typed
4. the length limit is never applied
5. only **one** phrasing of an attack is caught
6. the guardrail is too strong, so an honest question about "instructions" is refused
7. a leaked system prompt in the answer is not caught
8. redaction is too greedy, so a price and a helpline number are hidden

**Success criteria.**
- [ ] The file exists, with at least six tests.
- [ ] It passes on **your** service and on the reference service, which is correct. So a test must not ask for more than milestones 2 to 4 do: use attack phrasings from the three families in milestone 3, because a stricter guard of your own would fail on the reference.
- [ ] It **fails** on each of the eight broken versions.

**Where to start.** For each of the eight, ask: which assertion would go red? Is it about what the customer or the log **received**, or about a function returning true? Which of your tests would still pass if the guardrail blocked **everything**?

**Log it.** Which of the eight your first draft did not catch, and the test you added.

## Milestone 7 · The mandatory PII gate
*Target: 12 min · Block B*

**Goal.** A release gate: one command that sends the corpus through the real service, looks for personal data in **what customers got back and in what the log recorded**, and blocks the release on any leak. It has **no override**, and it **does not pass when it checked nothing**.

**Interface.** `node scripts/pii-boundary.mjs --require-pass` (`npm run test:pii-boundary -- --require-pass`). It reads `data/pii-corpus.json` (each item: `id`, `query`, `pii`: the details inside the query), starts the real service with its own temporary log, sends every query, and scans the answers and the log with **its own scan, not `redactPII`** (the exact text, or the same digits with spaces, dashes or dots between them). It prints one line for each request, `clean` or `LEAK` with the detail. **Exit 0 only when every request was checked and nothing leaked**; then it says how many it checked. Exit 1 for anything else.

**Success criteria.**
- [ ] It passes on a service that does not leak.
- [ ] It blocks a service that leaks **in the log only**.
- [ ] It blocks a service that leaks **in the answers only**.
- [ ] It blocks a service that leaks **only one format**.
- [ ] **No flag or argument turns a leak into a pass** (the check tries `--force`, `--skip`, `--allow`, `--ignore` and more).
- [ ] It **fails closed**: a missing, empty or malformed corpus blocks it, and so does a corpus with an entry that has no details to look for.
- [ ] It fails when the service cannot start.
- [ ] A failure names the request that leaked, and a pass says how many requests it checked.

**Where to start.** Write down every way a gate can say "no leaks" and be wrong: it checked nothing, it checked only half of the places, it checked with the same pattern that it is testing. How would you make each of those a failure?

**Log it.** A way your gate could have passed when it should not, and what you did about it.

## Milestone 8 · Flag, deep health, drill and image tag
*Target: 18 min · Block B*

**Goal.** Make the service something you can **switch off in seconds**, **check properly**, **roll back by rehearsal**, and **trace to a commit**.

**Interface.**
- `src/flags.mjs`: `isEnabled(name, { flagsFile })` reads the flag file (`config/flags.json`, `{ "faq_enabled": true }`) **every time**, and returns `false` when it cannot read it. The key is the name plus `_enabled`: `isEnabled('faq', { flagsFile })` is `true` for that file. `src/server.mjs`: when the flag is off, `POST /api/chat` returns **503** `{ "error": "feature_disabled" }` with a `Retry-After` header, and works again the moment the flag is on, with no restart. `GET /version` returns `{ gitSha, model, faq: "on" | "off", startedAt }`, where `gitSha` is the `GIT_SHA` environment variable (or `unknown`).
- `src/health.mjs`: `GET /healthz` is 200 with `{ ok, checks: { knowledge_base, log, model, flag } }` when the knowledge base is loaded, the log can be written and the model answers a tiny test call; **503** when any of those is broken. A feature switched off on purpose is **not** unhealthy.
- `scripts/drill.mjs` (`npm run drill`): starts a release with its own port, log and flag file, and runs at least seven steps: health, a real question gets a grounded answer, `/version` names the commit, an injection is refused, personal data is not in the deployed log, **flip the flag off and time how long until requests stop** (under two seconds), the service stays healthy, flip it on and requests work again. It writes `results/drill-report.json` (`ok`, `rollbackMs`, `steps`) and exits 1 if any step failed.
- `scripts/image-tag.mjs` (`npm run image:tag`) prints **only** `marlow-faq:<7-character git sha>` on stdout, adds `-dirty` and a warning on stderr when there are uncommitted changes, exits 1 when there is no commit, and **never** says `latest`. `scripts/build-image.mjs --dry` prints the `docker build` command with `--build-arg GIT_SHA=<sha>` and `-t marlow-faq:<sha>`. **Each of these two scripts must stand on its own**: the check runs them in a copy of the repository where only your `scripts/` folder is yours, so they may share a helper inside `scripts/`, but not a file in `src/`.
- `Dockerfile` (in this folder; the build context is the folder above, because the image needs `engine/`): a base image **pinned** to a version, `ARG GIT_SHA`, `ENV GIT_SHA`, `LABEL org.opencontainers.image.revision=$GIT_SHA`, `USER node`, a `HEALTHCHECK`, `ENV HOST=0.0.0.0` (the server listens on `HOST`, which is 127.0.0.1 unless you set it, and a container has to listen on every address or a published port cannot reach it), and `CMD ["node", "src/main.mjs"]`. Copy only what runs (`engine`, `package.json`, `src`, `data`, `config`), never the whole folder, which would carry `.git` and your logs into the image.

**Success criteria.**
- [ ] The flag is read every time, and a missing or unreadable file means **off**.
- [ ] The service honours the flag on the next request, and recovers when it goes back on.
- [ ] `/version` says which commit is running.
- [ ] The health check **exercises** the knowledge base, the log and the model: 503 when one is broken, 200 when the flag is off on purpose.
- [ ] The drill passes on your service and writes its report; it **fails** when the flag is read once and kept, when the guardrail is missing from the release, and when the release's log holds personal data.
- [ ] The image tag is the git SHA, with `-dirty` for uncommitted changes, and an error with no commit; the build command carries the SHA twice.
- [ ] The Dockerfile follows the rules above.

**Where to start.** It is 02:00 and the feature is wrong. What is the fastest safe thing to do, who can do it, and how do you know it worked? What is the difference between "the process is running" and "the feature is working"? If the image is called `latest`, how do you find the commit in it during an incident?

> **Facilitator check-in after this milestone.** The drill is run live.

**Log it.** The rollback time your drill measured, and the image tag.

## Milestone 9 · Homework: the runbook, the purge and a second type
*About an hour · after the session*

**Goal.** Stopping the leak from today does not touch what is already on disk. Write the runbook for the next time, clean the old lines, and prove that a new type of personal data (email addresses) goes through the whole loop.

**Interface.**
- `docs/RUNBOOK-pii-in-logs.md`: sections for **who is paged** and when, **containment** (the flag, with the exact change), **how far back** to look, **the purge**, **verify the fix**, and **severity** (two levels: a guardrail that is not firing is high; one value that got through is lower). Real commands, not "check the logs". Rehearse it on `data/sample-leaked.log` and add a line `Rehearsed: <YYYY-MM-DD>, <what you found>`.
- `scripts/purge-logs.mjs <input> <output>` (`npm run purge-logs -- data/sample-leaked.log results/clean.log`): writes a cleaned **copy** (never edits the input), leaves every line with nothing to hide **exactly as it was**, keeps every cleaned line valid JSON, and prints `<changed> of <total> lines changed`.
- Email addresses: `[REDACTED_EMAIL]` in `src/redact.mjs`, and the three email requests added to `data/pii-corpus.json`, so the gate passes with 23 requests.

**Success criteria.**
- [ ] The runbook has every section above, with real commands, two severity levels, and a rehearsal line with a date.
- [ ] On the sample log, the purge changes 7 of 12 lines, leaves no personal data, keeps valid JSON, leaves the other 5 lines untouched and leaves the input alone.
- [ ] Email addresses are hidden in text and in the log.
- [ ] The gate still passes with the email requests in the corpus, and `npm test` is still green.

**Where to start.** Run your runbook on the sample log with a timer. Which step did you have to guess? That step is not written down well enough.

**Log it.** How long the rehearsal took, and the step you had to fix.
