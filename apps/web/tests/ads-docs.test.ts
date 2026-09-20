/**
 * Advertised-vs-shipped: public docs must not advertise a prop, peer, count,
 * or removed surface the packages do not ship.
 *
 * Oracles (never another markdown file):
 * - apps/web/public/manifest.json (patch names + props, generated from @domphy/ui)
 * - packages/blocks/registry.json (block export names)
 * - packages/{pkg}/package.json (peerDependencies, published names)
 * - packages/mcp/src/handler.ts TOOLS (MCP tool names)
 *
 * Combined parent pages (command, list, timeline, splitter, toolbar) document
 * sibling patches from the same source file — prop ads are checked against the
 * source-family union, not the filename patch alone.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPages } from "@domphy/press";
import { describe, expect, it } from "vitest";
import { isShippablePage } from "../press-build.ts";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(webRoot, "../..");

type ManifestPatch = {
  name: string;
  props: Array<{ name: string }>;
  source: string;
};

const manifest = JSON.parse(
  readFileSync(join(webRoot, "public/manifest.json"), "utf8"),
) as { patches: ManifestPatch[] };

const registry = JSON.parse(
  readFileSync(join(repoRoot, "packages/blocks/registry.json"), "utf8"),
) as Array<{ exportName: string }>;

const shippable = discoverPages(webRoot).filter((page) =>
  isShippablePage(page.filePath),
);

function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function parsePropTable(md: string): string[] {
  const names: string[] = [];
  let inTable = false;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\|\s*Prop\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable) {
      if (!line.startsWith("|")) {
        inTable = false;
        continue;
      }
      if (/^\|\s*-+/.test(line)) continue;
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);
      if (cells.length < 1) continue;
      const prop = cells[0]
        .replace(/`/g, "")
        .replace(/\s*\(required\)\s*/i, "")
        .replace(/\?$/, "")
        .trim();
      if (prop && prop !== "Prop") names.push(prop);
    }
  }
  return names;
}

function advertisedPeers(markdown: string): string[] {
  const line = markdown
    .split(/\r?\n/)
    .find((row) => row.startsWith("Peer dependencies:"));
  if (!line) return [];
  return [...line.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].replace(/\s+>=.*$/, "").trim())
    .filter(Boolean);
}

function packageJson(pkgDir: string): {
  name: string;
  private?: boolean;
  peerDependencies?: Record<string, string>;
} {
  return JSON.parse(
    readFileSync(join(repoRoot, "packages", pkgDir, "package.json"), "utf8"),
  );
}

const patchByKebab = new Map<string, ManifestPatch>();
const familyBySource = new Map<string, ManifestPatch[]>();
for (const patch of manifest.patches) {
  patchByKebab.set(kebab(patch.name), patch);
  const family = familyBySource.get(patch.source) ?? [];
  family.push(patch);
  familyBySource.set(patch.source, family);
}

const HAND_WRITTEN_BLOCK_PAGES = new Set([
  "index.md",
  "api.md",
  "methodology.md",
  "shadcn.md",
  "magicui.md",
]);

describe("shippable inventory coverage", () => {
  it("discoverPages + isShippablePage returns every public markdown page", () => {
    expect(shippable.length).toBeGreaterThan(0);
    const missing = shippable.filter((page) => !existsSync(page.filePath));
    expect(missing).toEqual([]);
  });
});

describe("catalog counts match shipped oracles", () => {
  const patchCount = manifest.patches.length;
  const blockCount = registry.length;

  it("manifest patch count is the advertised @domphy/ui catalog size", () => {
    expect(patchCount).toBeGreaterThan(0);
    const mismatches: string[] = [];
    for (const page of shippable) {
      const md = readFileSync(page.filePath, "utf8");
      for (const match of md.matchAll(/\b(\d+)\s+patches\b/g)) {
        if (Number(match[1]) !== patchCount) {
          mismatches.push(
            `${relative(repoRoot, page.filePath)}: "${match[0]}" (shipped ${patchCount})`,
          );
        }
      }
    }
    const llms = readFileSync(join(webRoot, "public/llms.txt"), "utf8");
    for (const match of llms.matchAll(/\b(\d+)\s+patches\b/g)) {
      if (Number(match[1]) !== patchCount) {
        mismatches.push(`llms.txt: "${match[0]}" (shipped ${patchCount})`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("registry length is the advertised @domphy/blocks catalog size", () => {
    expect(blockCount).toBeGreaterThan(0);
    const mismatches: string[] = [];
    for (const page of shippable) {
      const md = readFileSync(page.filePath, "utf8");
      for (const match of md.matchAll(/\b(\d+)\s+composed blocks\b/g)) {
        if (Number(match[1]) !== blockCount) {
          mismatches.push(
            `${relative(repoRoot, page.filePath)}: "${match[0]}" (shipped ${blockCount})`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("patch prop tables vs manifest family", () => {
  it("every advertised prop exists on a shipped patch in the same source file", () => {
    const errors: string[] = [];
    for (const page of shippable) {
      const posix = page.filePath.replace(/\\/g, "/");
      if (!posix.includes("/docs/ui/patches/") || !posix.endsWith(".md")) {
        continue;
      }
      const base = (posix.split("/").pop() ?? "").replace(/\.md$/, "");
      if (base === "typography") continue;
      const primary = patchByKebab.get(base);
      if (!primary) {
        errors.push(
          `${relative(repoRoot, page.filePath)}: no manifest patch named ${base}`,
        );
        continue;
      }
      const family = familyBySource.get(primary.source) ?? [primary];
      const shipped = new Set(
        family.flatMap((patch) => patch.props.map((prop) => prop.name)),
      );
      const md = readFileSync(page.filePath, "utf8");
      for (const name of parsePropTable(md)) {
        if (!shipped.has(name)) {
          errors.push(
            `${relative(repoRoot, page.filePath)}: prop \`${name}\` is not shipped on ${family.map((p) => p.name).join("/")}`,
          );
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it("every shipped prop of a documented family appears in that page's tables", () => {
    const errors: string[] = [];
    for (const page of shippable) {
      const posix = page.filePath.replace(/\\/g, "/");
      if (!posix.includes("/docs/ui/patches/") || !posix.endsWith(".md")) {
        continue;
      }
      const base = (posix.split("/").pop() ?? "").replace(/\.md$/, "");
      if (base === "typography") continue;
      const primary = patchByKebab.get(base);
      if (!primary) continue;
      const family = familyBySource.get(primary.source) ?? [primary];
      const documented = new Set(
        parsePropTable(readFileSync(page.filePath, "utf8")),
      );
      for (const patch of family) {
        for (const prop of patch.props) {
          if (!documented.has(prop.name)) {
            errors.push(
              `${relative(repoRoot, page.filePath)}: shipped \`${prop.name}\` on ${patch.name} missing from props table`,
            );
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it("every shipped patch is documented on a dedicated page or its source-family parent", () => {
    const documented = new Set<string>();
    for (const page of shippable) {
      const posix = page.filePath.replace(/\\/g, "/");
      if (!posix.includes("/docs/ui/patches/") || !posix.endsWith(".md")) {
        continue;
      }
      const base = (posix.split("/").pop() ?? "").replace(/\.md$/, "");
      const primary = patchByKebab.get(base);
      if (primary) {
        const family = familyBySource.get(primary.source) ?? [primary];
        for (const patch of family) documented.add(patch.name);
      }
    }
    const missing = manifest.patches
      .map((patch) => patch.name)
      .filter((name) => !documented.has(name));
    expect(missing).toEqual([]);
  });
});

describe("generated block pages vs registry", () => {
  it("every registry export has a shippable generated page", () => {
    const missing: string[] = [];
    for (const row of registry) {
      const file = join(webRoot, "docs/blocks", `${row.exportName}.md`);
      const hasPage = shippable.some(
        (page) =>
          page.filePath.replace(/\\/g, "/") === file.replace(/\\/g, "/"),
      );
      if (!hasPage) missing.push(row.exportName);
    }
    expect(missing).toEqual([]);
  });

  it("every generated block page maps to a registry exportName", () => {
    const exports = new Set(registry.map((row) => row.exportName));
    const extra: string[] = [];
    for (const name of readdirSync(join(webRoot, "docs/blocks"))) {
      if (!name.endsWith(".md") || HAND_WRITTEN_BLOCK_PAGES.has(name)) continue;
      const exportName = name.replace(/\.md$/, "");
      if (!exports.has(exportName)) extra.push(exportName);
    }
    expect(extra).toEqual([]);
  });
});

describe("peer ads match package.json", () => {
  const cases: Array<{ doc: string; pkgDir: string }> = [
    { doc: "docs/blocks/index.md", pkgDir: "blocks" },
    { doc: "docs/editor/index.md", pkgDir: "editor" },
    { doc: "docs/three/index.md", pkgDir: "three" },
  ];

  it.each(cases)("$doc Peer dependencies equal shipped peerDependencies", ({
    doc,
    pkgDir,
  }) => {
    const md = readFileSync(join(webRoot, doc), "utf8");
    const advertised = advertisedPeers(md).sort();
    expect(
      advertised.length,
      `missing Peer dependencies: line in ${doc}`,
    ).toBeGreaterThan(0);
    const shipped = Object.keys(
      packageJson(pkgDir).peerDependencies ?? {},
    ).sort();
    expect(advertised).toEqual(shipped);
  });
});

describe("removed surfaces are not advertised as current imports", () => {
  it("shippable pages do not import @domphy/next", () => {
    const hits: string[] = [];
    for (const page of shippable) {
      const md = readFileSync(page.filePath, "utf8");
      if (/from\s+['"]@domphy\/next['"]/.test(md)) {
        hits.push(relative(repoRoot, page.filePath));
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("MCP tool ads match handler TOOLS", () => {
  it("docs/mcp/tools.md headings equal shipped tool names", () => {
    const handler = readFileSync(
      join(repoRoot, "packages/mcp/src/handler.ts"),
      "utf8",
    );
    const shipped = [...handler.matchAll(/name:\s+"(domphy_[a-z_]+)"/g)].map(
      (match) => match[1],
    );
    const md = readFileSync(join(webRoot, "docs/mcp/tools.md"), "utf8");
    const advertised = [...md.matchAll(/^## (domphy_[a-z_]+)$/gm)].map(
      (match) => match[1],
    );
    expect(advertised.sort()).toEqual([...shipped].sort());
    const countHits = [...md.matchAll(/\b(\d+)\s+@domphy\/mcp tools\b/g)];
    for (const match of countHits) {
      expect(Number(match[1])).toBe(shipped.length);
    }
  });
});

describe("home package table vs published packages", () => {
  it("every @domphy/* linked on the home page is a published package", () => {
    const home = readFileSync(join(webRoot, "index.md"), "utf8");
    const advertised = [...home.matchAll(/\[`(@domphy\/[^`]+)`\]/g)].map(
      (match) => match[1],
    );
    const published = new Set(
      readdirSync(join(repoRoot, "packages"))
        .filter((dir) =>
          existsSync(join(repoRoot, "packages", dir, "package.json")),
        )
        .map((dir) => packageJson(dir))
        .filter((pkg) => pkg.name.startsWith("@domphy/") && !pkg.private)
        .map((pkg) => pkg.name),
    );
    const unknown = advertised.filter((name) => !published.has(name));
    expect(unknown).toEqual([]);
  });
});
