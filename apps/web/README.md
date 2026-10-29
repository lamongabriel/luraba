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

## Structure

| Folder | Role |
| --- | --- |
| `app/` | Next.js routes. `(app)` is the authenticated shell, `(guest)` login/signup, `(public)` invite previews. |
| `services/` | One file per API area. Thin functions over `requestContract(endpoint, ...)`; types come from `@luraba/contracts`. Multipart uploads are the one hand-written call (`uploads.service.ts`). |
| `queries/<area>/` | TanStack Query hooks plus a `xQueryKeys` object per area. |
| `mutations/<area>/` | `createAppMutationDefinition` + `useAppMutation` hooks (toasts and error handling built in); invalidate the area's query keys on success. |
| `components/<area>/` | UI by feature. `ui/` holds shadcn primitives; `forms/`, `side-panel/`, `data-table/`, `filters/` are shared building blocks. |
| `components/permissions/` | `PermissionButton`, `PermissionGuard`, `Can`, `useCan`: gate UI with the same `PERMISSIONS` the API enforces. |
| `config/`, `stores/`, `lib/`, `hooks/` | Env, zustand stores (auth session), pure helpers, shared hooks. |
| `api/` | The axios clients (sends cookies and the active `X-Household-Id`). |

Adding data to a screen: service function -> query hook (+ key) -> component; writes: mutation hook
that invalidates the key. Reusable file/attachment UI is documented in
[components/uploads/README.md](components/uploads/README.md).
