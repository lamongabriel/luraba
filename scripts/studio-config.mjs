// Prepares Drizzle Studio for this repo (used by `scripts/dev.sh studio`).
//
// drizzle-kit loads the schema through a CommonJS hook that cannot resolve the ESM-only
// `@luraba/contracts/*` subpaths imported by packages/db, so `drizzle-kit studio` fails on
// the regular drizzle.config.ts. This bundles packages/db/src/schema.ts (workspace packages
// inlined, drizzle-orm left external) into a throwaway CJS file and writes a matching config
// next to it. Prints the config path on stdout.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps/api");
const outDir = path.join(apiDir, "node_modules/.cache/studio");
mkdirSync(outDir, { recursive: true });

const requireFromApi = createRequire(path.join(apiDir, "package.json"));
const tsxDir = path.dirname(requireFromApi.resolve("tsx/package.json"));
const { build } = createRequire(path.join(tsxDir, "package.json"))("esbuild");

await build({
  entryPoints: [path.join(root, "packages/db/src/schema.ts")],
  outfile: path.join(outDir, "schema.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  logLevel: "error",
  external: ["drizzle-orm", "drizzle-orm/*", "pg"],
});

const config = `module.exports = {
  dialect: "postgresql",
  schema: ${JSON.stringify(path.join(outDir, "schema.cjs"))},
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "luraba",
    password: process.env.DB_PASSWORD || "luraba",
    database: process.env.DB_NAME || "luraba_db",
    ssl: false,
  },
};
`;
writeFileSync(path.join(outDir, "drizzle.config.cjs"), config);
process.stdout.write(`${path.join(outDir, "drizzle.config.cjs")}\n`);
