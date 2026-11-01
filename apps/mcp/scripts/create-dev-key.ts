/**
 * Creates a personal API key for a dev user in the DEV database and writes it to apps/mcp/.env
 * (gitignored). The secret is never printed. Run: pnpm --filter @luraba/mcp create-dev-key
 *
 * Env: LURABA_DEV_USER_EMAIL picks the owner (default: the oldest user), LURABA_API_URL overrides the URL.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mcpDir = path.resolve(here, "..");
const apiDir = path.resolve(mcpDir, "../api");
const envFile = path.join(mcpDir, ".env");

// The API loads its dotenv file from the working directory, so run from the API folder.
process.chdir(apiDir);

const { pool } = await import("../../api/src/db/index.js");
const { createApiKey } = await import("../../api/src/modules/api-keys/api-keys.service.js");

function setVariable(content: string, name: string, value: string): string {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "mu");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content}${content === "" || content.endsWith("\n") ? "" : "\n"}${line}\n`;
}

try {
  const email = process.env.LURABA_DEV_USER_EMAIL;
  const { rows } = await pool.query<{ id: string; email: string }>(
    `select id, email from users ${email ? "where email = $1" : ""} order by created_at asc limit 1`,
    email ? [email] : [],
  );
  const user = rows[0];
  if (!user) {
    throw new Error(
      "No user found in the dev database. Sign up in the web app (or run `pnpm --filter @luraba/api seed:mock`), then retry.",
    );
  }

  const created = await createApiKey(user.id, { name: "MCP dev key", expiresInDays: 90 });

  let content = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  content = setVariable(
    content,
    "LURABA_API_URL",
    process.env.LURABA_API_URL ?? "http://127.0.0.1:3001",
  );
  content = setVariable(content, "LURABA_API_KEY", created.secret);
  writeFileSync(envFile, content, { mode: 0o600 });

  console.log(
    `Created API key "${created.name}" (${created.prefix}…) for ${user.email}, valid 90 days.`,
  );
  console.log(
    `Saved to ${path.relative(process.cwd(), envFile) || envFile}. The secret is not shown again.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
