import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
