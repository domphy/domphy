/**
 * Verify that packed package.json files contain no `workspace:` protocol deps.
 *
 * Usage:
 *   node scripts/verify-publish.mjs packages/ui
 *   node scripts/verify-publish.mjs packages/ui packages/core
 *   node scripts/verify-publish.mjs --all
 *
 * For each package dir: `pnpm pack`, extract package.json from the .tgz,
 * assert no dependency field value contains `workspace:`, delete the .tgz.
 */
import { execFileSync } from "node:child_process";
import { createReadStream, readdirSync, unlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const depFields = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "usage: node scripts/verify-publish.mjs <package-dir>… | --all",
  );
  process.exit(2);
}

/** @type {string[]} */
let packageDirs;
if (args.includes("--all")) {
  const packagesRoot = join(root, "packages");
  packageDirs = readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesRoot, entry.name))
    .filter((dir) => {
      try {
        return readdirSync(dir).includes("package.json");
      } catch {
        return false;
      }
    });
} else {
  packageDirs = args.map((arg) => resolve(root, arg));
}

/**
 * Read a single file's contents from a .tgz (ustar) archive.
 * Minimal tar reader — no external deps.
 * @param {string} tgzPath
 * @param {string} targetPath path inside the archive, e.g. "package/package.json"
 * @returns {Promise<Buffer>}
 */
async function readFromTgz(tgzPath, targetPath) {
  const gunzip = createGunzip();
  const source = createReadStream(tgzPath).pipe(gunzip);
  const chunks = [];
  for await (const chunk of source) {
    chunks.push(chunk);
  }
  const buf = Buffer.concat(chunks);

  let offset = 0;
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    // End-of-archive: two zero blocks
    if (header.every((byte) => byte === 0)) break;

    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeOctal = header
      .subarray(124, 136)
      .toString("utf8")
      .replace(/\0.*$/, "")
      .trim();
    const size = Number.parseInt(sizeOctal || "0", 8) || 0;
    const typeFlag = String.fromCharCode(header[156] || 0);
    offset += 512;

    const data = buf.subarray(offset, offset + size);
    // Round size up to 512-byte blocks
    offset += Math.ceil(size / 512) * 512;

    // typeFlag '0' or '\0' = regular file; also accept '5' skip dirs
    if (
      (typeFlag === "0" || typeFlag === "\0" || typeFlag === "") &&
      (name === targetPath || name.replace(/^\.\//, "") === targetPath)
    ) {
      return Buffer.from(data);
    }
  }
  throw new Error(`file not found in tarball: ${targetPath}`);
}

/**
 * @param {string} packageDir
 * @returns {Promise<"OK" | "FAIL">}
 */
async function verifyPackage(packageDir) {
  const name = basename(packageDir);
  let tgzPath = null;
  try {
    const output = execFileSync("pnpm", ["pack"], {
      cwd: packageDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    // pnpm pack prints the tarball filename as the last non-empty line
    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const tgzName = lines[lines.length - 1];
    if (!tgzName || !tgzName.endsWith(".tgz")) {
      console.error(
        `FAIL  ${name}: could not determine tarball name from: ${output}`,
      );
      return "FAIL";
    }
    tgzPath = join(packageDir, tgzName);

    const pkgJsonBuf = await readFromTgz(tgzPath, "package/package.json");
    const pkg = JSON.parse(pkgJsonBuf.toString("utf8"));

    /** @type {string[]} */
    const leaks = [];
    for (const field of depFields) {
      const deps = pkg[field];
      if (!deps || typeof deps !== "object") continue;
      for (const [depName, version] of Object.entries(deps)) {
        if (typeof version === "string" && version.includes("workspace:")) {
          leaks.push(`${field}.${depName}=${version}`);
        }
      }
    }

    if (leaks.length > 0) {
      console.error(`FAIL  ${name}: workspace: protocol leaked:`);
      for (const leak of leaks) {
        console.error(`        ${leak}`);
      }
      return "FAIL";
    }

    console.log(`OK    ${name} (${tgzName})`);
    return "OK";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String(/** @type {{ stderr?: unknown }} */ (error).stderr ?? "")
        : "";
    console.error(`FAIL  ${name}: ${message}${stderr ? `\n${stderr}` : ""}`);
    return "FAIL";
  } finally {
    if (tgzPath) {
      try {
        unlinkSync(tgzPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

let failed = 0;
for (const dir of packageDirs) {
  const result = await verifyPackage(dir);
  if (result === "FAIL") failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} package(s) failed verification.`);
  process.exit(1);
}

console.log(`\nAll ${packageDirs.length} package(s) OK.`);
