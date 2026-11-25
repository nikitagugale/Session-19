# DD11 Lab Kit: Ship-It Lab, make a working demo safe to ship
**PwC Full-Stack AI track · Wed 25 Nov 2026 · 08:00–11:00 IST**

A phone company's FAQ service worked in the demo. Then someone read its log, and the log held customers' phone numbers, account numbers and home addresses. Over eight
milestones you reproduce that leak as a test, fix it at the one place that matters, put a guardrail at each end of the model, lock the model and the cost, write tests that
catch a broken guardrail, build a release gate nobody can switch off, and rehearse a rollback. The last milestone is homework: the incident runbook.

**This is a milestone lab, not a follow-along.** There are no prompts to paste. Each milestone is a card with a goal, an interface and success criteria, in
`service/LAB-GUIDE.md`. You decide how to get there, and you work at your own pace. The facilitator checks in twice, after milestone 4 and after milestone 8.

## Setup (about 1 minute)

Needs **Node 20 or newer** and **git**. There is **no npm install, no API key and no download**: the kit has no dependencies, and the "model" is a small stand-in inside it.
Save `ship-lab-kit.zip` in your home folder, then in a terminal on the lab VM:

```bash
cd ~
unzip -q ship-lab-kit.zip     # no unzip?  python3 -m zipfile -e ship-lab-kit.zip .
cd ship-lab/service
node --version                # needs v20 or newer
git --version                 # needs to print a version
npm test                      # should end:  ℹ pass 10
npm run setup                 # makes the starting commit. Do it BEFORE you change anything
npm run doctor                # should end:  Ready.
npm run chat -- "my number is 98765-43210 and address is 12 MG Road, can you check my plan?"
                              # shows the answer AND the log line. See the leak for yourself.
```

When it is green, open **only the `service` folder** in VS Code (File, Open Folder), then open `LAB-GUIDE.md`. Do not open `ship-lab` itself. The folders next to
`service` (`engine/`, `hints/`, `checks/`, `checkpoints/`) hold the stand-in model, the hints, the hidden checks and the reference solutions, and Claude Code
reads everything in the folder you open.

## What is in the box

| Folder | What it is |
|---|---|
| `service/` | **The project you open and change.** `LAB-GUIDE.md` is your guide, `LAB-LOG.md` is your evidence log. |
| `engine/` | The stand-in model. It behaves like the bad days of a real one: it repeats what a customer tells it, it can be talked into printing its instructions, and it writes a long answer when asked for "everything". Use it like an API. |
| `checks/` | The hidden milestone checks. `npm run step -- N` runs one. |
| `hints/` | The hint ladder (three hints and a reveal for each milestone). |
| `checkpoints/` | The reference solution for each milestone, which `npm run checkpoint -- N` replays as git commits. |

**Everything is made up.** Marlow Mobile is not a real company. The customers' details in the test data are invented, and no number in this kit is a real person's. The model is a
stand-in, so its answers are not a real model's, but the method is the real one. **Please never paste anything real (a key, a password, a customer's details) into the chat or into Claude.**

**Docker.** Milestone 8 includes a Dockerfile and a command that builds an image tagged with the git commit. The lab VM may not have Docker. The checks look at the Dockerfile and at
the command it would run (`npm run image:build -- --dry` prints it), and they never need Docker. If Docker is installed, leave `--dry` off and it builds the image.

**Optional: a real model.** By default the service uses the stand-in. If you want to try a real provider, set `LLM_MODE=live`, `LLM_BASE_URL`, `LLM_MODEL` and `LLM_API_KEY` **in your terminal**
(never in a file in this folder). It is not needed for any milestone, and the checks never use it.

**On Windows PowerShell**, `npm run x -- --flag` can lose its flags (npm's PowerShell shim eats the `--`). The lab VM is Linux, so use that, or Git Bash, or run `node scripts/<name>.mjs ...` directly.

If `npm test` does not show `pass 10`, paste the last line of the error into the chat and carry on listening. It gets fixed at the first break.
