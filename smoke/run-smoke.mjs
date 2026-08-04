/**
 * Tarball-install smoke test.
 *
 * Verifies the publishable packages work when installed the way a real
 * consumer installs them — from packed tarballs, NOT workspace links
 * (workspace `link:` resolution hides missing-deps and exports-map bugs).
 *
 * What it does:
 *   1. Discovers every publishable package (packages/<name>/package.json
 *      without `"private": true`) and packs it with `pnpm pack` into
 *      smoke/.tarballs/, renaming each tarball to a stable version-free
 *      name (e.g. `domphy-core.tgz`) so the checked-in fixtures can
 *      reference them with fixed `file:` paths. Packing uses pnpm — NOT
 *      npm — because the repo declares inter-package deps as `workspace:`
 *      and the real publish flow (`pnpm publish`) rewrites those to
 *      concrete versions at pack time; `npm pack` would ship the raw
 *      `workspace:` protocol, which no consumer ever receives.
 *   2. Runs each fixture consumer under smoke/fixtures/: a fresh
 *      `npm install` (no lockfile reuse, npm instead of pnpm — real
 *      consumers use npm, and npm's hoisting differs from pnpm's strict
 *      layout), then the fixture's build/run command.
 *   3. Reports per-fixture PASS/FAIL with the real error output on failure
 *      and exits non-zero if anything failed.
 *
 * Requires a prior `pnpm -r build` (packing ships the prebuilt dist/).
 *
 * Usage:
 *   pnpm smoke
 *   node smoke/run-smoke.mjs
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tarballsDir = join(root, "smoke", ".tarballs");
const fixturesDir = join(root, "smoke", "fixtures");

/**
 * Run a command, returning captured output. Throws on non-zero exit with
 * stdout+stderr attached so the caller can print the real error output.
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd: string, timeout?: number }} options
 * @returns {string}
 */
function run(command, args, options) {
  try {
    return execFileSync(command, args, {
      cwd: options.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      timeout: options.timeout ?? 10 * 60 * 1000,
      env: { ...process.env, CI: "true" },
    });
  } catch (error) {
    const captured =
      error && typeof error === "object"
        ? /** @type {{ stdout?: unknown, stderr?: unknown }} */ (error)
        : {};
    const output = [captured.stdout, captured.stderr]
      .map((chunk) => String(chunk ?? "").trim())
      .filter(Boolean)
      .join("\n");
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd}\n${output || message}`,
    );
  }
}

/**
 * Discover publishable packages: every packages/<name>/package.json
 * without `"private": true`, sorted by name for deterministic output.
 * @returns {{ name: string, dir: string }[]}
 */
function discoverPublishablePackages() {
  const packagesRoot = join(root, "packages");
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(packagesRoot, entry.name);
      const manifestPath = join(dir, "package.json");
      if (!existsSync(manifestPath)) return null;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.private === true) return null;
      return { name: manifest.name, dir };
    })
    .filter((pkg) => pkg !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Stable, version-free tarball name for a package, so fixtures can use
 * fixed `file:` specifiers (`@domphy/core` → `domphy-core.tgz`).
 * @param {string} packageName
 * @returns {string}
 */
function canonicalTarballName(packageName) {
  return `${packageName.replace(/^@/, "").replace(/\//g, "-")}.tgz`;
}

/**
 * Pack every publishable package into smoke/.tarballs/. Returns the number
 * of packed tarballs; throws on the first pack failure.
 * @param {{ name: string, dir: string }[]} packages
 */
function packAll(packages) {
  rmSync(tarballsDir, { recursive: true, force: true });
  mkdirSync(tarballsDir, { recursive: true });

  for (const pkg of packages) {
    if (!existsSync(join(pkg.dir, "dist"))) {
      throw new Error(
        `${pkg.name} has no dist/ — run \`pnpm -r build\` before \`pnpm smoke\` (packing ships the prebuilt dist).`,
      );
    }
    // pnpm pack — the same command the publish flow relies on — rewrites
    // `workspace:` deps to concrete versions, so the tarball matches what
    // `pnpm publish` would ship (npm pack would leave `workspace:` raw).
    const output = run("pnpm", ["pack", "--pack-destination", tarballsDir], {
      cwd: pkg.dir,
    });
    // pnpm pack prints the tarball path as the last non-empty line (a full
    // path when --pack-destination is used, a bare filename otherwise).
    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const printed = lines[lines.length - 1];
    if (!printed || !printed.endsWith(".tgz")) {
      throw new Error(
        `${pkg.name}: could not determine tarball name from pnpm pack output: ${output}`,
      );
    }
    const filename = basename(printed);
    const canonical = canonicalTarballName(pkg.name);
    renameSync(join(tarballsDir, filename), join(tarballsDir, canonical));
    console.log(`packed  ${pkg.name} -> .tarballs/${canonical}`);
  }
}

/**
 * Fixture consumers. `verify` commands run in order after a fresh install;
 * each must exit 0. Fixtures assert internally and print their own output.
 * @type {{ name: string, verify: { command: string, args: string[] }[] }[]}
 */
const fixtures = [
  {
    name: "vite-app",
    verify: [{ command: "npm", args: ["run", "build"] }],
  },
  {
    name: "ssr-app",
    verify: [{ command: "node", args: ["main.mjs"] }],
  },
];

/**
 * Run one fixture: wipe install state (fresh install, no lockfile reuse),
 * npm install, then the verify commands.
 * @param {{ name: string, verify: { command: string, args: string[] }[] }} fixture
 * @returns {boolean} true on PASS
 */
function runFixture(fixture) {
  const dir = join(fixturesDir, fixture.name);
  try {
    for (const stale of ["node_modules", "package-lock.json", "dist"]) {
      rmSync(join(dir, stale), { recursive: true, force: true });
    }
    run("npm", ["install", "--no-audit", "--no-fund"], { cwd: dir });
    for (const step of fixture.verify) {
      run(step.command, step.args, { cwd: dir });
    }
    console.log(`PASS    ${fixture.name}`);
    return true;
  } catch (error) {
    console.error(`FAIL    ${fixture.name}`);
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

console.log("== Packing publishable packages ==");
const packages = discoverPublishablePackages();
try {
  packAll(packages);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
console.log(`packed ${packages.length} package(s)\n`);

console.log("== Running fixtures ==");
const results = fixtures.map((fixture) => ({
  name: fixture.name,
  ok: runFixture(fixture),
}));

console.log("\n== Summary ==");
for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}    ${result.name}`);
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} fixture(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} fixture(s) passed.`);
