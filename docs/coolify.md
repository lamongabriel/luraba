# Deploy with Coolify

[`compose.coolify.yaml`](../compose.coolify.yaml) builds Luraba from this
repository and runs Postgres, migrations, the API, the web app, and a small Caddy
gateway. Coolify handles the public domain and HTTPS. The gateway serves the web
app and `/api/*` on the same origin, so browser requests and auth cookies work
with one domain. `/health` reaches the API health check.

## Setup

1. In Coolify, create an application from this Git repository and choose the
   **Docker Compose** build pack. Use Coolify **v4.0.0-beta.411 or newer**, which
   supports generated service variables for Git sources.
2. Set the base directory to `/` and the Docker Compose location to
   `/compose.coolify.yaml`. Leave **Raw Compose Deployment** disabled so Coolify
   processes the generated variables and service settings.
3. Load the Compose file, then assign your public HTTPS origin (for example,
   `https://finance.example.com`) to the **luraba** service in **Domains**. Leave
   the other services without public domains. Use the default isolated network;
   this stack resolves its internal services by their Compose names.
4. Add email or OAuth credentials only if you want those features, then deploy.
   Coolify generates the database and application secrets. No repository `.env`
   files or manually entered database credentials are needed.

The service domain is the single source for the public URL. Coolify supplies
`SERVICE_URL_LURABA` from that domain; Compose passes it to the API as both
`BASE_URL` and `FRONTEND_ORIGIN`, and to the web build as `NEXT_PUBLIC_API_URL`.
You do not configure these app variables separately.

The database name is fixed at `luraba_db`. Postgres and the API receive the same
generated username and password. `POSTGRES_USER`/`DB_USER` and
`POSTGRES_PASSWORD`/`DB_PASSWORD` are the names each container expects; each pair
receives one shared value from Coolify, with no separate credential inputs.

The gateway listens on port 80 internally, which Coolify routes automatically
from its assigned domain. The API, web app, and database use fixed internal
ports and publish no host ports. There are no application port settings to fill
in.

The database must become healthy and migrations must finish successfully before
the API and web app start. The migration service uses Coolify's
`exclude_from_hc: true` setting because it exits after completing its work.

This file uses local build contexts and is intended for a Git application, not
the paste-only service-stack workflow. It does not require published Docker Hub
images. See [Coolify's Compose documentation](https://coolify.io/docs/knowledge-base/docker/compose)
for variable generation, domains, and deployment settings.

## Generated configuration

Coolify generates and stores the following values. References to the same
variable share one value across the services.

| Coolify variable | Used by Luraba |
| --- | --- |
| `SERVICE_URL_LURABA` | All public URLs; derived from the **luraba** service domain. |
| `SERVICE_USER_POSTGRES` | Database username for Postgres, migrations, and API. |
| `SERVICE_PASSWORD_64_POSTGRES` | Database password, 64 alphanumeric characters. |
| `SERVICE_PASSWORD_64_AUTH` | `AUTH_SECRET`, 64 alphanumeric characters. |
| `SERVICE_HEX_64_INTEGRATIONS` | `INTEGRATIONS_ENCRYPTION_KEY`, exactly 64 hexadecimal characters for AES-256 encryption. |

Keep the generated credentials across deployments. Back up the integration
encryption key alongside the database: existing encrypted integration credentials
require the original key. Changing the Postgres password variable alone does not
change the password inside an already initialized database volume.

`NEXT_PUBLIC_API_URL` is compiled into the web image from the service URL, so
changing the domain requires a rebuild and redeploy. The public URL is the only
application setting passed as a Docker build argument; credentials are runtime
environment variables. Internal ports, database host, and `DB_SSL=false` are
already wired for the bundled Postgres service.

## Clean up an existing Coolify resource

If you previously loaded `compose.yaml`, or a version that asked for `BASE_URL`,
switch the Compose location to `/compose.coolify.yaml` and reload the file.
Remove these old entries from the resource's saved environment variables if
they are still present:

```text
DB_NAME
DB_USER
DB_PASSWORD
BASE_URL
API_PORT
FRONTEND_ORIGIN
WEB_PORT
NEXT_PUBLIC_API_URL
POSTGRES_PORT
```

The Coolify file does not read these as configuration inputs. Keep the existing
`SERVICE_USER_POSTGRES`, `SERVICE_PASSWORD_64_POSTGRES`,
`SERVICE_PASSWORD_64_AUTH`, and `SERVICE_HEX_64_INTEGRATIONS` values; these are
the generated credentials that the stack uses. Set the service domain once and
rebuild/redeploy.

## Optional settings

The Compose file exposes these variables in Coolify's environment editor.

| Variable | Default / purpose |
| --- | --- |
| `LOG_LEVEL` | `info`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Empty; set both to enable Google sign-in. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Empty; set both to enable GitHub sign-in. |
| `SMTP_PROVIDER` | `resend`; provider label. |
| `SMTP_HOST` | `smtp.resend.com`. |
| `SMTP_PORT` | `465`. |
| `SMTP_SECURE` | `true`; use `false` for providers that use STARTTLS on port 587. |
| `SMTP_USERNAME` | `resend`. |
| `SMTP_PASSWORD` | Empty; enter your provider's SMTP password or API key. |
| `SMTP_FROM_NAME` | `Luraba`. |
| `SMTP_FROM_EMAIL` | Empty; enter a sender address accepted by your provider. |
| `SMTP_REPLY_EMAIL` | Empty; optional reply-to address. |
| `SMTP_TLS_CIPHERS` | Empty; optional TLS cipher override. |

Email stays disabled until its required settings are supplied. The defaults suit
Resend; replace the SMTP settings as needed for another provider. OAuth and SMTP
credentials must come from their providers—Coolify cannot generate them.

Register these OAuth callback URLs, replacing the example origin with yours:

- Google: `https://finance.example.com/api/auth/callback/google`
- GitHub: `https://finance.example.com/api/auth/callback/github`

Brandfetch credentials are saved through Luraba's integration settings, not an
environment variable. The generated integration encryption key protects those
stored credentials; it is not a provider API key.

## Operations

- Inspect the **migrate** logs if deployment stops before the API starts.
- Postgres data persists in the `postgres_data` volume. Preserve it during
  upgrades and back up the database before deploying changes.
- Only **luraba** needs a Coolify domain. No service publishes a host port; the
  database, API, and web app remain on the stack's internal network.
- This file contains Coolify-specific service settings. For ordinary Docker
  Compose outside Coolify, use [`compose.yaml`](../compose.yaml) and the
  [deployment guide](deployment.md).
