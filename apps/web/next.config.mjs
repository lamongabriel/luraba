import { fileURLToPath } from "node:url"

const appRoot = fileURLToPath(new URL("..", import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: appRoot,
  },
}

export default nextConfig
