import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pkgRoot, "..", "..");

function advertisedPeers(markdown: string): string[] {
  const line = markdown
    .split(/\r?\n/)
    .find((row) => row.startsWith("Peer dependencies:"));
  expect(line, "missing Peer dependencies: line").toBeDefined();
  return [...line!.matchAll(/`(@domphy\/[^`]+)`/g)].map((match) => match[1]);
}

describe("peer ads match package.json", () => {
  const pkg = JSON.parse(
    readFileSync(join(pkgRoot, "package.json"), "utf8"),
  ) as { peerDependencies?: Record<string, string> };
  const shipped = Object.keys(pkg.peerDependencies ?? {}).sort();

  it("does not list @domphy/form as a peer (auth uses local authFieldInput)", () => {
    expect(shipped).not.toContain("@domphy/form");
  });

  it("README peer list equals shipped peerDependencies", () => {
    const readme = readFileSync(join(pkgRoot, "README.md"), "utf8");
    expect(advertisedPeers(readme).sort()).toEqual(shipped);
  });

  it("docs/blocks/index.md peer list equals shipped peerDependencies", () => {
    const docs = readFileSync(
      join(repoRoot, "apps/web/docs/blocks/index.md"),
      "utf8",
    );
    expect(advertisedPeers(docs).sort()).toEqual(shipped);
  });

  it("public/manifest.json @domphy/blocks peers equal shipped peerDependencies", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "apps/web/public/manifest.json"), "utf8"),
    ) as {
      packages: { name: string; peerDependencies?: string[] }[];
    };
    const entry = manifest.packages.find(
      (item) => item.name === "@domphy/blocks",
    );
    expect(entry).toBeDefined();
    expect([...(entry!.peerDependencies ?? [])].sort()).toEqual(shipped);
  });
});
