import type { Metadata } from "next";

import { BRAND, BRAND_ASSETS, OG_IMAGE_SIZE } from "@/components/brand/constants";

/**
 * Per-page metadata. Every `page.tsx` (or the `layout.tsx` next to a client page) must export
 * `metadata = pageMetadata({ title: "Transactions" })` or `generateMetadata`; enforced by
 * `test/conventions.test.ts`. See components/brand/README.md.
 *
 * `title` is the bare page name: the root layout's template renders it as "Transactions | Luraba".
 * Open Graph and Twitter are replaced (not merged) by a page's own values, so the full set,
 * including the fallback image, is rebuilt here.
 */
export type PageMetadataInput = {
  /** Bare page name, no "| Luraba" suffix. */
  title: string;
  /** Falls back to the app description. */
  description?: string;
  /** Route path for `og:url` (resolved against `metadataBase`), for example "/transactions". */
  path?: string;
};

export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const fullTitle = `${title} | ${BRAND.name}`;
  const text = description ?? BRAND.description;

  return {
    title,
    description: text,
    openGraph: {
      title: fullTitle,
      description: text,
      siteName: BRAND.name,
      type: "website",
      locale: "en_US",
      ...(path ? { url: path } : {}),
      images: [{ url: BRAND_ASSETS.ogImage, ...OG_IMAGE_SIZE, alt: BRAND.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: text,
      images: [BRAND_ASSETS.twitterImage],
    },
  };
}

/** Root defaults: used by `app/layout.tsx` for the title template, icons and robots. */
export function rootMetadata(): Metadata {
  const base = pageMetadata({ title: BRAND.name, description: BRAND.description, path: "/" });

  return {
    ...base,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
    applicationName: BRAND.name,
    // A private, self-hosted app: keep it out of search engines.
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: BRAND_ASSETS.favicon32, sizes: "32x32", type: "image/png" },
        { url: BRAND_ASSETS.favicon16, sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: BRAND_ASSETS.appleTouchIcon, sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: { title: BRAND.name, capable: true, statusBarStyle: "black-translucent" },
    openGraph: { ...base.openGraph, title: BRAND.name },
    twitter: { ...base.twitter, title: BRAND.name },
  };
}
