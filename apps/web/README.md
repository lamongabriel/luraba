# Luraba Web

The `@luraba/web` workspace is Luraba's private Next.js application. It owns
React components, shadcn primitives, browser state, and page-specific UI code.

Run focused commands from the repository root:

```bash
pnpm --filter @luraba/web dev
pnpm --filter @luraba/web check
pnpm --filter @luraba/web typecheck
pnpm --filter @luraba/web test:unit
pnpm --filter @luraba/web build
```

Shared HTTP contracts come from `@luraba/contracts` and framework-free finance
helpers come from `@luraba/domain`. Keep API persistence and server-only
authorization logic in `apps/api` instead of importing it into this workspace.
