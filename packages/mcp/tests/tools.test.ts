import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  diagnoseTree,
  getAppBlock,
  getPatch,
  listAppBlocks,
  listPatches,
  readBlockSource,
  validateTree,
} from "../src/tools";

const manifest = {
  version: "0.9.0",
  packages: [],
  patches: [
    {
      name: "button",
      hostTag: "button",
      signature: "button(props: { color?: ThemeColor } = {})",
      doc: "",
      source: "packages/ui/src/patches/button.ts",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DOMPHY_APP_MANIFEST;
});

describe("diagnoseTree (no network)", () => {
  it("reports issues in a JSON element tree", () => {
    const out = diagnoseTree(JSON.stringify({ input: "oops" }));
    expect(out).toContain("void-content");
  });
  it("is clean for valid trees", () => {
    expect(diagnoseTree(JSON.stringify({ div: "hi" }))).toBe(
      "✓ No issues found.",
    );
  });
  it("handles invalid JSON", () => {
    expect(diagnoseTree("{not json")).toContain("Invalid JSON");
  });
});

describe("manifest-backed tools", () => {
  it("lists and gets patches from the fetched manifest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => manifest,
      })),
    );
    expect(await listPatches()).toContain("button <button>");
    expect(await getPatch("button")).toContain('"hostTag": "button"');
    expect(await getPatch("nope")).toContain("No patch named");
  });

  it("does not treat an empty name as a match for every patch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => manifest,
      })),
    );
    // "".includes("") is always true — an empty name must not suggest every patch.
    expect(await getPatch("")).not.toContain("Did you mean");
  });
});

describe("validateTree (aggregate doctor report)", () => {
  it("returns a structured report with ok=false and counts for errors", () => {
    const report = JSON.parse(validateTree(JSON.stringify({ input: "oops" })));
    expect(report.ok).toBe(false);
    expect(report.summary.error).toBeGreaterThanOrEqual(1);
    expect(report.summary.total).toBe(report.issues.length);
  });
  it("returns ok=true for a clean tree", () => {
    const report = JSON.parse(validateTree(JSON.stringify({ div: "hi" })));
    expect(report.ok).toBe(true);
    expect(report.summary.total).toBe(0);
  });
  it("handles invalid JSON", () => {
    expect(validateTree("{not json")).toContain("Invalid JSON");
  });
});

describe("app-block tools", () => {
  const blocks = [
    {
      name: "Hero",
      kind: "block",
      file: "src/blocks/hero.ts",
      signature: 'Hero: DomphyElement<"section">',
      jsdoc: "A hero banner.",
      exportKind: "named",
    },
  ];

  it("explains how to generate the manifest when it is absent", async () => {
    process.env.DOMPHY_APP_MANIFEST = join(tmpdir(), "does-not-exist.json");
    expect(await listAppBlocks()).toContain("app-manifest.mjs");
    expect(await getAppBlock("Hero")).toContain("app-manifest.mjs");
  });

  it("lists blocks from the manifest", async () => {
    const manifestPath = join(
      mkdtempSync(join(tmpdir(), "domphy-app-")),
      "app-manifest.json",
    );
    writeFileSync(manifestPath, JSON.stringify(blocks));
    process.env.DOMPHY_APP_MANIFEST = manifestPath;
    const out = await listAppBlocks();
    expect(out).toContain("Hero [block]");
    expect(out).toContain("src/blocks/hero.ts");
  });

  it("gets a block (with source) by name and suggests near matches", async () => {
    const manifestPath = join(
      mkdtempSync(join(tmpdir(), "domphy-app-")),
      "app-manifest.json",
    );
    writeFileSync(manifestPath, JSON.stringify(blocks));
    process.env.DOMPHY_APP_MANIFEST = manifestPath;
    const found = JSON.parse(await getAppBlock("Hero"));
    expect(found.name).toBe("Hero");
    expect(found.signature).toContain("DomphyElement");
    expect(found.jsdoc).toBe("A hero banner.");
    // source read is best-effort; the field is always present
    expect(typeof found.source).toBe("string");
    expect(await getAppBlock("Her")).toContain("Did you mean");
    expect(await getAppBlock("Xyz")).toContain("No app block named");
  });

  it("does not treat an empty name as a match for every block", async () => {
    const manifestPath = join(
      mkdtempSync(join(tmpdir(), "domphy-app-")),
      "app-manifest.json",
    );
    writeFileSync(manifestPath, JSON.stringify(blocks));
    process.env.DOMPHY_APP_MANIFEST = manifestPath;
    // "".includes("") is always true — an empty name must not suggest every block.
    expect(await getAppBlock("")).not.toContain("Did you mean");
  });

  it("refuses to read a block file that escapes the manifest directory via ..", async () => {
    const manifestDir = mkdtempSync(join(tmpdir(), "domphy-app-"));
    const manifestPath = join(manifestDir, "app-manifest.json");
    // Placed as a sibling of manifestDir so only the (now-guarded)
    // manifestDir-relative candidate can reach it via "../<file>".
    const secretPath = join(tmpdir(), `domphy-secret-${Date.now()}.txt`);
    writeFileSync(secretPath, "TOP SECRET");
    try {
      const evilBlocks = [
        {
          name: "Evil",
          kind: "block",
          file: `../${basename(secretPath)}`,
          signature: 'Evil: DomphyElement<"div">',
          jsdoc: "",
          exportKind: "named",
        },
      ];
      writeFileSync(manifestPath, JSON.stringify(evilBlocks));
      process.env.DOMPHY_APP_MANIFEST = manifestPath;
      const found = JSON.parse(await getAppBlock("Evil"));
      expect(found.source).not.toContain("TOP SECRET");
      expect(found.source).toContain("Could not read source");
    } finally {
      rmSync(secretPath, { force: true });
    }
  });

  it("does not read a no-dotdot path that only exists under the parent root", async () => {
    const parentRoot = mkdtempSync(join(tmpdir(), "domphy-parent-"));
    const manifestDir = join(parentRoot, "a", "b", "manifest");
    mkdirSync(manifestDir, { recursive: true });
    const secretName = `secret-${Date.now()}.txt`;
    const secretPath = join(parentRoot, secretName);
    writeFileSync(secretPath, "TOP SECRET");
    const manifestPath = join(manifestDir, "app-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify([
        {
          name: "Evil",
          kind: "block",
          file: secretName,
          signature: 'Evil: DomphyElement<"div">',
          jsdoc: "",
          exportKind: "named",
        },
      ]),
    );
    process.env.DOMPHY_APP_MANIFEST = manifestPath;
    try {
      const found = JSON.parse(await getAppBlock("Evil"));
      expect(found.source).not.toContain("TOP SECRET");
      expect(found.source).toContain("Could not read source");
    } finally {
      rmSync(secretPath, { force: true });
    }
  });
});

describe("readBlockSource containment", () => {
  it("reads a file under the configured manifest directory", async () => {
    const manifestDir = mkdtempSync(join(tmpdir(), "domphy-app-"));
    const manifestPath = join(manifestDir, "app-manifest.json");
    writeFileSync(manifestPath, "[]");
    writeFileSync(
      join(manifestDir, "hero.ts"),
      "export const Hero = { section: {} }\n",
    );
    process.env.DOMPHY_APP_MANIFEST = manifestPath;
    expect(await readBlockSource("hero.ts")).toContain("export const Hero");
  });

  it("reads a path under process.cwd() (explicit root)", async () => {
    const manifestDir = mkdtempSync(join(tmpdir(), "domphy-app-"));
    process.env.DOMPHY_APP_MANIFEST = join(manifestDir, "app-manifest.json");
    writeFileSync(process.env.DOMPHY_APP_MANIFEST, "[]");
    const toolsFile = fileURLToPath(
      new URL("../src/tools.ts", import.meta.url),
    );
    const fromCwd = relative(process.cwd(), toolsFile);
    expect(fromCwd === "" || !fromCwd.startsWith("..")).toBe(true);
    expect(await readBlockSource(fromCwd)).toContain(
      "export async function readBlockSource",
    );
  });

  it("refuses a path without .. that only exists under the implicit parent root", async () => {
    const parentRoot = mkdtempSync(join(tmpdir(), "domphy-parent-"));
    const manifestDir = join(parentRoot, "a", "b", "manifest");
    mkdirSync(manifestDir, { recursive: true });
    const secretName = `secret-${Date.now()}.txt`;
    const secretPath = join(parentRoot, secretName);
    writeFileSync(secretPath, "TOP SECRET");
    writeFileSync(join(manifestDir, "app-manifest.json"), "[]");
    process.env.DOMPHY_APP_MANIFEST = join(manifestDir, "app-manifest.json");
    try {
      await expect(readBlockSource(secretName)).rejects.toThrow();
    } finally {
      rmSync(secretPath, { force: true });
    }
  });

  it("refuses a .. escape even when the target exists", async () => {
    const manifestDir = mkdtempSync(join(tmpdir(), "domphy-app-"));
    const secretPath = join(tmpdir(), `domphy-secret-${Date.now()}.txt`);
    writeFileSync(secretPath, "TOP SECRET");
    writeFileSync(join(manifestDir, "app-manifest.json"), "[]");
    process.env.DOMPHY_APP_MANIFEST = join(manifestDir, "app-manifest.json");
    try {
      await expect(
        readBlockSource(`../${basename(secretPath)}`),
      ).rejects.toThrow(/refusing to read outside/);
    } finally {
      rmSync(secretPath, { force: true });
    }
  });
});

describe("registered tool names", () => {
  it("the server registers the new app-block + validate tools", async () => {
    const { TOOLS } = await import("../src/handler");
    const names = TOOLS.map((t) => t.name);
    for (const tool of [
      "domphy_validate",
      "domphy_list_app_blocks",
      "domphy_get_app_block",
    ]) {
      expect(names).toContain(tool);
    }
  });
});
