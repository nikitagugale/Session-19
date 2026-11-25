# Project context for Claude Code: service (the DD11 lab)

This is a **training lab**. The company, its customers, the plans and the prices are **made up** (Marlow Mobile, a made-up phone company), and so are all the phone numbers, account numbers and addresses in the test data. Nothing here is real, and none of it is advice. **Never put a real key, password or personal detail into this folder.**

## What the project is
A customer-support FAQ service. A customer asks a question, the service finds the best sections of the knowledge base in `data/kb/`, asks a model to answer from them, and returns the answer with its citations. It worked in the demo. The lab makes it **safe to ship**, with tests that prove it.

- `src/server.mjs`: the HTTP service (plain `node:http`). `startService({ port, config, model, logger })` returns `{ url, deps, close }`. The tests and the checks use this shape, so keep it. `POST /api/chat`, `GET /healthz`, `GET /version` (milestone 8).
- `src/answer.mjs`: one question in, one answer out. This is where the guardrails and the cost go in.
- `src/log.mjs`: the application log, one JSON line for each event. **The place where personal data must be hidden, once, for every line.**
- `src/redact.mjs` (milestone 2), `src/guards.mjs` (milestones 3 and 4), `src/cost.mjs` and `src/config.mjs` (milestone 5), `src/flags.mjs` and `src/health.mjs` (milestone 8): the starter versions do nothing. They are what you write.
- `scripts/`: the lab's own tools, and the ones you write: `pii-boundary.mjs` (7), `drill.mjs`, `image-tag.mjs`, `build-image.mjs` (8), `purge-logs.mjs` (9). `scripts/lab.mjs`, `hint.mjs`, `progress.mjs`, `test.mjs` run the lab itself: do not edit them.
- `data/pii-corpus.json`: requests that carry personal data, each with the details to look for. `data/sample-leaked.log`: a log that has already leaked. `data/prices.json`: the model prices.
- `tests/baseline/` is the lab's own tests. Yours go in `tests/learner/`.
- `../engine/`: the stand-in model, and an optional adapter for a real provider. **Do not edit or read it to find answers: use it as a vendor's API.**

## How to work here
- **A test first, red on the shipped code, then the fix.** Every claim ("it is fixed") needs a test or a command that proves it.
- **Hide personal data at the boundary, once.** Do not scatter redaction through the service.
- **A guardrail needs a test that fails when the guardrail is broken.** A test for the happy path proves nothing about a guardrail.
- **Fail closed.** When a check cannot tell (a missing flag file, an empty corpus, a service that did not start), the answer is no.
- **No override for a gate.** A gate with a `--force` is a suggestion.
- **Never put a key in a file.** A real model's key goes in the terminal's environment only.
- Keep changes small and commit after each milestone. The checks are hidden scripts that run with `npm run step -- N`. They look at what your code **does**, not at how it is written.

## Terms
**PII**: personal data (a phone number, an account number, an address, an email). **Guardrail**: a check around the model, on the way in and on the way out. **Prompt injection**: a customer message that tries to change the model's instructions or to make it reveal them. **Boundary**: the one place that everything passes through (here, the logger). **Feature flag**: a setting that switches a feature off without a deploy. **Drill**: a rehearsal of a rollback. **SHA**: the git commit's short hash, which tags the image.
