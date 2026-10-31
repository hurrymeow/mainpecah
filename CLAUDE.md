# Split (mainpecah)

See [AGENTS.md](AGENTS.md) for the design baseline, UI checklist and testing rules.

## Shipping
- Commit and push straight to `main` for every change, app code included. No branch, no PR.
- Don't ask before pushing, visual changes included. Push, then show the screenshot with the result.
- Run both tests locally, push, then report to Hari right away. Don't wait for CI before reporting.
- CI (`.github/workflows/ci.yml`) and the Pages deploy (`deploy.yml`) run on each push to main. Watch both in the background and report only failures.
- If CI goes red, fix it and push again to main.
- Batch small tweaks into one push instead of shipping each one.

## Tests
- `node test/selftest.cjs` and `node test/e2e.cjs` (Playwright). Run both before pushing.
- Keep every element id the tests use.
