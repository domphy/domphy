import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { diagnose, fix, format, validate } from "@domphy/doctor";

/**
 * Pure tool implementations for the Domphy MCP server. Kept transport-free so
 * they are unit-testable. The server (index.ts) wires these to MCP requests.
 */

const ORIGIN = process.env.DOMPHY_ORIGIN ?? "https://domphy.com";

// Path to the app-block registry produced by `apps/web/scripts/app-manifest.mjs`.
// Read lazily (per call) so the env var can be set after this module loads, and
// overridable so the same MCP server can serve any app's blocks.
function appManifestSetting(): string {
  return process.env.DOMPHY_APP_MANIFEST ?? "./app-manifest.json";
}

interface Manifest {
  version: string;
  packages: Array<{
    name: string;
    version: string;
    description: string;
    subpaths: string[];
    peerDependencies: string[];
  }>;
  patches: Array<{
    name: string;
    hostTag: string | null;
    signature: string;
    props: Array<{
      name: string;
      type: string;
      optional: boolean;
      doc: string;
    }>;
    doc: string;
    example: string;
    source: string;
  }>;
}

let cache: Manifest | null = null;

export async function loadManifest(): Promise<Manifest> {
  if (cache) return cache;
  const res = await fetch(`${ORIGIN}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
  cache = (await res.json()) as Manifest;
  return cache;
}

export async function listPatches(): Promise<string> {
  const m = await loadManifest();
  return m.patches
    .map(
      (p) => `${p.name}${p.hostTag ? ` <${p.hostTag}>` : ""} — ${p.signature}`,
    )
    .join("\n");
}

export async function getPatch(name: string): Promise<string> {
  const m = await loadManifest();
  const patch = m.patches.find((p) => p.name === name);
  if (!patch) {
    // name.includes("") is always true — an empty name must not match everything.
    const near = name
      ? m.patches
          .filter((p) => p.name.includes(name) || name.includes(p.name))
          .map((p) => p.name)
      : [];
    return `No patch named "${name}".${near.length ? ` Did you mean: ${near.join(", ")}?` : ""}`;
  }
  return JSON.stringify(patch, null, 2);
}

export async function listPackages(): Promise<string> {
  const m = await loadManifest();
  return m.packages
    .map((p) => `${p.name}@${p.version} — ${p.description}`)
    .join("\n");
}

export async function getRules(): Promise<string> {
  const res = await fetch(`${ORIGIN}/llms.txt`);
  if (!res.ok) throw new Error(`Failed to fetch rules: ${res.status}`);
  return res.text();
}

/** Valid tone names + theme color names (tones.json) for themeColor()/dataTone. */
export async function getTones(): Promise<string> {
  const res = await fetch(`${ORIGIN}/tones.json`);
  if (!res.ok) throw new Error(`Failed to fetch tones: ${res.status}`);
  return res.text();
}

/** Runs @domphy/doctor on a JSON element tree (static parts only). */
export function diagnoseTree(elementJson: string): string {
  let tree: unknown;
  try {
    tree = JSON.parse(elementJson);
  } catch (error) {
    return `Invalid JSON: ${(error as Error).message}`;
  }
  return format(diagnose(tree));
}

/**
 * Runs @domphy/doctor's aggregate `validate()` on a JSON element tree and
 * returns the structured report (ok flag, issues, severity counts) as JSON.
 */
export function validateTree(elementJson: string): string {
  let tree: unknown;
  try {
    tree = JSON.parse(elementJson);
  } catch (error) {
    return `Invalid JSON: ${(error as Error).message}`;
  }
  return JSON.stringify(validate(tree), null, 2);
}

/**
 * Applies @domphy/doctor's lossless autofix to a JSON element tree and returns
 * the fixed tree, the fixes applied, and a validation report of what remains
 * (issues needing intent are not auto-fixed).
 */
export function fixTree(elementJson: string): string {
  let tree: unknown;
  try {
    tree = JSON.parse(elementJson);
  } catch (error) {
    return `Invalid JSON: ${(error as Error).message}`;
  }
  return JSON.stringify(fix(tree), null, 2);
}

// --- app-block registry (an app's OWN reusable Domphy blocks) ---

interface AppBlock {
  name: string;
  kind: "block" | "patch";
  /** Repo-relative path of the file the block is declared in. */
  file: string;
  signature: string;
  jsdoc: string;
  exportKind: "default" | "named";
}

/** Resolves the app-manifest path against the manifest dir / cwd as needed. */
function appManifestPath(): string {
  const setting = appManifestSetting();
  return isAbsolute(setting) ? setting : resolve(process.cwd(), setting);
}

async function loadAppBlocks(): Promise<AppBlock[]> {
  const text = await readFile(appManifestPath(), "utf8");
  return JSON.parse(text) as AppBlock[];
}

function missingManifestHint(): string {
  return (
    `No app-manifest found at "${appManifestPath()}". ` +
    "Generate it with `node apps/web/scripts/app-manifest.mjs <srcDir> <outFile>` " +
    "and point DOMPHY_APP_MANIFEST at the output (default ./app-manifest.json)."
  );
}

/** Lists the app's own blocks (name + signature + file) from the app-manifest. */
export async function listAppBlocks(): Promise<string> {
  let blocks: AppBlock[];
  try {
    blocks = await loadAppBlocks();
  } catch {
    return missingManifestHint();
  }
  if (blocks.length === 0) {
    return "The app-manifest is empty — no exported Domphy blocks were found.";
  }
  return blocks
    .map((b) => `${b.name} [${b.kind}] — ${b.signature}  (${b.file})`)
    .join("\n");
}

/**
 * Returns one app block's full source (the file at the manifest's `file`),
 * along with its signature and jsdoc.
 */
export async function getAppBlock(name: string): Promise<string> {
  let blocks: AppBlock[];
  try {
    blocks = await loadAppBlocks();
  } catch {
    return missingManifestHint();
  }
  const block = blocks.find((b) => b.name === name);
  if (!block) {
    // name.includes("") is always true — an empty name must not match everything.
    const near = name
      ? blocks
          .filter((b) => b.name.includes(name) || name.includes(b.name))
          .map((b) => b.name)
      : [];
    return `No app block named "${name}".${near.length ? ` Did you mean: ${near.join(", ")}?` : ""}`;
  }
  // The manifest stores repo-relative paths; resolve them against the repo root,
  // which is the manifest's directory walked up out of apps/web/public, falling
  // back to cwd-relative resolution when that layout does not apply.
  let source: string;
  try {
    source = await readBlockSource(block.file);
  } catch (error) {
    source = `// Could not read source: ${(error as Error).message}`;
  }
  return JSON.stringify(
    {
      name: block.name,
      kind: block.kind,
      file: block.file,
      signature: block.signature,
      jsdoc: block.jsdoc,
      exportKind: block.exportKind,
      source,
    },
    null,
    2,
  );
}

/** True when `candidate` is `root` itself or nested under it (no `..` escape). */
function isWithinRoot(candidate: string, root: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/** Reads a block's source file, resolving its repo-relative `file` path. */
async function readBlockSource(repoRelativeFile: string): Promise<string> {
  // The app-manifest lives at <repo>/apps/web/public/app-manifest.json by
  // default, so the repo root is three levels up from the manifest directory.
  // Each base is also its own containment root: block.file comes from a
  // (possibly untrusted) app-manifest.json, so `..` segments must never let a
  // candidate escape the base it was resolved against, whichever app/repo
  // that base belongs to (DOMPHY_APP_MANIFEST can point at any app's own
  // manifest, not just this monorepo's).
  const manifestDir = dirname(appManifestPath());
  const bases = [resolve(manifestDir, "../../.."), process.cwd(), manifestDir];
  let lastError: unknown;
  for (const base of bases) {
    const candidate = resolve(base, repoRelativeFile);
    if (!isWithinRoot(candidate, base)) {
      lastError = new Error(
        `refusing to read outside "${base}": ${repoRelativeFile}`,
      );
      continue;
    }
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`file not found: ${repoRelativeFile}`);
}
