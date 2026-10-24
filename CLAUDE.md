# Split (mainpecah)

## Shipping
- Commit and push straight to `main` for every change, app code included. No branch, no PR.
- Don't ask before pushing, visual changes included. Push, then show the screenshot with the result.
- CI (`.github/workflows/ci.yml`) and the Pages deploy (`deploy.yml`) run on each push to main. Wait for both, then confirm the deploy.
- If CI goes red, fix it and push again to main.

## Tests
- `node test/selftest.cjs` and `node test/e2e.cjs` (Playwright). Run both before pushing.
- Keep every element id the tests use.
