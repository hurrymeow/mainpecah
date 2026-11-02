# Executor smoke test

Throwaway plan to prove the DeepSeek executor end to end.

### T1. Fix a typo in README (Haiku)
- Files: `README.md`
- Exact changes: In `README.md`, create the file if missing with the single line `# Kaboom Kitty`. If it exists, change the first occurrence of "teh" to "the". If no typo exists, stop with status `stopped`.
- Done when: `node test/selftest.cjs` exits 0.
- Don't touch: everything except `README.md`, `decisions/executor-smoke-T1.md` and `progress/executor-smoke-T1.md`.
