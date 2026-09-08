# Contributing to Luraba

Thanks for contributing. Please read the [Code of Conduct](CODE_OF_CONDUCT.md)
before participating.

## Development workflow

Follow the [local setup guide](docs/development.md), create a focused branch,
and use the root commands to validate the whole workspace:

```sh
pnpm fix
pnpm verify
```

Use package-local commands through pnpm filters when iterating on one area.
Do not commit generated output, local environment files, or database volumes.

## Commits and pull requests

Luraba uses Conventional Commits. Use a concise imperative title, such as:

```text
feat(transactions): support receipt attachments
fix(api): reject malformed invitation tokens
docs(contributing): clarify migration policy
```

Use one focused pull request, explain user-visible changes, include tests for
behavior changes, and ensure its title passes commitlint. Squash merge is the
default so the pull-request title becomes the release input.

## Database and dependencies

- Create an immutable Drizzle migration for every schema or required reference
  data change. Never alter an applied migration.
- Required product data belongs in a migration; mock data remains optional.
- Keep public HTTP schemas in `@luraba/contracts`, framework-free financial
  logic in `@luraba/domain`, persistence/service internals in the API, and UI
  state in the web app.
- Add a dependency only to the package that imports it. Runtime dependencies
  belong in `dependencies`; build/test/CLI tooling belongs in `devDependencies`.

## Releases

Release Please owns versions and `CHANGELOG.md`. Luraba has one product version:
the root, API, web, contracts, and domain manifests are updated together. Do
not manually bump versions for normal changes.
