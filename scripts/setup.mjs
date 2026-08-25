import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  LURABA_UI_PORT: "29670",
  LURABA_API_PORT: "22677",
  LURABA_DB_PORT: "29762",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DISABLE_TELEMETRY: "1" },
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function writeIfMissing(path, contents) {
  if (existsSync(path)) {
    console.log(`Preserved ${path.replace(`${root}/`, "")}`);
    return false;
  }
  writeFileSync(path, contents, { encoding: "utf8", mode: 0o600 });
  console.log(`Generated ${path.replace(`${root}/`, "")}`);
  return true;
}

function localSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function rootEnv() {
  return `${Object.entries(defaults)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function apiEnv() {
  return `NODE_ENV=development
PORT=${defaults.LURABA_API_PORT}
BASE_URL=http://localhost:${defaults.LURABA_API_PORT}
FRONTEND_ORIGIN=http://localhost:${defaults.LURABA_UI_PORT}
LOG_LEVEL=debug

DB_HOST=localhost
DB_PORT=${defaults.LURABA_DB_PORT}
DB_NAME=luraba_db
DB_USER=luraba
DB_PASSWORD=luraba

AUTH_SECRET=${localSecret(48)}
INTEGRATIONS_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}

# Optional integrations. Leave blank to run the local stack in degraded mode.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SMTP_PROVIDER=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_NAME=Luraba
SMTP_FROM_EMAIL=
SMTP_REPLY_EMAIL=
SMTP_TLS_CIPHERS=

`;
}

function uiEnv() {
  return `# Public API origin used by the browser for local development.
NEXT_PUBLIC_API_URL=http://localhost:${defaults.LURABA_API_PORT}
LURABA_UI_PORT=${defaults.LURABA_UI_PORT}
`;
}

console.log("Preparing Luraba's pnpm workspace...");
writeIfMissing(join(root, ".env"), rootEnv());
writeIfMissing(join(root, "apps/api", ".env"), apiEnv());
if (
  !existsSync(join(root, "apps/web", ".env.local")) &&
  !existsSync(join(root, "apps/web", ".env"))
) {
  writeIfMissing(join(root, "apps/web", ".env.local"), uiEnv());
} else {
  console.log("Preserved apps/web/.env.local or apps/web/.env");
}

for (const [directory, label] of [
  [".", "root"],
  ["apps/api", "API"],
  ["apps/web", "UI"],
  ["packages/contracts", "contracts"],
  ["packages/domain", "domain"],
]) {
  if (!existsSync(join(root, directory, "package.json"))) {
    throw new Error(`Missing ${label} package.json`);
  }
}

run("pnpm", ["install", "--frozen-lockfile"]);

console.log("\nOptional integrations remain disabled unless credentials are supplied:");
console.log("Google/GitHub OAuth, SMTP, Brandfetch, and external FX providers.");
console.log("Deterministic mock seed credentials: demo@luraba.local / demo1234!");
run("pnpm", ["run", "doctor"]);
