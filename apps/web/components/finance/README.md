# finance (page shell)

## PageHeader standard

Every page renders its title through `InternalPageLayout` -> `PageHeader` (ported from Nexus's `PageHeader` + `HeaderTools`).
Title and subtitle on the left; the header tools on the **same row, right-aligned**, at every width:

```tsx
<InternalPageLayout
  title="Budgets"
  subtitle="Monthly limits by category"
  controls={<MonthSelect value={month} onChange={setMonth} timezone={tz} language={lang} />}
  actions={<HeaderAddButton label="Add budget" permission={PERMISSIONS.BUDGETS_UPDATE} onClick={open} />}
  kpis={[{ label: "Total saved", value: <CombinedAmountDisplay ... size="sm" /> }]}
  kpisLoading={isPending}
  kpiLabels={["Total saved"]}
/>
```

- `controls`: what picks the data (`MonthSelect`). First in the group.
- `actions`: `HeaderButton` (secondary, outlined) and, last, `HeaderAddButton` (primary, at most one). Both take
  `permission`. Never a hand-built `Button` (enforced by `test/conventions.test.ts`; its allowlist only shrinks).
- All controls share `HEADER_CONTROL_CLASS`: 32px pills with icon + label from `md`; below `md` 36px circles, icon
  only (label stays as accessible name).
- `kpis`: one or two `KpiInlineItem`s left of the group on desktop (divider between), a row under the title on a phone.
  No tiles below the title. While loading pass `kpisLoading` + `kpiLabels` (skeletons, no shift).
- `mobileActions` is legacy (Transactions) and not for new pages.

## Month select

`MonthSelect` is the only month control (popover with presets + month/year grid on desktop, bottom drawer on mobile;
icon-only circle on a phone). `useMonthFilter()` keeps `?month=YYYY-MM` in the URL. Used by Credit cards (and its
detail page), Budgets and Bills.
