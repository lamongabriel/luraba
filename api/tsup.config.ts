import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "esbuild";
import { defineConfig } from "tsup";

function resolveAliasPath(importPath: string) {
  const target = path.resolve(process.cwd(), "src", importPath.slice(2));
  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}.js`,
    `${target}.mjs`,
    `${target}.cjs`,
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
    path.join(target, "index.js"),
    path.join(target, "index.mjs"),
    path.join(target, "index.cjs"),
  ];

  return candidates.find((candidate) => {
    if (!fs.existsSync(candidate)) return false;

    return fs.statSync(candidate).isFile();
  });
}

const aliasPlugin: Plugin = {
  name: "luraba-api-alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const resolvedPath = resolveAliasPath(args.path);

      if (!resolvedPath) {
        return {
          errors: [
            {
              text: `Could not resolve alias: ${args.path}`,
            },
          ],
        };
      }

      return { path: resolvedPath };
    });
  },
};

export default defineConfig({
  entry: ["src/app.ts"],
  format: ["cjs"],
  dts: true,
  outDir: "dist",
  esbuildPlugins: [aliasPlugin],
});
