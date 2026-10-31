/** Single source of truth for the Luraba brand. Change it here and the app, favicons and OG image follow. */
export const BRAND = {
  name: "Luraba",
  tagline: "Self-hosted personal finance",
  description:
    "Luraba is a self-hosted personal finance workspace for accounts, cards, budgets, goals and investments.",
  /** Dark brand surface (matches `--background`). */
  background: "#141414",
  /** Brand ink (matches `--primary`). */
  ink: "#d1cfc0",
  /** Browser UI color. */
  themeColor: "#141414",
} as const;

/** Static files under `public/`. Regenerate with `pnpm --filter @luraba/web brand:generate`. */
export const BRAND_ASSETS = {
  favicon16: "/brand/favicon-16x16.png",
  favicon32: "/brand/favicon-32x32.png",
  appleTouchIcon: "/brand/apple-touch-icon.png",
  android192: "/brand/android-chrome-192x192.png",
  android512: "/brand/android-chrome-512x512.png",
  markSvg: "/brand/logo-mark.svg",
  ogImage: "/og/og-default.png",
  twitterImage: "/og/twitter-default.png",
} as const;

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
