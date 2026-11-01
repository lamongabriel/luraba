# API keys

A key lets a script or an AI agent call the Luraba API **as you**. It has exactly your permissions:
the role you hold in each household (owner, admin, member, viewer; see
`packages/contracts/src/permissions.ts`) decides what it can do. A viewer's key can read but not
write. A key never gets more than its owner.

## Create a key

1. Sign in, open **Settings > API keys** and choose **Create key**.
2. Give it a label (for example "Claude Code on my laptop") and, optionally, an expiry date.
3. Copy the secret (`lur_...`) from the dialog. **It is shown once**; only a hash is stored. If you
   lose it, delete the key and create another.

From the same page you can rename a key, revoke it (the switch; flip it back to re-enable) or delete
it. Revoked, expired and deleted keys get `401` immediately.

## Use a key

Send it as a Bearer token (or in `x-api-key`):

```sh
curl -H "Authorization: Bearer $LURABA_API_KEY" \
     -H "X-Household-Id: <household id>" \
     http://localhost:3001/api/v1/categories
```

- **Which household:** the same rules as a session: the `X-Household-Id` header if present, else the
  household named in the route, else your default household. If you belong to several households,
  pick one with the header. A household you are not a member of returns `403`.
- **Rate limit:** 600 requests per minute per key; beyond that the API answers `429 RATE_LIMITED`.
- **Responses** use the normal API envelope (`{ data, meta }` / `{ error }`).
- Keys cannot manage keys: `/api/v1/api-keys` answers `403` to a key. Use your session.

## Security notes

- Treat a key like a password. Put it in an environment variable or a secrets manager, never in git
  (the repository ignores `.env` files).
- Prefer one key per tool and set an expiry. Revoke a key you no longer use.
- Secrets are hashed (SHA-256) at rest; list and update responses never contain the secret.
- The first characters of the key (for example `lur_ab12cd...`) are shown in the list so you can tell
  keys apart.
- Better Auth's own routes under `/api/auth/api-key/*` also exist; the app uses the REST endpoints
  above.
