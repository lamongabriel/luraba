# integrations

Third-party credentials, currently Brandfetch. Secrets are encrypted with `INTEGRATIONS_ENCRYPTION_KEY` (`integration-crypto.ts`).

## Rules

Never return a stored secret; responses only say whether one is set.

General module conventions: [../README.md](../README.md).
