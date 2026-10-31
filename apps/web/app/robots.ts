import type { MetadataRoute } from "next";

// Luraba is a private, self-hosted app: nothing should be crawled or indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
