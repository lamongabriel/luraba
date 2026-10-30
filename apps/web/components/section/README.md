# components/section

The building blocks of section pages: areas with a page title on top, a left menu and cards beside
it. **Settings** (`components/settings/settings-layout.tsx`) and **Household**
(`components/households/household-layout.tsx`) are both built from these, so they always look the
same. A new area (or a new page in one) uses them too; do not hand-build cards or menus.

| Component | Use |
| --- | --- |
| `SectionLayout` | The shell: `title`, `subtitle`, optional `leading` (a picture before the title), `nav` (`SectionNavItem[]`, give the root item `exact`) and `navLabel`. Renders the page header, the left menu and the content column (cards stack with a 20px gap). |
| `SectionCard` | One section: a card with `title`, `description` and `actions` **inside** it, a divider, the content, and an optional `footer` (the Save button) behind another divider. Every card on these pages is one. |
| `SectionBlock` | A titled group inside a card (small heading + optional help). |
| `SectionFields` | Responsive grid (2 or 3 columns) for read-only `InfoItem`s or form fields. |
| `SectionRow` | Label and help text on the left, a control on the right; consecutive rows divide themselves. For toggles and per-item settings. |
| `SectionDivider` | A hairline between blocks inside a card. |

Pages inside a section area never render their own page title: every page is one or more `SectionCard`s (the title, description and actions live in the card; list pages put their toolbar and table in the card body). `InternalPageLayout compact` remains for pages outside these areas.

Pictures on these pages change by clicking them (`components/uploads/click-to-upload.tsx`).
