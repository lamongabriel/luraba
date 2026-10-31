import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The icon package ships one 20 MB index with all ~5,400 icons. Rewrite named imports to
  // per-icon modules so dev and prod bundles only contain the icons actually used.
  modularizeImports: {
    "@hugeicons/core-free-icons": {
      transform: "@hugeicons/core-free-icons/{{member}}",
    },
  },
  experimental: {
    optimizePackageImports: ["recharts"],
  },
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  async redirects() {
    return [
      { source: "/categories", destination: "/household/categories", permanent: true },
      { source: "/tags", destination: "/household/tags", permanent: true },
      { source: "/merchants", destination: "/household/merchants", permanent: true },
      { source: "/settings/import-export", destination: "/household/import", permanent: true },
    ];
  },
};

export default nextConfig;
