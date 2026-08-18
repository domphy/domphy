/**
 * Assert STABLE-READINESS.md covers every publishable package under packages/*.
 * The Peer matrix Version column must match each package.json version.
 * Usage: node scripts/stable-readiness-check.mjs [--root <dir>]
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rootFlag = args.indexOf("--root");
if (rootFlag !== -1 && !args[rootFlag + 1]) {
  console.error(
    "usage: node scripts/stable-readiness-check.mjs [--root <dir>]",
  );
  process.exit(2);
}

const root =
  rootFlag !== -1
    ? resolve(args[rootFlag + 1])
    : resolve(fileURLToPath(new URL("..", import.meta.url)));
const matrixPath = join(root, "STABLE-READINESS.md");
const matrix = readFileSync(matrixPath, "utf8");

/**
 * Parse the Peer matrix table into package name → Version column.
 * Stops at the next markdown heading so other tables are ignored.
 * @param {string} markdown
 * @returns {Map<string, string>}
 */
function parsePeerMatrix(markdown) {
  const heading = markdown.search(/^## Peer matrix\s*$/m);
  const versions = new Map();
  if (heading === -1) return versions;
  const fromHeading = markdown.slice(heading);
  const firstNewline = fromHeading.indexOf("\n");
  const body = firstNewline === -1 ? "" : fromHeading.slice(firstNewline + 1);
  const nextHeading = body.search(/\n##/);
  const section = nextHeading === -1 ? body : body.slice(0, nextHeading);

  for (const line of section.split("\n")) {
    const tick = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\S+)\s*\|/);
    if (tick) {
      versions.set(tick[1], tick[2]);
      continue;
    }
    const plain = line.match(/^\|\s*([@\w./-]+)\s*\|\s*(\S+)\s*\|/);
    if (plain && plain[1] !== "Package" && !plain[1].startsWith("-")) {
      versions.set(plain[1], plain[2]);
    }
  }
  return versions;
}

const matrixVersions = parsePeerMatrix(matrix);

const publishable = [];
for (const name of readdirSync(join(root, "packages"))) {
  const pkgPath = join(root, "packages", name, "package.json");
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.private) continue;
  publishable.push({ dir: name, name: pkg.name, version: pkg.version });
}

const missing = [];
const stale = [];
const missingChangelog = [];
for (const row of publishable) {
  const matrixVersion = matrixVersions.get(row.name);
  if (matrixVersion == null) {
    missing.push(row.name);
  } else if (matrixVersion !== row.version) {
    stale.push(
      `${row.name}: matrix=${matrixVersion} package.json=${row.version}`,
    );
  }

  const changelog = join(root, "packages", row.dir, "CHANGELOG.md");
  if (!existsSync(changelog)) missingChangelog.push(row.name);
}

const lines = [
  `publishable=${publishable.length}`,
  `matrix=${matrixPath}`,
  ...publishable.map((r) => `ok ${r.name}@${r.version}`),
];
if (missing.length) {
  console.error("MISSING FROM MATRIX:", missing.join(", "));
  process.exitCode = 1;
}
if (stale.length) {
  console.error("STALE MATRIX VERSION:", stale.join(", "));
  process.exitCode = 1;
}
if (missingChangelog.length) {
  console.error("MISSING CHANGELOG:", missingChangelog.join(", "));
  process.exitCode = 1;
}
if (!process.exitCode) {
  console.log(lines.join("\n"));
  console.log(
    `All ${publishable.length} publishable packages covered; versions match; changelogs present.`,
  );
}
