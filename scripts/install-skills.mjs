import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { linkSkills } from "./link-skills.mjs";

const root = resolve(new URL("../", import.meta.url).pathname);
const mattCore = [
  "ask-matt",
  "code-review",
  "codebase-design",
  "diagnosing-bugs",
  "domain-modeling",
  "grill-with-docs",
  "implement",
  "improve-codebase-architecture",
  "prototype",
  "research",
  "resolving-merge-conflicts",
  "setup-matt-pocock-skills",
  "tdd",
  "to-spec",
  "to-tickets",
  "triage",
  "wayfinder",
  "wizard",
  "grill-me",
  "grilling",
  "handoff",
  "teach",
  "to-questionnaire",
  "wait-what",
  "writing-for-agents",
];
const bundles = [
  ["mattpocock/skills", mattCore],
  ["vercel-labs/skills", ["find-skills"]],
  ["anthropics/skills", ["frontend-design"]],
  ["vercel-labs/agent-skills", ["vercel-react-best-practices"]],
];

function installed(name) {
  return existsSync(join(root, ".agents", "skills", name, "SKILL.md"));
}

for (const [source, names] of bundles) {
  const missing = names.filter((name) => !installed(name));
  if (!missing.length) continue;
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "skills",
      "add",
      source,
      "--skill",
      ...missing,
      "--agent",
      "codex",
      "opencode",
      "--yes",
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DISABLE_TELEMETRY: "1" },
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

linkSkills();
const canonical = readdirSync(join(root, ".agents", "skills"), { withFileTypes: true }).filter(
  (entry) => entry.isDirectory() && installed(entry.name),
);
console.log(`Canonical skill count: ${canonical.length}`);
console.log("Review skills-lock.json and generated links before committing.");
