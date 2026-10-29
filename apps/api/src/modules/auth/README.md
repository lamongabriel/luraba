# auth

The signed-in user: `/auth/me`, preferences and the provider list. Better Auth routes (`/api/auth/*`) are mounted separately and are not part of the REST contract.

## Rules

User-level (no household). Uses `createAuthenticatedHandler`. The profile picture is an upload attached to the `user` target (role `avatar`); `user.image` holds its content URL.

General module conventions: [../README.md](../README.md).
