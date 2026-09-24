#!/usr/bin/env node
/**
 * Publish every publishable package whose local version is not on npm yet,
 * in dependency order. Run from a real terminal (npm's 2FA web prompt needs
 * a TTY): `pnpm publish:all`.
 *
 * Why pack with pnpm and publish the tarball with npm: `pnpm pack` rewrites
 * `workspace:` specifiers to real versions; `npm publish` in a package folder
 * does not. 2026-09-24 shipped 15 packages whose dependencies still read
 * `workspace:^` (uninstallable outside this repo) because they were published
 * with `npm publish --ignore-scripts`, which also skipped the
 * guard-pnpm-publish.mjs prepublishOnly guard. This script asserts the packed
 * manifest is clean before anything reaches the registry.
 *
 * Flags: --dry-run (pack + assert only), --deprecate <name@version=message>...
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const root = join(import.meta.dirname, "..");
const outDir = join(root, ".publish-tarballs");
const dryRun = process.argv.includes("--dry-run");
const shell = process.platform === "win32";

const packages = readdirSync(join(root, "packages"))
  .map((dir) => {
    try {
      const manifest = JSON.parse(
        readFileSync(join(root, "packages", dir, "package.json"), "utf8"),
      );
      return manifest.private ? null : { dir, manifest };
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// Dependency order: a package is published only after every workspace package it depends on.
const byName = new Map(packages.map((entry) => [entry.manifest.name, entry]));
const ordered = [];
const visiting = new Set();
function visit(entry) {
  if (ordered.includes(entry) || visiting.has(entry)) return;
  visiting.add(entry);
  const { dependencies = {}, peerDependencies = {} } = entry.manifest;
  for (const name of Object.keys({ ...dependencies, ...peerDependencies })) {
    const dependency = byName.get(name);
    if (dependency) visit(dependency);
  }
  ordered.push(entry);
}
for (const entry of packages) visit(entry);

// Reads one file out of a .tgz (ustar: 512-byte header, size in octal at 124..136).
function readTarEntry(tarball, entryName) {
  const archive = gunzipSync(readFileSync(tarball));
  for (let offset = 0; offset + 512 <= archive.length; ) {
    const name = archive
      .toString("utf8", offset, offset + 100)
      .replace(/\0.*$/s, "");
    if (!name) break;
    const size = Number.parseInt(
      archive
        .toString("utf8", offset + 124, offset + 136)
        .replace(/\0.*$/s, "")
        .trim() || "0",
      8,
    );
    if (name === entryName)
      return archive.toString("utf8", offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${entryName} not found in ${tarball}`);
}

function publishedVersion(name) {
  try {
    return execFileSync("npm", ["view", name, "version"], {
      encoding: "utf8",
      shell,
    }).trim();
  } catch {
    return "";
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const { dir, manifest } of ordered) {
  if (publishedVersion(manifest.name) === manifest.version) {
    console.log(
      `skip ${manifest.name}@${manifest.version} (already published)`,
    );
    continue;
  }
  const packageDir = join(root, "packages", dir);
  const output = execFileSync("pnpm", ["pack", "--pack-destination", outDir], {
    cwd: packageDir,
    encoding: "utf8",
    shell,
  });
  const tarball = output.trim().split(/\r?\n/).pop().trim();
  const packedManifest = readTarEntry(tarball, "package/package.json");
  if (packedManifest.includes("workspace:")) {
    console.error(
      `ABORT: ${manifest.name} tarball still contains a workspace: specifier`,
    );
    process.exit(1);
  }
  if (dryRun) {
    console.log(`ok (dry run) ${manifest.name}@${manifest.version}`);
    continue;
  }
  console.log(`\n=== publishing ${manifest.name}@${manifest.version}`);
  const result = spawnSync(
    "npm",
    ["publish", tarball, "--access", "public", "--auth-type=web"],
    { stdio: "inherit", shell },
  );
  if (result.status !== 0) {
    console.error(
      `\nFAILED on ${manifest.name}; rerun — published packages are skipped.`,
    );
    process.exit(1);
  }
}

const deprecations = process.argv
  .slice(2)
  .filter((arg, index, all) => all[index - 1] === "--deprecate");
for (const spec of deprecations) {
  const separator = spec.indexOf("=");
  const target = spec.slice(0, separator);
  const message = spec.slice(separator + 1);
  if (dryRun) {
    console.log(`would deprecate ${target}: ${message}`);
    continue;
  }
  spawnSync("npm", ["deprecate", target, message, "--auth-type=web"], {
    stdio: "inherit",
    shell,
  });
}

rmSync(outDir, { recursive: true, force: true });
console.log(dryRun ? "\nDry run passed." : "\nDone.");
