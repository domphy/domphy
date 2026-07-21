/**
 * Assert STABLE-READINESS.md covers every publishable package under packages/*.
 * Usage: node scripts/stable-readiness-check.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const matrixPath = join(root, "STABLE-READINESS.md");
const matrix = readFileSync(matrixPath, "utf8");

const publishable = [];
for (const name of readdirSync(join(root, "packages"))) {
  const pkgPath = join(root, "packages", name, "package.json");
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.private) continue;
  publishable.push({ dir: name, name: pkg.name, version: pkg.version });
}

const missing = [];
const missingChangelog = [];
for (const row of publishable) {
  if (!matrix.includes(row.name) && !matrix.includes(`\`${row.name}\``)) {
    // table uses backticks around package names
    if (!matrix.includes(`| \`${row.name}\``) && !matrix.includes(row.name)) {
      missing.push(row.name);
    }
  }
  // create-domphy is not always under @domphy scope
  const hasRow =
    matrix.includes(`\`${row.name}\``) ||
    matrix.includes(`| ${row.name} `) ||
    matrix.includes(row.name);
  if (!hasRow) missing.push(row.name);

  const changelog = join(root, "packages", row.dir, "CHANGELOG.md");
  if (!existsSync(changelog)) missingChangelog.push(row.name);
}

const uniqueMissing = [...new Set(missing)];
const lines = [
  `publishable=${publishable.length}`,
  `matrix=${matrixPath}`,
  ...publishable.map((r) => `ok ${r.name}@${r.version}`),
];
if (uniqueMissing.length) {
  console.error("MISSING FROM MATRIX:", uniqueMissing.join(", "));
  process.exitCode = 1;
}
if (missingChangelog.length) {
  console.error("MISSING CHANGELOG:", missingChangelog.join(", "));
  process.exitCode = 1;
}
if (!process.exitCode) {
  console.log(lines.join("\n"));
  console.log(
    `All ${publishable.length} publishable packages covered; changelogs present.`,
  );
}
