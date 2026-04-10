Commit the current changes following the rules in `.claude/COMMITS.md`.

## Steps

1. Run `git status` and `git diff` to see all changed files.
2. Group changed files by scope:
   - Files inside `apps/*` or `packages/*` use their full workspace path as scope (e.g. `apps/web-extension`, `packages/tailwind-config`).
   - Files at the repo root use `root` as scope.
3. If changes span multiple scopes, create **separate commits** — one per scope.
4. For each commit:
   - Stage only the files belonging to that scope.
   - Write a commit message following Conventional Commits format: `<type>(<scope>): <subject>`
   - Type must be lowercase (`feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `style`, `perf`, `revert`).
   - Scope must be lowercase kebab-case, using the full workspace path.
   - Subject must be imperative mood, sentence case, no period, max 72 chars.
   - Add a body only when the *why* is not obvious from the subject.
   - Add `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` in the footer.
5. Run `git status` after all commits to verify clean state.

## Rules

- Never combine root-level and package-level changes in one commit.
- One logical change per commit — if you need "and" in the subject, split it.
- Never use "WIP", "Fix bug", "Update file", "Misc changes", or emoji in the subject.
- Run tests (`check-types`, `lint`, `format`) for affected packages before committing.
