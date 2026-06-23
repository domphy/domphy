import { mkdtempSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fixTree,
  getAppBlock,
  getRules,
  getTones,
  listPackages,
} from "../src/tools";

const manifest = {
  version: "0.17.0",
  packages: [
    {
      name: "@domphy/core",
      version: "0.17.0",
      description: "reactive core",
      subpaths: [],
      peerDependencies: [],
    },
    {
      name: "@domphy/ui",
      version: "0.17.0",
      description: "patches",
      subpaths: [],
      peerDependencies: [],
    },
  ],
  patches: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DOMPHY_APP_MANIFEST;
});

describe("fixTree", () => {
  it("applies lossless void-content fixes and reports the remainder", () => {
    const result = JSON.parse(
      fixTree(
        JSON.stringify({
          div: [
            { input: "oops" }, // void-content -> auto-fixed
            { p: "x", style: { fontSize: "20px" } }, // inline-typography -> remains
          ],
        }),
      ),
    );
    expect(result.applied.map((a: { rule: string }) => a.rule)).toContain(
      "void-content",
    );
    // the void content was cleared to null in the returned tree
    expect(result.tree.div[0].input).toBe(null);
    // the semantic issue is left for the model/human
    expect(result.report.issues.map((i: { rule: string }) => i.rule)).toContain(
      "inline-typography",
    );
  });

  it("is a no-op for a clean tree", () => {
    const result = JSON.parse(fixTree(JSON.stringify({ div: "hi" })));
    expect(result.applied).toEqual([]);
    expect(result.report.ok).toBe(true);
  });

  it("handles invalid JSON", () => {
    expect(fixTree("{not json")).toContain("Invalid JSON");
  });
});

describe("network-backed tools (stubbed fetch)", () => {
  it("getRules fetches /llms.txt and returns its text", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("/llms.txt");
      return { ok: true, text: async () => "RULE: use patches" };
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await getRules()).toBe("RULE: use patches");
  });

  it("getTones fetches /tones.json and returns its text", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("/tones.json");
      return { ok: true, text: async () => '{"tones":["base"]}' };
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await getTones()).toContain("base");
  });

  it("listPackages fetches the manifest and lists name@version — description", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => manifest })),
    );
    const out = await listPackages();
    expect(out).toContain("@domphy/core@0.17.0 — reactive core");
    expect(out).toContain("@domphy/ui@0.17.0 — patches");
  });
});

describe("error paths", () => {
  it("loadManifest throws on a non-ok response", async () => {
    // loadManifest caches a successful result module-wide, and earlier tests in
    // this file populate it; reset the module registry so we get a fresh,
    // empty-cache instance and actually hit the fetch.
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    const fresh = await import("../src/tools");
    await expect(fresh.loadManifest()).rejects.toThrow(
      /Failed to fetch manifest: 503/,
    );
  });

  it("getRules throws on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    await expect(getRules()).rejects.toThrow(/Failed to fetch rules: 500/);
  });
});

describe("getAppBlock source-read failure", () => {
  it("returns the block JSON with a source-read error note when the file is missing", async () => {
    const blocks = [
      {
        name: "Hero",
        kind: "block",
        file: "does/not/exist/hero.ts",
        signature: 'Hero: DomphyElement<"section">',
        jsdoc: "A hero banner.",
        exportKind: "named",
      },
    ];
    const manifestPath = join(
      mkdtempSync(join(tmpdir(), "domphy-app-")),
      "app-manifest.json",
    );
    writeFileSync(manifestPath, JSON.stringify(blocks));
    process.env.DOMPHY_APP_MANIFEST = manifestPath;
    const found = JSON.parse(await getAppBlock("Hero"));
    expect(found.name).toBe("Hero");
    // the metadata is still returned even though the source could not be read
    expect(found.signature).toContain("DomphyElement");
    expect(found.source).toContain("Could not read source");
  });
});

// The 10 tools the server is contracted to register, in the order they appear
// in index.ts. Every one must have a matching switch case in the handler.
const REGISTERED_TOOLS = [
  "domphy_list_patches",
  "domphy_get_patch",
  "domphy_list_packages",
  "domphy_rules",
  "domphy_tones",
  "domphy_diagnose",
  "domphy_validate",
  "domphy_fix",
  "domphy_list_app_blocks",
  "domphy_get_app_block",
];

describe("server source contract", () => {
  it("registers exactly 10 tools and every switch case maps to a registered tool", async () => {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const source = await readFile(join(here, "../src/index.ts"), "utf8");

    // Every expected tool appears both as a registered `name:` and as a `case`.
    for (const tool of REGISTERED_TOOLS) {
      expect(source).toContain(`name: "${tool}"`);
      expect(source).toContain(`case "${tool}":`);
    }
    // Count of registered tool entries is exactly 10 (no extras, none missing).
    const nameCount = (source.match(/name: "domphy_/g) ?? []).length;
    expect(nameCount).toBe(10);
    // Count of switch cases is exactly 10 (each case maps to a registered tool).
    const caseCount = (source.match(/case "domphy_/g) ?? []).length;
    expect(caseCount).toBe(10);
  });

  it("sets isError on both the unknown-tool branch and the top-level catch", async () => {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const source = await readFile(join(here, "../src/index.ts"), "utf8");
    // two isError: true sites (default branch + catch)
    const isErrorCount = (source.match(/isError: true/g) ?? []).length;
    expect(isErrorCount).toBe(2);
  });
});

// Functional round-trip: build a server with the SAME handler shape as index.ts
// (importing the real tool implementations) and drive it through an in-memory
// MCP Client, so the isError contract is exercised as real behavior — not just
// asserted in source. We cannot import src/index.ts directly because it opens a
// stdio transport at module load.
function buildTestServer(): Server {
  const tools = REGISTERED_TOOLS.map((name) => ({
    name,
    description: name,
    inputSchema: { type: "object" as const, properties: {} },
  }));
  const server = new Server(
    { name: "domphy-test", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    let text: string;
    try {
      switch (name) {
        case "domphy_fix":
          text = fixTree(String(args.element));
          break;
        case "domphy_throws":
          throw new Error("boom");
        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text }] };
  });
  return server;
}

describe("server isError behavior (functional round-trip)", () => {
  it("an unknown tool returns isError:true through the MCP client", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const server = buildTestServer();
    const client = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = (await client.callTool({
      name: "no_such_tool",
      arguments: {},
    })) as { isError?: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool: no_such_tool");

    await client.close();
    await server.close();
  });

  it("a throwing tool returns isError:true through the MCP client", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const server = buildTestServer();
    const client = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = (await client.callTool({
      name: "domphy_throws",
      arguments: {},
    })) as { isError?: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error: boom");

    await client.close();
    await server.close();
  });

  it("a successful tool result has no isError flag", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const server = buildTestServer();
    const client = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = (await client.callTool({
      name: "domphy_fix",
      arguments: { element: JSON.stringify({ div: "hi" }) },
    })) as { isError?: boolean; content: { text: string }[] };
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('"applied"');

    await client.close();
    await server.close();
  });
});
