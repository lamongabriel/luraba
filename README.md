# Luraba

Luraba is an open-source personal finance app focused on the credit card money management.

The project is early and moving quickly. Public releases are tracked with GitHub Releases, semantic tags, and an automated changelog.

## Repository

- `api`: Express, TypeScript, Drizzle, PostgreSQL
- `ui`: Next.js, React, TypeScript

## Development

Setup documentation is still being written. For now, use the package scripts in each workspace:

```sh
pnpm install
pnpm --filter ./api dev
pnpm --filter ./ui dev
```

## Releases

Releases are managed by Release Please from Conventional Commits.

- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Releases: https://github.com/lamongabriel/luraba/releases

## License

Luraba is released under the [MIT License](./LICENSE).
