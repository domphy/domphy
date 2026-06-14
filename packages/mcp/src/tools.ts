import { diagnose, format } from "@domphy/doctor";

/**
 * Pure tool implementations for the Domphy MCP server. Kept transport-free so
 * they are unit-testable. The server (index.ts) wires these to MCP requests.
 */

const ORIGIN = process.env.DOMPHY_ORIGIN ?? "https://www.domphy.com";

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
