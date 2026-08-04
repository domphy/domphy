import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, Server } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleToolCall, TOOLS } from "../src/handler";
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
// in the handler's tool list.
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

describe("registered tool surface", () => {
  it("registers exactly 10 tools, in the contracted order", () => {
    expect(TOOLS.map((t) => t.name)).toEqual(REGISTERED_TOOLS);
  });

  it("declares the required argument of each arg-taking tool", () => {
    const required = Object.fromEntries(
      TOOLS.map((t) => [
        t.name,
        (t.inputSchema as { required?: string[] }).required ?? [],
      ]),
    );
    for (const tool of [
      "domphy_get_patch",
      "domphy_diagnose",
      "domphy_validate",
      "domphy_fix",
      "domphy_get_app_block",
    ]) {
      expect(required[tool].length).toBe(1);
    }
  });
});

// Functional round-trip: build a server wired EXACTLY like index.ts (same
// TOOLS list, same handleToolCall dispatch) and drive it through an in-memory
// MCP Client, so the isError contract is exercised as real behavior.
function buildTestServer(): Server {
  const server = new Server(
    { name: "domphy-test", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler("tools/list", async () => ({
    tools: TOOLS,
  }));
  server.setRequestHandler("tools/call", async (request) =>
    handleToolCall(
      request.params.name,
      request.params.arguments as Record<string, unknown> | undefined,
    ),
  );
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
    // domphy_rules hits the network; a rejecting fetch makes the tool throw.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }),
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const server = buildTestServer();
    const client = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = (await client.callTool({
      name: "domphy_rules",
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
