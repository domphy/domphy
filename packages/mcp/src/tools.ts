import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { diagnose, format, validate } from "@domphy/doctor";

/**
 * Pure tool implementations for the Domphy MCP server. Kept transport-free so
 * they are unit-testable. The server (index.ts) wires these to MCP requests.
 */

const ORIGIN = process.env.DOMPHY_ORIGIN ?? "https://www.domphy.com";

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
    doc: string;
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
    const near = m.patches
      .filter((p) => p.name.includes(name) || name.includes(p.name))
      .map((p) => p.name);
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
    const near = blocks
      .filter((b) => b.name.includes(name) || name.includes(b.name))
      .map((b) => b.name);
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

/** Reads a block's source file, resolving its repo-relative `file` path. */
async function readBlockSource(repoRelativeFile: string): Promise<string> {
  // The app-manifest lives at <repo>/apps/web/public/app-manifest.json by
  // default, so the repo root is three levels up from the manifest directory.
  const manifestDir = dirname(appManifestPath());
  const candidates = [
    resolve(manifestDir, "../../..", repoRelativeFile),
    resolve(process.cwd(), repoRelativeFile),
    resolve(manifestDir, repoRelativeFile),
  ];
  let lastError: unknown;
  for (const candidate of candidates) {
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
