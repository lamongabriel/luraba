# Brand and page metadata

The Luraba brand lives here and nowhere else: logo, colors, tagline and asset paths. **Do not hand-roll a
logo, hard-code "Luraba" styling, or write a page title string outside this module and `lib/metadata.ts`.**

## What exists

| File | Role |
| --- | --- |
| `constants.ts` | `BRAND` (name, tagline, description, colors), `BRAND_ASSETS` (paths under `public/`), `OG_IMAGE_SIZE`. |
| `mark-paths.ts` | The mark's path data (Hugeicons `Wallet03Icon`), shared by the component, `logo-mark.svg` and the generator script. |
| `brand-mark.tsx` | `BrandMark`: the icon. `variant="plain"` is `currentColor` only, `variant="tile"` is the tinted rounded tile. |
| `logo.tsx` | `Logo`: `variant` `full` / `mark` / `wordmark`, `tone` `default` / `mono`, `size` `sm` / `md` / `lg`. Used by the auth pages and the form error boundary. |

Light/dark: everything follows theme tokens (`bg-primary/12`, `text-primary`, `currentColor`). Use
`tone="mono"` on a surface where the tile does not fit.

## Page titles and metadata (mandatory)

Every `page.tsx` needs a title; `test/conventions.test.ts` fails otherwise. The root layout
(`app/layout.tsx`, via `rootMetadata()` in `lib/metadata.ts`) sets the title template
`%s | Luraba`, `metadataBase`, icons, manifest, default description, Open Graph, Twitter card and
`robots: noindex` (this is a private app). A page only states its name:

```tsx
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Transactions", // renders "Transactions | Luraba"
  description: "Income, expenses and transfers.", // optional, falls back to the app description
  path: "/transactions", // optional, og:url
});
```

`pageMetadata` rebuilds the full Open Graph and Twitter set, including the default image, because Next
replaces (not merges) those objects when a page sets its own.

- **Client pages** (`"use client"`) cannot export metadata: put the export in the `layout.tsx` in the
  same folder (create a pass-through layout if there is none). The test accepts the page or its
  same-folder layout only, so every page gets its own title.
- **Detail pages** (`[id]`): use a generic title (`Account`, `Goal`) or `generateMetadata` that calls
  `pageMetadata({ title: name })` when the name is cheaply available on the server. Record names
  need the user's session, so we use the generic form.
- Never write `"... | Luraba"` or `openGraph:` by hand in a page; the test rejects it.
- `app/robots.ts` disallows everything and there is no sitemap, on purpose.

## Assets

Generated, committed output:

- `app/favicon.ico` (16, 32, 48)
- `public/brand/`: `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180),
  `android-chrome-192x192.png`, `android-chrome-512x512.png`, `logo-mark.svg`
- `public/og/og-default.png` and `twitter-default.png` (1200x630; the same image, one file per
  card so they can diverge)
- The web manifest is `app/manifest.ts`, built from `BRAND` and `BRAND_ASSETS`.

Regenerate after changing the mark, colors or tagline in `constants.ts` / `mark-paths.ts`:

```bash
pnpm --filter @luraba/web brand:generate
```

The script is `apps/web/scripts/generate-brand-assets.mjs` (uses `sharp`, found in the pnpm store as a
dependency of Next). It reads `constants.ts` and `mark-paths.ts` directly, so there is one definition.
Text in the OG image uses the system sans-serif font available where the script runs.
