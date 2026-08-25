import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function commandVersion(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return undefined;
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function envFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .flatMap((line) => {
        const index = line.indexOf("=");
        if (index < 1) return [];
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [[key, value]];
      }),
  );
}

function requiredFile(path, label) {
  if (!existsSync(path)) errors.push(`Missing ${label}: ${path.replace(`${root}/`, "")}`);
}

function parsePort(name, env, fallback) {
  const value = process.env[name] ?? env[name] ?? fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(
      `${name} must be an integer between 1 and 65535 (received ${JSON.stringify(value)}).`,
    );
    return undefined;
  }
  return port;
}

async function portAvailable(port, name) {
  if (!port) return;
  await new Promise((resolvePromise) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        errors.push(
          `${name}=${port} is already occupied. Set ${name} to a free host port and retry.`,
        );
      } else {
        errors.push(`Unable to inspect ${name}=${port}: ${error.message}`);
      }
      resolvePromise();
    });
    server.listen({ port, host: "127.0.0.1" }, () => server.close(resolvePromise));
  });
}

function checkTooling() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 22) errors.push(`Node.js 22+ is required (found ${process.versions.node}).`);
  else console.log(`✓ Node.js ${process.versions.node}`);

  const pnpm = commandVersion("pnpm", ["--version"]);
  if (!pnpm) errors.push("pnpm is not available on PATH.");
  else if (pnpm !== "10.28.2") errors.push(`pnpm 10.28.2 is required (found ${pnpm}).`);
  else console.log(`✓ pnpm ${pnpm}`);

  if (!commandVersion("git", ["--version"])) errors.push("Git is not available on PATH.");
  else if (!commandVersion("git", ["rev-parse", "--show-toplevel"]))
    errors.push("The Luraba directory is not inside a Git worktree.");
  else console.log("✓ Git worktree");
  if (!commandVersion("docker", ["--version"])) errors.push("Docker is not available on PATH.");
  else {
    console.log("✓ Docker CLI");
    if (!commandVersion("docker", ["info"]))
      errors.push(
        "Docker CLI is installed but the Docker daemon is unavailable; start Docker and retry.",
      );
    else console.log("✓ Docker daemon");
  }

  const compose = commandVersion("docker", ["compose", "version", "--short"]);
  if (!compose) {
    errors.push("Docker Compose v2.20+ is required (`docker compose version --short`).");
  } else {
    const match = compose.match(/(\d+)(?:\.(\d+))?/);
    const major = Number(match?.[1] ?? 0);
    const minor = Number(match?.[2] ?? 0);
    if (major < 2 || (major === 2 && minor < 20))
      errors.push(`Docker Compose 2.20+ is required (found ${compose}).`);
    else console.log(`✓ Docker Compose ${compose}`);
  }
}

function checkPackages() {
  for (const [name, directory] of [
    ["root", "."],
    ["API", "apps/api"],
    ["UI", "apps/web"],
    ["contracts", "packages/contracts"],
    ["domain", "packages/domain"],
  ]) {
    requiredFile(join(root, directory, "package.json"), `${name} package manifest`);
  }
  requiredFile(join(root, "pnpm-workspace.yaml"), "pnpm workspace manifest");
  requiredFile(join(root, "pnpm-lock.yaml"), "root lockfile");
  if (existsSync(join(root, "apps/api", "pnpm-lock.yaml")))
    errors.push("apps/api/pnpm-lock.yaml must be removed; use the root workspace lockfile.");
  if (existsSync(join(root, "apps/web", "pnpm-lock.yaml")))
    errors.push("apps/web/pnpm-lock.yaml must be removed; use the root workspace lockfile.");
  if (existsSync(join(root, "package-lock.json")))
    errors.push("Root package-lock.json is not allowed; use pnpm only.");
}

function checkEnvironment() {
  const rootValues = envFile(join(root, ".env"));
  const apiValues = envFile(join(root, "apps/api", ".env"));
  const uiPath = existsSync(join(root, "apps/web", ".env.local"))
    ? join(root, "apps/web", ".env.local")
    : join(root, "apps/web", ".env");
  requiredFile(join(root, ".env"), "root environment file (generated by pnpm run setup)");
  requiredFile(
    join(root, "apps/api", ".env"),
    "API environment file (generated by pnpm run setup)",
  );
  if (!existsSync(uiPath))
    errors.push(
      "Missing UI environment file (apps/web/.env.local or apps/web/.env). Run pnpm run setup.",
    );

  for (const key of ["AUTH_SECRET", "INTEGRATIONS_ENCRYPTION_KEY"]) {
    if (!apiValues[key] || apiValues[key].length < (key === "AUTH_SECRET" ? 32 : 64))
      warnings.push(`API ${key} is missing or too short; the API may not start.`);
  }
  for (const [key, label] of [
    ["GOOGLE_CLIENT_ID", "Google OAuth"],
    ["GITHUB_CLIENT_ID", "GitHub OAuth"],
    ["SMTP_HOST", "SMTP email"],
    ["BRANDFETCH_API_KEY", "Brandfetch"],
  ]) {
    if (!apiValues[key]) warnings.push(`${label} is unavailable (optional).`);
  }
  warnings.push(
    "External FX providers are optional; the API health endpoint may report degraded status offline.",
  );
  const configured = ["LURABA_UI_PORT", "LURABA_API_PORT", "LURABA_DB_PORT"].map((key, index) =>
    parsePort(key, rootValues, [29670, 22677, 29762][index]),
  );
  if (new Set(configured.filter(Boolean)).size !== configured.filter(Boolean).length)
    errors.push("LURABA_UI_PORT, LURABA_API_PORT, and LURABA_DB_PORT must be distinct.");
  return configured;
}

function checkWorktree() {
  const result = spawnSync("git", ["status", "--porcelain", "--", "apps/api", "apps/web"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.stdout?.trim())
    warnings.push("API/UI contain dirty work; doctor will not modify or clean it.");
}

checkTooling();
checkPackages();
const ports = checkEnvironment();
checkWorktree();
await Promise.all([
  portAvailable(ports[0], "LURABA_UI_PORT"),
  portAvailable(ports[1], "LURABA_API_PORT"),
  portAvailable(ports[2], "LURABA_DB_PORT"),
]);

for (const warning of warnings) console.warn(`⚠ ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
console.log("✓ Luraba tooling, package isolation, environment, and host ports are ready.");
