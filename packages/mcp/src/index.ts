#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  diagnoseTree,
  getPatch,
  getRules,
  listPackages,
  listPatches,
} from "./tools.js";

const server = new Server(
  { name: "domphy", version: "0.10.0" },
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
      "Get one patch's full contract (host tag, signature, doc, source).",
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
    name: "domphy_diagnose",
    description:
      "Run @domphy/doctor on a JSON Domphy element tree and return issues to fix (inline-typography, void-content, unknown-tag, …).",
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
      case "domphy_diagnose":
        text = diagnoseTree(String(args.element));
        break;
      default:
        text = `Unknown tool: ${name}`;
    }
  } catch (error) {
    text = `Error: ${(error as Error).message}`;
  }
  return { content: [{ type: "text", text }] };
});

await server.connect(new StdioServerTransport());
