# Nexus audit: filters and overlays

Compared against Nexus (`staging`, read only): `ui/bottom-sheet.tsx`, `ui/responsive-drawer.tsx`,
`ui/portal-container.tsx`, the Popover/DropdownMenu/Select wrappers, `overlay-guard.test.ts`,
`docs/ui-theme.md` ("Drawers and menus on mobile") and `components/query-filters`.

## What Nexus does well

- One breakpoint and one hook (`useIsMobile`, 768px) decide every overlay, inside the primitives; features never
  check the width.
- A single mobile shell (`BottomSheetContent`) that every overlay renders through: drag handle, 90dvh, safe area.
- Wrappers swap Popover, DropdownMenu and Select to that shell, with a `desktopOnly` opt-out.
- A portal container so popups opened inside a drawer still work under the modal's `pointer-events: none`.
- A `scrim` colour token for backdrops.
- A guard test with a shrink-only allowlist of raw overlay imports.
- Filters: the date range is the first, permanent row, separate from the removable filter tree; mobile is a
  screen-by-screen drawer.
- Documentation of the whole pattern in one place, with an explicit "not a drawer on purpose" list.

## Adopted in Luraba

- `use-mobile`, `bottom-sheet`, `portal-container`, the Popover/DropdownMenu/Select swap, `desktopOnly`,
  tooltip/hover-card never open on mobile (`components/ui`, see its README).
- `MobileSheetContent` shared by Dialog, Sheet and Modal (Luraba's own wrapper; it replaces Nexus's
  `ResponsiveDrawer`, because Luraba's Dialog/Sheet/Modal already carry the desktop look).
- Filters: `components/filters` with the fixed, non-removable date filter and the mobile drawer.
- `bg-scrim` token for every backdrop.
- Conventions test: no raw Radix/vaul overlays, raw Sheet/Dialog allowlists that only shrink, no hand-painted
  backdrops, `keepSideOnMobile` only for the sidebar.
- The app sidebar stays a slide-in sidebar on mobile; the user menu inside it is a bottom drawer.

## Left

- `ResponsiveDrawer` Header/Title/Footer parts and `useDrawerPresentation()`: Luraba uses `max-md:` classes on
  `ModalHeader`/`ModalFooter` and `DialogFooter` instead. Extract the same parts if a third overlay shape appears.
- Six feature files still import the raw `Dialog` (mobile-aware, listed in `conventions.test.ts`); migrate them
  to `Modal` over time.
- Confirmations are bottom drawers here (Nexus keeps a centred dialog); revisit if the owner prefers Nexus.
- Base UI popups (ReUI cascader) are desktop only; mobile filters use the custom drawer.
- Nexus's `QUERY_CONTROL_CLASS` (one class for toolbar controls) and its theme token guard tests have no
  Luraba equivalent yet. Luraba has a single dark theme, so there is no light mode to audit.

## Transactions page and filters port (second pass)

Ported from Nexus `components/query-filters` (read, not copied verbatim; Luraba keeps its data layer):

- `filter-bar.tsx`: one toolbar row like `QueryToolbar`: search and the "Filter" button (ReUI add-filter popover) on the left, date filter, Clear and the "Actions" menu on the right; chips wrap on their own line.
- `fields.tsx`: Nexus operator catalogs per kind (is any of / is none of / is / is not; equals, greater/less than, at least/most, between; date is / before / after / on or before / on or after / between), an icon on every field, fields with no options dropped. API: new `exclude*` params on the transactions feed so negations are exact.
- `actions-menu.tsx`: Actions holds only Columns (no filters in it).
- `date-filter.tsx`: one short label, capped width; phone = bottom drawer with a vertical preset list, range calendar and a fixed Apply footer.
- `mobile-filters.tsx`: Nexus's screen-by-screen drawer (list, field, condition, value), fixed header and footer.
- `side-panel.tsx` / `ui/sheet.tsx` / `forms/form-actions.tsx`: fixed header, scrolling body, fixed footer in every drawer; 44px full-width submit on phones.
- Transactions layout: two columns from 1400px (breakdown, then upcoming below it), single column below; Type column only from 2xl; Merchant/Created by hidden by default.

Not done: conventions test/READMEs update, unit tests for the new operators, 900/1100px and 375/390px full sweeps, light-mode check.

## Page header, month select and card faces (header redesign)

Compared against Nexus `components/page-header/*`, `navigation/page-header.tsx`, `analytics/kpi-inline.tsx`,
`ui/date-range-picker.tsx` and `query-filters/control.ts`.

Ported, file by file:

- `page-header/header-tools.tsx` + `navigation/page-header.tsx` -> `components/finance/page-header.tsx` (title left; kpis,
  controls and actions on one right-aligned row; kpis drop under the title on a phone) and `finance/header-actions.tsx`
  (`HeaderAddButton`, `HeaderButton`: one shared control size, icon-only circles on a phone, permission aware).
- `analytics/kpi-inline.tsx` -> `components/kpi/kpi-inline.tsx` (`KpiInline`, `KpiInlineSkeleton`); the Goals page uses it
  for "Total saved" and "Active goals".
- `ui/date-range-picker.tsx` (presets beside the picker, one control height, icon-only on a phone) -> `finance/month-select.tsx`,
  replacing `MonthPicker`, `MonthSelector` and `MonthPresetButton`.
- `query-filters/control.ts` (one class for toolbar controls) -> `HEADER_CONTROL_CLASS`.

Left: Nexus's "More" overflow menu for more than three actions and `HeaderMobilePortal`; the conventions test guards the
actions instead. Pages still hand-building actions: Account detail, Bill detail, Transactions (listed in the test).
