# Design language

How Luraba pages look and are laid out. Read this before building or changing any page in
`apps/web`. It was written from the owner's page-by-page review; the account detail page is the
reference for the direction ("much more integrated than a bunch of cards").

Components, tokens and the data layer are documented in their own READMEs. This file is about
**composition**: what goes where, how much space, and what to avoid.

## 1. Principles

1. **Page content, not boxes.** A page is a flow of sections on the page background. Sections are
   separated by whitespace and a thin divider (`border-border/60`), not wrapped in cards.
2. **A card is the exception.** Use a bordered panel only where it earns its place: a chart that needs
   a frame, a form, a drawer. Never a card inside a card, never a table inside a card, never a card
   whose only content is a restatement of another section.
3. **One idea per section, in order of importance.** Header, then the headline number, then the
   thing the user came to do or see (the list, the table, the budgets), then supporting charts, then
   reference details. The most important content is visible without scrolling on a laptop.
4. **Every cell has content.** No empty halves, no column that ends far above its neighbor. If one side
   is short, add something useful to it or restructure the grid (see section 3).
5. **Use the screen.** Do not stretch a single control across the full page width (a one-line bar the
   width of the page is almost always wrong). Side by side beats stacked when each part is compact.
6. **Breathing room.** Sections are visibly separate: see the spacing scale below. "Too glued to the
   KPIs" is a bug.
7. **Say each fact once.** If a number, date or status is shown in one place, do not repeat it in an
   accordion, a summary card or a tooltip-only twin.
8. **Reuse, then extend.** Search `components/` before building (see AGENTS.md). Extend the shared
   component so every page benefits.

## 2. Page anatomy

```
PageHeader        title + subtitle on the left; ONE period/month control and the page actions
                  (Edit, Add) on the right, aligned on the same row
Hero / headline   the number or object the page is about, large, directly on the page
Stat strip        3 to 5 slim figures separated by hairlines (`KpiStrip`), no background, no card
Main body         a 12-column grid: usually 8 + 4 (main content + a rail)
Supporting        charts and breakdowns, compact, beside or under the main body
Reference         details (labeled definition grid), shown once, lowest priority
```

- The **period control** is the fixed date filter chip (`useDateFilter`, see `components/filters`): always applied, editable, never removable. Never two ways to pick the same date. If a filter can
  be changed, provide a one-click reset (a "Today" or "This month" button).
- The **hero** is plain type with a delta chip, not a card. A chart sits directly under it.
- The **stat strip** is exactly as it is today: slim, hairline dividers, no tinted background (the
  owner likes it; do not add background colors to KPIs).
- Detail/definition blocks use a labeled grid (label above value) with no card chrome. Do not add a
  "Details" card that only repeats a subtitle.

## 3. Layout and balance

- Default desktop grid is **8 / 4**. Pick the split by content, not by habit.
- When two columns sit side by side they should end at roughly the same height. Techniques: stretch
  the grid (`items-stretch`) and let the shorter column fill with a useful block (upcoming items,
  limits, a compact chart, a short list); make a rail sticky only if it is shorter than the viewport.
- Prefer a compact **donut or segmented bar next to a list** over a full-width horizontal bar.
- A page with two zones is fine: for example a wide zone (8 columns) and a narrow zone (4 columns),
  each with its own rhythm. Do not mix a dozen different widths.
- Tables sit directly on the page, full width of their zone, with the shared table component. A
  small "recent items" list (5 rows, no sorting or filters) is the right summary when the full table
  lives on another page; link to it with "View all".
- Mobile: single column in the same order. Nothing may require horizontal page scroll.

## 4. Spacing scale

Use the same rhythm everywhere. Tailwind values, adjust only with a reason.

| Between | Space |
| --- | --- |
| Page header and first content | `mt-6` to `mt-8` |
| Stat strip and the next section | `mt-8` to `mt-10` (never flush against it) |
| Major sections | `space-y-10` (`gap-10` in grids) |
| A section title and its content | `mt-4` |
| Items inside a list or group | `gap-3` to `gap-4` |
| Columns in the grid | `gap-8` (`gap-10` on wide screens) |

Section titles: `Typography` heading, no card header unless the content really is a card. Use the
shared `PageSection` for title + description + actions + content.

## 5. Charts

- Charts come from `components/charts` only (AGENTS.md rule). Extend the library when a type is
  missing (gauge, ring, sparkline), do not hand-roll.
- A chart must be **readable at its size**: if its labels, ticks or bars are too small to read, it is
  too small or has too many points. Minimum height 200px for a plot with axes; use a sparkline or a
  ring when there is no room for axes. Reduce the number of ticks instead of squeezing them.
- **Legends:** where space is tight, no permanent legend: the legend appears on hover/focus (tooltip
  with name, amount and percent), the way mobile banking apps do. Where there is room, a short
  legend list beside the chart is better than a legend under it.
- Series colors from the theme chart tokens, with distinct hues, never a single-color donut.
- Always provide loading (matching skeleton), error with retry, and empty states (built in).

## 6. Editing in place

- Editing a single value (a budget limit, a name, a category assignment) happens **in place**: click
  the value, edit inline, press Enter or blur to save, Escape to cancel. Do not open a side sheet
  to change one number.
- Use sheets for creating records and for forms with several fields. Sheets keep their content
  mounted until the exit animation ends (see `apps/web/README.md`).
- Destructive actions live inside the edit experience and always ask for confirmation.

## 7. States and skeletons

- Every page and section has loading, error (retryable) and empty states from `components/states`.
- The skeleton matches the loaded layout one to one (same grid, heights, rows); nothing shifts when
  data arrives.
- Never nest a `<div>` inside a `<p>`: skeleton placeholders inside text containers must render as
  `span`s or the container must be a `div` (it causes hydration errors).

## 8. Content rules

- English only; American names, banks and amounts in examples (AGENTS.md rule 11).
- Labels are short nouns. Do not show internal categories like "Other" without context: if a bucket
  is system generated, say what it holds ("Uncategorized").
- Show people-facing identifiers (institution, last four digits, account name), never record
  creators unless the page is about who created something.
- Money, numbers, dates and inputs follow [formatting.md](formatting.md).

## 9. Checklist before you call a page done

- [ ] No card inside a card, no table inside a card, no card that repeats another section.
- [ ] One period control, with a reset; aligned with the page actions.
- [ ] Headline number is plain type; stat strip has no background; at most 5 figures.
- [ ] Spacing follows the scale; sections are visibly separate.
- [ ] Both columns are balanced; no empty half; nothing a single full-page-wide line.
- [ ] Charts come from `components/charts`, are readable, hover legend where space is tight.
- [ ] Single-value edits happen in place; sheets for the rest.
- [ ] Skeleton matches the loaded page; error and empty states exist; no `div` in `p`.
- [ ] Title via `pageMetadata`; sidebar item highlighted on nested routes.
- [ ] The nearest README describes the page structure.
