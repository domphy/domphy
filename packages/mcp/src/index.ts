#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  diagnoseTree,
  fixTree,
  getAppBlock,
  getPatch,
  getRules,
  getTones,
  listAppBlocks,
  listPackages,
  listPatches,
  validateTree,
} from "./tools.js";

// Keep this in lockstep with the `version` field in package.json. The build
// (tsup/esbuild) does not inject the package version, and a JSON import of
// package.json is awkward under this dts/bundle setup, so it is hardcoded here.
// Bump both together on every release.
const SERVER_VERSION = "0.17.0";

const server = new Server(
  { name: "domphy", version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

const tools = [
  {
    name: "domphy_list_patches",
    description: "List every @domphy/ui patch with its host tag and signature.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "domphy_get_patch",
    description:
      "Get one patch's full contract: host tag, signature, props (name/type/optional/doc), example, doc, and source.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "patch name, e.g. button" },
      },
      required: ["name"],
    },
  },
  {
    name: "domphy_list_packages",
    description: "List all @domphy/* packages with versions and descriptions.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "domphy_rules",
    description: "Get the Domphy code-generation rules (llms.txt) to follow.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "domphy_tones",
    description:
      'Get the valid tone names and theme color names for themeColor()/dataTone (e.g. themeColor(l, "shift-9", "primary")). Use this to avoid invented tones like "surface"/"text".',
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "domphy_diagnose",
    description:
      "Run @domphy/doctor on a JSON Domphy element tree and return issues to fix (inline-typography, void-content, unknown-tag, missing/duplicate/unstable _key, …).",
    inputSchema: {
      type: "object",
      properties: {
        element: {
          type: "string",
          description: "JSON of the Domphy element tree",
        },
      },
      required: ["element"],
    },
  },
  {
    name: "domphy_validate",
    description:
      "Run @domphy/doctor's aggregate validate() on a JSON Domphy element tree. Returns a structured report { ok, issues, summary } with severity counts.",
    inputSchema: {
      type: "object",
      properties: {
        element: {
          type: "string",
          description: "JSON of the Domphy element tree",
        },
      },
      required: ["element"],
    },
  },
  {
    name: "domphy_fix",
    description:
      "Apply @domphy/doctor's lossless autofix to a JSON Domphy element tree. Returns { tree, applied, report }; only provably-safe fixes (e.g. void-content) are applied, remaining issues are in report.",
    inputSchema: {
      type: "object",
      properties: {
        element: {
          type: "string",
          description: "JSON of the Domphy element tree",
        },
      },
      required: ["element"],
    },
  },
  {
    name: "domphy_list_app_blocks",
    description:
      "List the current app's OWN reusable Domphy blocks (name, kind, signature, file) from its app-manifest.json. Run `app-manifest.mjs` first if absent.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "domphy_get_app_block",
    description:
      "Get one app block's full source plus signature and jsdoc, by name, from the app-manifest.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "app block name, e.g. App" },
      },
      required: ["name"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  let text: string;
  try {
    switch (name) {
      case "domphy_list_patches":
        text = await listPatches();
        break;
      case "domphy_get_patch":
        text = await getPatch(String(args.name));
        break;
      case "domphy_list_packages":
        text = await listPackages();
        break;
      case "domphy_rules":
        text = await getRules();
        break;
      case "domphy_tones":
        text = await getTones();
        break;
      case "domphy_diagnose":
        text = diagnoseTree(String(args.element));
        break;
      case "domphy_validate":
        text = validateTree(String(args.element));
        break;
      case "domphy_fix":
        text = fixTree(String(args.element));
        break;
      case "domphy_list_app_blocks":
        text = await listAppBlocks();
        break;
      case "domphy_get_app_block":
        text = await getAppBlock(String(args.name));
        break;
      default:
        // Unknown tool is a client error — flag it so callers can distinguish
        // it from a successful result that happens to mention "Unknown".
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    // A handler threw — surface a readable message AND mark the result as an
    // error so MCP clients do not treat the failure text as a normal answer.
    return {
      content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
  return { content: [{ type: "text", text }] };
});

await server.connect(new StdioServerTransport());
