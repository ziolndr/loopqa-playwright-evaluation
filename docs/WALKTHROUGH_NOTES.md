# Optional 2–3 minute walkthrough outline (recording not included)

**0:00–0:20** — Objective and JavaScript + Playwright setup. Six cases, two boards, one JSON matrix.

**0:20–0:50** — `data/scenarios.json`. Each record supplies project, column, task and expected tags. Adding a case requires a JSON row, not another test body.

**0:50–1:30** — `tests/board.spec.js` and Page Objects. Every case independently logs in, opens its board, scopes a task to its column, and checks exact tags within the same card.

**1:30–2:10** — Run `npm test` and inspect Playwright output. Demonstrate a successful run only after actually verifying it.

**2:10–2:30** — GitHub Actions, reports, screenshots and traces on failures. Close with the public repo URL and Form submission.
