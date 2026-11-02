# DeepSeek executor

Ported from hurrymeow/lurahsimulator (PRs #232, #234, #237, #241). Added 2026-11-02.

- A person dispatches `deepseek-exec.yml` with `plan` and `task`. One task per run, one PR per run.
- Pre-flight refuses before any model call unless the task heading ends in `(Haiku)` and has `Files:` (backticked exact paths), `Exact changes:`, `Done when:` and `Don't touch:`.
- Job `execute` has a read-only token and the DeepSeek key. Job `publish` has a write token and no model. The key never reaches the write job's model step.
- Gate: changed paths must be in `Files:` plus `decisions/<plan>-<task>.md` and `progress/<plan>-<task>.md`. Caps: 12 files, 400 changed lines. Hard-deny list (workflows, executor scripts, lockfiles, sw.js, manifest.json, assets/, icons/, images and audio, CLAUDE.md, AGENTS.md). Key-leak scan. A gate failure opens no PR.
- Status `stopped` or `failed` opens a draft PR labelled `executor:question` or `executor:failed`, or an issue when there is no diff.
- A push by `GITHUB_TOKEN` does not start `pull_request` or `push` workflows. Publish dispatches `ci.yml` on the new branch, so `ci.yml` needs `workflow_dispatch`.
- Never enable auto-merge on executor PRs.
- Task size: the CLI is capped at 40 turns. Tasks of about one source file plus one test passed at $0.005 to $0.02. Three or more source files ran out of turns. Anything that needs reading code to decide how goes to a stronger model.
- Model is `deepseek-flash`. Every model env var is set, because unknown claude-opus names map to the pricier Pro model.
- Claude Code pinned to 2.1.309, the version that worked with `ANTHROPIC_BASE_URL` in the source repo. Not re-verified here: the first smoke run is the check.
- Repo adaptions: checks are `node test/selftest.cjs` and `node test/e2e.cjs`. No lockfile, so Playwright installs as in `ci.yml` and the Node cache is off. `CLAUDE.md` says push to main, so the prompt overrides it.
- Secret `DEEPSEEK_API_KEY`: keep a small prepaid balance as the spend cap. No PAT.
