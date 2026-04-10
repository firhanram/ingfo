# Commit rules

All commits follow the [Conventional Commits](https://www.conventionalcommits.org) spec.
Every commit message is machine-readable and human-scannable.

---

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Rules

- Subject line: 72 characters max
- Subject: sentence case, no period at the end
- Type: lowercase always
- Scope: lowercase, kebab-case
- Body: wrap at 72 characters, explain *why* not *what*
- Footer: used for breaking changes and issue references
- Empty line between subject, body, and footer — always

---

## Types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to the user |
| `fix` | A bug fix |
| `refactor` | Code change that is not a feat or fix |
| `test` | Adding or updating tests only |
| `docs` | Documentation only — md files, code comments |
| `style` | Formatting, spacing, no logic change |
| `chore` | Build config, project setup, tooling |
| `perf` | Performance improvement |
| `revert` | Reverts a previous commit |

**Rules:**
- `feat` and `fix` appear in the changelog — all others do not
- Never use `feat` for internal refactors even if they "enable" a feature
- Never use `chore` as a catch-all — if it has a real type, use it

---

## Scopes

Scopes map directly to the workspace path where the change lives.

| Scope | Maps to |
|---|---|
| `apps/web-extension` | `apps/web-extension/` — any file inside the web extension app |
| `packages/typescript-config` | `packages/typescript-config/` — shared TS config package |
| `root` | Any file at the repo root: `package.json`, `biome.json`, `turbo.json`, `pnpm-workspace.yaml`, `.vscode/`, etc. |

**Rules:**
- Scope is **always required** — no exceptions
- Use the full workspace path as the scope: `apps/web-extension`, not just `web-extension`
- Root-level files (config, tooling, docs at the repo root) use `root` as the scope
- If a commit touches files in a package **and** root-level files, **split into two separate commits** — one scoped to the package, one scoped to `root`

```
// ✅ correct — package-scoped
feat(apps/web-extension): Add popup entry with React root

// ✅ correct — root-scoped
chore(root): Add biome.json with formatter and linter config

// ❌ wrong — no scope
feat: Add popup entry with React root

// ❌ wrong — short scope that omits the workspace path
feat(web-extension): Add popup entry

// ❌ wrong — mixing root and package changes in one commit
chore(root): Add biome.json and update web-extension tsconfig
```

---

## Subject line

- Imperative mood — "add", "fix", "remove", not "added", "fixes", "removed"
- Sentence case — first word capitalised, rest lowercase
- No period at the end
- Describes what the commit does, not what you did

```
// ✅ correct
feat(apps/web-extension): Add background service worker entry

// ❌ wrong — past tense
feat(apps/web-extension): Added background service worker

// ❌ wrong — period at end
feat(apps/web-extension): Add background service worker entry.

// ❌ wrong — vague
feat(apps/web-extension): Update background

// ❌ wrong — scope not full workspace path
feat(web-extension): Add background service worker entry

// ❌ wrong — uppercase in scope
feat(Apps/Web-Extension): Add background service worker entry
```

---

## Body

Optional but required when:
- The *why* is not obvious from the subject line
- The commit changes behaviour in a subtle way
- A technical decision was made that future readers need to understand

```
feat(apps/web-extension): Use persistent background service worker

MV3 requires declaring the background as a service worker.
Event-based registration ensures the worker is not killed
during long-running message exchanges with the content script.
```

---

## Footer

### Breaking changes

```
feat(apps/web-extension): Replace fetch with chrome.runtime messaging

BREAKING CHANGE: Direct fetch calls from content scripts are removed.
All network requests must now go through the background service worker.
```

### Issue references

```
fix(apps/web-extension): Handle missing runtime id without crashing

Fixes #42
```

### Reviewer sign-off

After a task is `APPROVED` in the agent workflow, the footer records it:

```
feat(apps/web-extension): Add popup with tab info display

Reviewed-by: Agent-2
```

---

## Scoping multiple files

If a commit touches multiple files **within the same workspace**, use that workspace's scope.

```
// ✅ correct — multiple files inside apps/web-extension, one commit
feat(apps/web-extension): Add content script with message passing
```

If a commit touches files across **different workspaces or root**, split into separate commits — one per scope.

```
// ✅ correct — split into two commits
chore(root): Add lint:fix to turbo.json and root package.json
chore(apps/web-extension): Add lint and lint:fix scripts

// ❌ wrong — two scopes in one commit
chore(root): Add lint:fix pipeline and web-extension scripts
```

---

## Examples

### Root-level tooling and config

```
chore(root): Init monorepo with pnpm workspaces and Turbo
chore(root): Add biome.json with formatter, linter, and ignore rules
chore(root): Add .vscode/settings.json with Biome as default formatter
chore(root): Add lint:fix to turbo.json pipeline and root scripts
chore(root): Fix useEditorconfig casing in biome.json
```

### Shared packages

```
chore(packages/typescript-config): Add base tsconfig with strict mode
chore(packages/typescript-config): Add react-library tsconfig preset
```

### Web extension app

```
chore(apps/web-extension): Scaffold WXT app with React and TypeScript
feat(apps/web-extension): Add background service worker entry
feat(apps/web-extension): Add popup entry with React root
feat(apps/web-extension): Add content script with DOM injection
fix(apps/web-extension): Fix popup crash on missing runtime id
chore(apps/web-extension): Add lint and lint:fix scripts
```

### Split root + package example

```
// Two separate commits when both root and a package are touched:
chore(root): Add lint:fix to turbo.json and root package.json
chore(apps/web-extension): Add lint:fix script to package.json
```

---

## What never goes in a commit message

- "WIP" — finish the work, then commit
- "Fix bug" — which bug, how, why
- "Update file" — describe what changed
- "Per review" — describe the actual change made
- "Misc changes" — split into separate commits
- Emoji — not in the subject line

---

## Commit size

One logical change per commit.

```
// ✅ correct — two separate commits
feat(apps/web-extension): Add popup with tab info display
test(apps/web-extension): Add unit tests for popup message handler

// ❌ wrong — two concerns in one commit
feat(apps/web-extension): Add popup and tests
```

If you cannot describe a commit in one subject line without using "and",
it should be two commits.