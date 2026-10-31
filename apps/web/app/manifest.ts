import type { MetadataRoute } from "next";

import { BRAND, BRAND_ASSETS } from "@/components/brand/constants";

// Makes Luraba installable. On iPhone, web push only works once the app is added to the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.tagline,
    start_url: "/dashboard",
    display: "standalone",
    background_color: BRAND.background,
    theme_color: BRAND.themeColor,
    icons: [
      { src: BRAND_ASSETS.android192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: BRAND_ASSETS.android512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: BRAND_ASSETS.android192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: BRAND_ASSETS.android512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
