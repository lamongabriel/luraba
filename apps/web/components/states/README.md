# Page states

Every data page and data section has three states built from shared parts, never inline:

| State | File next to `page.tsx` | Built from |
| --- | --- | --- |
| Loading | `_loading.tsx` | `KpiGridSkeleton`, `TableSkeleton`, `EntityCardGridSkeleton`, `CardSkeleton`, `Skeleton` |
| Error | `_error.tsx` | `ErrorState` (`components/error-state.tsx`), with a retry |
| Empty | `_empty.tsx` (lists) | `EmptyState` (`components/empty-state.tsx`), with a call to action when the user can create |

`DataBoundary` picks the state so a page never writes the `isPending / isError / empty` ladder:

```tsx
<DataBoundary
  isPending={query.isPending}
  isError={query.isError}
  isEmpty={items.length === 0}
  loading={<GoalsLoading />}
  errorState={<GoalsError message={query.error?.message} onRetry={() => void query.refetch()} />}
  empty={<GoalsEmpty onCreate={sheet.onOpen} />}
>
  ...loaded content...
</DataBoundary>
```

Detail pages (`[id]`) need `_loading.tsx` and `_error.tsx`; their loading file renders the whole
`InternalPageLayout` (title, back link) so the header never jumps.

## Loading skeletons match the page one to one

If the layout moves by a single pixel when data arrives, the page is wrong. Rules:

- Same grid, columns, gaps, card padding and row heights as the loaded page. Reuse the same
  constants (`KPI_CARD_MIN_HEIGHT`, the same `grid-cols-*`, the same `rounded-*`).
- Same number of KPI cards and table columns as the loaded page; `DataTableSkeleton` takes the
  column widths.
- Assume the page always has a vertical scrollbar; never size a skeleton to the viewport.
- Wrap loading output in `role="status"` with an `aria-label` (`LoadingRegion`, `KpiGridSkeleton`).
- Changed the loaded layout? Change its `_loading.tsx` in the same commit.

`test/conventions.test.ts` fails when a page that calls a `use*Query` hook lacks these files, imports
`Skeleton`/`ErrorState`/`EmptyState` directly, or defines a local KPI tile.
