# Deployment

Luraba ships a production-style `compose.yaml` at the repository root.
It starts the database, executes migrations once, then starts the API and web
services after their dependencies are healthy.

For Coolify, use [`compose.coolify.yaml`](../compose.coolify.yaml) and the
[Coolify deployment guide](coolify.md) for generated secrets and one-domain
routing.

## Start the stack

```sh
cp apps/api/.env.example apps/api/.env
# Set production secrets, BASE_URL, and FRONTEND_ORIGIN in apps/api/.env.
docker compose up --build -d
```

The default public ports are web `3000` and API `3001`; Postgres is bound only
to `127.0.0.1:5432`. Set `WEB_PORT`, `API_PORT`, or `POSTGRES_PORT` in the
shell or a deployment environment to change host bindings.

The bundled Postgres service uses `DB_SSL=false`. Set `DB_SSL=true` only when
pointing Luraba at an external database that requires TLS.

`NEXT_PUBLIC_API_URL` is compiled into the web image. Set it to the public API
origin before `docker compose build` when the browser reaches the API through a
domain, proxy, or non-default port.

## Operations

- Review migration output with `docker compose logs migrate`.
- Stop the stack with `docker compose down`; use `-v` only when intentionally
  discarding database data.
- Back up the Postgres volume or database before upgrades.
- Place TLS termination and public routing behind a reverse proxy appropriate
  for the deployment environment.
