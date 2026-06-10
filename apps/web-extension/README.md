# Ingfo — Browser Extension

The Ingfo capture extension, built with [WXT](https://wxt.dev) + React. It records the screen
while capturing network requests, console logs, and browser/session info, then uploads everything
to the Ingfo web app and returns a shareable link for debugging and bug reports.

## Development

```bash
pnpm --filter=web-extension dev          # Chrome, dev server on port 5434
pnpm --filter=web-extension dev:firefox  # Firefox
```

WXT launches a browser with the extension auto-loaded and hot-reloads on change.

## Configuration

The extension talks to the web app via `WXT_API_BASE_URL` (see `lib/api-config.ts`). It defaults
to `http://localhost:5433` when unset.

Set it through WXT's env files (Vite precedence, highest wins):

| File                   | Loaded in     | Use for                          |
| ---------------------- | ------------- | -------------------------------- |
| `.env.production`      | builds only   | production / personal build URL  |
| `.env.local`           | dev + build   | local dev override (localhost)   |
| `.env`                 | all           | shared defaults                  |

> **Gotcha:** `.env.local` overrides `.env`. For production builds, put the URL in
> `.env.production` (mode-specific files beat generic ones) so it wins over a localhost
> `.env.local` without affecting `pnpm dev`.

Example `.env.production`:

```
WXT_API_BASE_URL=https://your-app.workers.dev
```

`WXT_API_BASE_URL` also feeds the manifest's `host_permissions` (see `wxt.config.ts`), so uploads
to the configured origin are allowed automatically. All `.env*` files are git-ignored.

## Build & install (unpacked)

```bash
pnpm --filter=web-extension build          # Chrome → .output/chrome-mv3
pnpm --filter=web-extension build:firefox  # Firefox → .output/firefox-mv2
pnpm --filter=web-extension zip            # zip for store upload
```

To install your personal build in Chrome:

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked**.
3. Select `apps/web-extension/.output/chrome-mv3` (press <kbd>⌘⇧.</kbd> in the macOS file
   dialog to reveal the hidden `.output` folder).

After editing env or code, rebuild, then hit the ↻ refresh icon on the extension card to reload.
Share URLs are stamped at recording time, so record a **new** clip after changing the API URL.
