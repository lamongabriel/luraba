# households

Households, members and roles, invitations (token, accept, reject, resend) and lifecycle (`households.lifecycle.ts`).

## Rules

Deleting a household cascades in the database; `deleteHousehold` first collects its upload object keys and removes the bucket objects afterwards (see `uploads/README.md`). `households.access.ts` holds membership checks. The household logo is an attachment (`household` target, role `logo`).

General module conventions: [../README.md](../README.md).
