# Ingfo

Ingfo is a bug-reporting tool. A browser extension records the screen while capturing network
requests, console logs, and browser/session info, then uploads everything to the web app and
returns a shareable link — so anyone can replay the issue with full context instead of a vague
"it's broken" report.

## Monorepo layout

[Turborepo](https://turborepo.dev) + pnpm workspaces.

### Apps

- **`apps/web`** — full-stack web app ([TanStack Start](https://tanstack.com/start)) that stores
  recordings in Cloudflare R2 and serves the share pages. Deployed to Cloudflare Workers via
  [Wrangler](https://developers.cloudflare.com/workers/wrangler/).
- **`apps/web-extension`** — the capture extension ([WXT](https://wxt.dev) + React). See
  [`apps/web-extension/README.md`](apps/web-extension/README.md) for build, env config, and install.

### Packages

- **`packages/tailwind-config`** — shared Tailwind configuration.
- **`packages/typescript-config`** — shared `tsconfig` bases.

## Getting started

```sh
pnpm install
```

### Develop

```sh
pnpm dev                  # all apps
pnpm dev:web-extension    # extension only (WXT dev browser)
```

### Build, lint, type-check

```sh
pnpm build
pnpm lint
pnpm check-types
```

Filter to a single workspace with Turborepo, e.g. `turbo dev --filter=web`.

## Deploy

The web app deploys to Cloudflare Workers (requires Cloudflare auth — `wrangler login` or
`CLOUDFLARE_API_TOKEN`):

```sh
pnpm deploy:web                         # build + deploy apps/web to production
pnpm --filter=web run deploy:dev        # deploy to the development environment
```

Environments (worker name / R2 bucket) are defined in `apps/web/wrangler.jsonc`.
