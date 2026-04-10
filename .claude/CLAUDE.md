# Testing 

Run related test before committing with: 
- pnpm --filter=[packageName] check-types
- pnpm --filter=[packageName] lint
- pnpm --filter=[packageName] format

# Design

Always follow the design guidelines in `DESIGN_GUIDELINES.md` when writing UI code — colors, typography, spacing, border radius, shadows, and dark mode must use the defined tokens and patterns.

# Commit Rules

Always follow the commit conventions in `COMMITS.md` before creating any commit. This includes commit message format, scope, and type prefixes.