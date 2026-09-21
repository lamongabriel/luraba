---
name: luraba-start-ticket
description: Start and deliver a Luraba GitHub issue through an explicit, safe development workflow. Use when the user says "start ticket", "work on LURABA-<n>", "work on issue #<n>", or invokes $luraba-start-ticket.
---

# Luraba Start Ticket

Drive one Luraba GitHub Issue from read-only issue context to an optional PR against `main`.

Luraba is a pnpm + Turborepo monorepo. Its product areas are:

| Workspace | Path | Responsibility |
| --- | --- | --- |
| `@luraba/web` | `apps/web` | Next.js UI, browser state, and API services |
| `@luraba/api` | `apps/api` | Express API, authentication, database, migrations |
| `@luraba/contracts` | `packages/contracts` | Public HTTP schemas and wire types |
| `@luraba/domain` | `packages/domain` | Framework-free finance and date primitives |

## Rules

1. Never commit, push, create a PR, enable auto-merge, or merge unless the user explicitly chooses that action.
2. Treat GitHub Issues as read-only. Fetch their context; do not edit or comment on them.
3. Never force-push, rewrite shared history, delete branches, or stage with `git add -A`.
4. Keep every change within the selected issue's scope. Do not fix unrelated pre-existing failures.
5. Use the `i-have-adhd` output conventions for this workflow. If it is available but not active, invoke it at the start.

## 1. Resolve the issue

Accept a GitHub Issue number (`42`, `#42`), URL, or `LURABA-42`. Normalize to both `#42` and `LURABA-42`.

If no number was given, ask for it. Fetch read-only context from the Luraba repository:

```bash
gh issue view <number> --repo lamongabriel/luraba --json number,title,body,labels,assignees,url,closed,state
```

The issue must be open and have a title plus enough description to identify the work. If the body is blank or ambiguous, ask the user to paste acceptance criteria; do not infer requirements from the issue title.

## 2. Prerequisite gate

Run:

```bash
git --version
gh --version
gh auth status
pnpm --version
git status --porcelain
```

`gh` requires access to `lamongabriel/luraba`. A non-empty working tree is a stop condition: show the affected paths and offer a lettered menu to inspect, stash, let the user resolve it, or abort. Do not stash without an explicit choice.

Use Docker only when the chosen checks require it. For full integration tests, verify Docker Compose is available before starting it.

## 3. Confirm scope and base

Summarize the issue in a few lines, state its acceptance criteria, and name the likely workspace(s) with reasons. Ask the user to confirm or correct the scope before code changes.

`main` is the default base and PR target. Fetch it and inspect open PRs before branching:

```bash
git fetch origin --prune
gh pr list --repo lamongabriel/luraba --base main --state open --json number,title,headRefName,author,url
```

If an open PR is a declared dependency or overlaps the work, offer `main`, that branch as a stacked base, or viewing its diff. Otherwise branch from `origin/main`.

## 4. Create the branch

Create the branch before code changes:

```text
<type>/LURABA-<number>-<short-kebab-description>
```

Derive `<type>` from the issue labels and intent: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, or `ci`. Keep the description lowercase, specific, and 3–6 words. Example: `feat/LURABA-42-transaction-receipt-attachments`.

```bash
git switch --create <branch> origin/<base>
```

## 5. Plan gate

Before editing, offer:

- **A)** Plan first — switch to plan mode and resend the request
- **B)** Code directly — recommended for a small, clear issue
- **C)** Show the complete issue context

On A, do not write code. The branch can remain checked out.

## 6. Implement by ownership

Follow the existing module pattern and preserve package boundaries:

- Public REST schemas, request/response types, and endpoint definitions belong in `@luraba/contracts`.
- Framework-free money, date, classification, and recurrency logic belongs in `@luraba/domain`.
- Persistence, authorization, routes, services, and immutable Drizzle migrations belong in `@luraba/api`.
- Pages, client state, forms, and contract-backed API services belong in `@luraba/web`.

For database or required reference-data changes, add a new immutable Drizzle migration. Never rewrite an applied migration. Keep `.env`, `.env.local`, credentials, generated `dist`, and database volumes out of commits.

### Web UI loop

Run this loop only when an issue changes `apps/web` user-visible behavior or visuals. It is not required for API-only, contract-only, or domain-only work.

1. Before implementation, consult `composition-patterns` for reusable component/API structure and `react-best-practices` for React/Next.js performance.
2. Add view transitions only when they communicate a real relationship, such as list-to-detail navigation or content entering after a load. If applicable, follow `react-view-transitions`; do not add decorative route slides.
3. Run the web app and inspect the changed flow at a narrow mobile width and desktop width. Check loading, empty, error, keyboard focus, and the main success state where applicable.
4. Review the changed web files with `web-design-guidelines`. Fetch its current guideline source as that skill requires, then repair in-scope issues and re-check.
5. Repeat inspection and review after repairs, with at most two repair passes. If an issue remains, report its impact and ask the user how to proceed rather than widening scope.

Use a managed background-process facility for long-running development servers and stop every server you start. If visual inspection cannot run in the current environment, say what could not be verified and provide the exact local command.

## 7. Verify proportionally

Use the narrowest meaningful checks first:

```bash
pnpm --filter @luraba/web test:unit
pnpm --filter @luraba/web typecheck
pnpm --filter @luraba/api test:unit
pnpm --filter @luraba/api test:integration
pnpm --filter @luraba/contracts test:unit
pnpm --filter @luraba/domain test:unit
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

For a full pre-PR pass when practical, use `pnpm verify`. `pnpm test` starts Postgres and includes API integration tests, so it needs Docker and the project environment configured.

If a check fails, state the command, relevant output, whether it reproduces on the base branch, and the proposed next action. You may repair a failure caused by the issue work; do not repair unrelated failures unless asked.

## 8. Post-work menu

When implementation and relevant verification are complete, state that nothing is committed and offer:

- **A)** Commit — first show a numbered commit plan for approval
- **B)** Commit and push the branch
- **C)** Commit, push, and open a PR into `main`
- **D)** Show the diff
- **E)** Keep working without committing

Recommend one option with a reason. Re-present remaining relevant choices after each action.

### Commit and PR rules

For A/B/C, first propose explicit file groups and Conventional Commit messages. Use a product-area scope when it helps, such as `feat(web): add receipt attachments`; do not invent a ticket scope. Stage each approved group by path and inspect `git diff --staged` for secrets, environment files, and debug output.

For C, create the PR only after the user approves the commit plan:

```bash
git push --set-upstream origin <branch>
gh pr create --repo lamongabriel/luraba --base main --head <branch> --title "<type>(<scope>): <subject>" --body-file <tmp>
```

Follow `.github/PULL_REQUEST_TEMPLATE.md`. The PR body should summarize the user-visible impact, link `Closes #<number>`, list verification actually run, and mention any unverified visual state or stacked parent branch. Do not set reviewers, labels, or auto-merge unless asked.
