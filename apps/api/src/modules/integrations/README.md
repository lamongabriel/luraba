# integrations

Third-party credentials, currently Brandfetch. Secrets are encrypted with `INTEGRATIONS_ENCRYPTION_KEY` (`integration-crypto.ts`).

## Rules

Never return a stored secret; responses only say whether one is set.

General module conventions: [../README.md](../README.md).

## UI

`/household/integrations` (`apps/web/components/integrations/`): one section per provider with its status, a form to
connect (saving verifies the credential with the provider), Replace and Remove. Permissions: `integrations.read` to see
the page, `integrations.update` to save, `integrations.delete` to remove (owners and admins). The secret is never
returned or shown again. A new provider adds its endpoints, its entry in `apps/web/lib/integrations.ts` and its card.
