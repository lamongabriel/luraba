# Contributing

Thanks for helping make Luraba better.

## Commit Messages

Luraba uses Conventional Commits. Commit messages and squash-merge PR titles should follow this shape:

```text
type(scope): short description
```

Examples:

```text
feat(api): add transaction tags
fix(fx): use exact frankfurter date
docs(readme): add setup notes
ci(github): add release automation
```

Use `feat:` for user-facing additions, `fix:` for bug fixes, and `BREAKING CHANGE:` in the footer for incompatible changes.

## Pull Requests

- Keep PRs focused.
- Make the PR title a valid Conventional Commit.
- Run the relevant checks before opening a PR.

```sh
pnpm --filter ./api lint
pnpm --filter ./api typecheck
pnpm --filter ./api test:unit
pnpm --filter ./api test
```

## Releases

Releases are automated with Release Please.

- Normal PRs land on `main`.
- Release Please opens or updates a release PR.
- The release PR updates package versions and `CHANGELOG.md`.
- Merging the release PR creates a `vX.Y.Z` tag and GitHub Release.

Do not manually edit package versions for normal releases.
