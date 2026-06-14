// Generates apps/web/public/manifest.json — a machine-readable index of every
// @domphy package and every @domphy/ui patch (name, host tag, signature, doc).
// Agents/MCP query this for a deterministic API surface. Auto-generated, never
// drifts. Run via `pnpm --filter @domphy/web run manifest` (also in build).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const REPO = resolve(HERE, "../../..");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

// --- packages ---
const pkgDir = resolve(REPO, "packages");
const pkgNames = (await readdir(pkgDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const packages = [];
for (const name of pkgNames) {
  try {
    const p = await readJson(resolve(pkgDir, name, "package.json"));
    packages.push({
      name: p.name,
      version: p.version,
      description: p.description ?? "",
      subpaths: Object.keys(p.exports ?? { ".": true }),
      peerDependencies: Object.keys(p.peerDependencies ?? {}),
    });
  } catch {
    // not a publishable package
  }
}

// --- ui patches ---
const patchesDir = resolve(REPO, "packages/ui/src/patches");
const patchFiles = (await readdir(patchesDir))
  .filter((f) => f.endsWith(".ts"))
  .sort();

const patches = [];
for (const file of patchFiles) {
  const name = basename(file, ".ts");
  const src = await readFile(resolve(patchesDir, file), "utf8");

  // function <name>(<params>): PartialElement
  const sig = src.match(
    new RegExp(
      `function\\s+${name}\\s*\\(([\\s\\S]*?)\\)\\s*:\\s*PartialElement`,
    ),
  );
  const params = sig ? sig[1].replace(/\s+/g, " ").trim() : "";

  // host tag from a `node.tagName != "x"` / `!== "x"` guard
  const host = src.match(/tagName\s*[!=]==?\s*["']([a-z0-9]+)["']/i);

  // leading JSDoc summary, if any
  const doc = src.match(
    new RegExp(
      `/\\*\\*([\\s\\S]*?)\\*/\\s*(?:export\\s+)?function\\s+${name}\\b`,
    ),
  );
  const summary = doc
    ? doc[1]
        .replace(/^\s*\*\s?/gm, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  patches.push({
    name,
    hostTag: host ? host[1] : null,
    signature: `${name}(${params})`,
    doc: summary,
    source: `packages/ui/src/patches/${file}`,
  });
}

const manifest = {
  name: "domphy",
  version: packages.find((p) => p.name === "@domphy/core")?.version ?? "0.0.0",
  generated: "auto",
  rules: "https://www.domphy.com/llms.txt",
  packages,
  patches,
};

const dest = resolve(ROOT, "public/manifest.json");
await writeFile(dest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `wrote ${dest} (${packages.length} packages, ${patches.length} patches)`,
);
