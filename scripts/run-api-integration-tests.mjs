import { spawnSync } from "node:child_process";

const turboCommand = process.platform === "win32" ? "turbo.cmd" : "turbo";
const environment = {
  ...process.env,
  DB_HOST: process.env.DB_HOST ?? process.env.LURABA_DB_HOST ?? "127.0.0.1",
  DB_PORT: process.env.DB_PORT ?? process.env.LURABA_DB_PORT ?? "29762",
};

// Integration tests mutate a real Postgres database and must never be replayed
// from Turbo's cache.
const result = spawnSync(turboCommand, ["run", "test", "--filter=@luraba/api...", "--force"], {
  env: environment,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
