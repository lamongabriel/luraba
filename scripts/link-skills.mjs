import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRoot = join(root, ".agents", "skills");
const linkRoots = [join(root, ".claude", "skills"), join(root, ".kilocode", "skills")];

export function linkSkills() {
  const skills = readdirSync(canonicalRoot, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(canonicalRoot, entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort();

  for (const linkRoot of linkRoots) {
    mkdirSync(linkRoot, { recursive: true });
    for (const entry of readdirSync(linkRoot)) {
      const path = join(linkRoot, entry);
      const stat = lstatSafe(path);
      if (stat?.isSymbolicLink() && !skills.includes(entry)) unlinkSync(path);
    }
    for (const skill of skills) {
      const target = join(canonicalRoot, skill);
      const link = join(linkRoot, skill);
      const desired = relative(linkRoot, target);
      const stat = lstatSafe(link);
      if (stat && !stat.isSymbolicLink())
        throw new Error(`Refusing to replace non-symlink path: ${link}`);
      if (stat?.isSymbolicLink()) {
        if (readlinkSync(link) === desired) continue;
        unlinkSync(link);
      }
      symlinkSync(desired, link, "dir");
    }
  }
  console.log(`Linked ${skills.length} canonical skills for Claude Code and Kilo Code.`);
  return skills;
}

function lstatSafe(path) {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) linkSkills();
