# Testing 

Run related test before committing with: 
- pnpm --filter=[packageName] check-types
- pnpm --filter=[packageName] lint
- pnpm --filter=[packageName] format

# Design

Always follow the design guidelines in `DESIGN_GUIDELINES.md` when writing UI code — colors, typography, spacing, border radius, shadows, and dark mode must use the defined tokens and patterns.

# Commit Rules

Always follow the commit conventions in `.claude/COMMITS.md` before creating any commit. This includes commit message format, scope, and type prefixes. Use the `/commit` command to commit changes.

# Project Structure — `apps/web`

Full-stack app using TanStack Start. Uses feature-domain folder structure. Import alias: `#/*` → `./src/*`.

```
apps/web/src/
├── routes/                    # TanStack file-based routes (pages only, keep thin)
│   ├── __root.tsx
│   ├── index.tsx
│   └── share.$id.tsx
├── features/                  # Feature domains — primary home for business logic & UI
│   └── <feature>/             # e.g. recording, auth, billing
│       ├── components/        # Feature-scoped UI components
│       ├── hooks/             # Feature-scoped React hooks
│       ├── lib/               # Feature-scoped utilities, helpers, types
│       ├── lib/*.server.ts    # Server-only utils (DB queries, secrets, validation)
│       └── api/               # TanStack Start server functions for this feature
│           └── *.server.ts    # Always server-only (serverFn, loaders, actions)
├── components/                # Shared UI components (used across multiple features)
├── hooks/                     # Shared React hooks
├── lib/                       # Shared utilities, types, constants
│   ├── utils.ts
│   └── *.server.ts            # Shared server-only utilities (DB client, env, etc.)
├── integrations/              # Third-party integration wrappers (TanStack Query, etc.)
├── data/                      # Static data / fixtures
├── styles.css                 # Global styles
├── router.tsx                 # TanStack Router config
└── routeTree.gen.ts           # Auto-generated route tree (do not edit)
```

## Rules

- **Routes are thin.** Route files import from `features/` or `components/`. They should contain minimal logic — just the route definition, loader/action wiring, and the page component that composes feature components.
- **Feature-first.** New functionality goes into `features/<name>/`. Only promote to shared (`components/`, `hooks/`, `lib/`) when used by 2+ features.
- **Server-only files use `*.server.ts` (or `*.server.tsx`).** Any function, constant, or module that must only run on the server (DB access, secrets, server functions) must use this suffix. TanStack Start tree-shakes these out of the client bundle.
- **Shared `lib/*.server.ts`** is for cross-feature server utilities (e.g. DB client, env config, auth helpers).
- **Feature `api/*.server.ts`** is for TanStack Start `createServerFn` definitions scoped to that feature.