# Agents

Project rules for any coding agent working on Kaboom Kitty.
[CLAUDE.md](CLAUDE.md) stays the source for shipping rules.

- [GAME-DESIGN.md](GAME-DESIGN.md): what good means for this game, item by item, with a bot test each.
- [UI.md](UI.md): review checklist for every screen, including the density rule.
- [TESTING.md](TESTING.md): what to run, when, and the rules for fixing failures.
- [docs/plans/](docs/plans/): approved plans. Execute from these, and stop if a task needs a decision the plan doesn't cover.

## DeepSeek executor
- Executor PRs: never enable auto-merge. A human reviews the full diff first.
- Plans: executor tasks list exact file paths. One task is one source file plus one test, with exact old and new strings.
- Dispatch: Actions, "DeepSeek executor", plan slug and task id. Rules and why: [decisions/deepseek-executor.md](decisions/deepseek-executor.md).
