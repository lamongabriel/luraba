# categories

Income/expense categories with optional parent, color and icon. **This is the reference module for
household-scoped CRUD**: routes -> controller -> service -> `CategoriesRepository`
(extends `HouseholdScopedRepository`) + `categories.query.ts` for list filters.

## Rules

- Names are unique per household (`ConflictError`).
- A child's `type` must equal its parent's; a category cannot be its own parent.
- Categories can carry an image attachment (`category` target, role `image`).

General module conventions: [../README.md](../README.md).
