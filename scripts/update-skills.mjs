import { spawnSync } from "node:child_process";
import { linkSkills } from "./link-skills.mjs";

const result = spawnSync("pnpm", ["exec", "skills", "update", "--project", "--yes"], {
  cwd: new URL("../", import.meta.url).pathname,
  stdio: "inherit",
  env: { ...process.env, DISABLE_TELEMETRY: "1" },
});
if (result.status !== 0) process.exit(result.status ?? 1);
linkSkills();
console.log("Review the resulting skill diff before committing updates.");
