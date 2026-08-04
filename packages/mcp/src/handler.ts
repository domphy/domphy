import { readFileSync } from "node:fs";
import type { Tool } from "@modelcontextprotocol/server";
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

/**
 * Transport-free request handling for the Domphy MCP server: the tool list,
 * the server version, and the CallTool dispatch. index.ts only wires these to
 * a stdio transport, so tests drive this module directly.
 */

// Read the version from package.json at runtime so it can never drift from the
// published package (src/ and dist/ both sit one level below package.json).
export const SERVER_VERSION: string = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

// Annotated as Tool[] so the literal `type: "object"` members are checked
// against the spec type instead of widening to string (v2 types the
// tools/list handler return from the method name).
export const TOOLS: Tool[] = [
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
      'Get the valid tone names and theme color names for themeColor()/dataTone (e.g. themeColor(l, "text", "primary"), same as themeColor(l, "shift-9", "primary")). Includes the semantic aliases (surface/hover/border/border-strong/muted/text) — prefer those over invented tone words.',
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

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  // The SDK's CallToolResult is a passthrough object; keep the index signature
  // so ToolResult stays assignable to it.
  [key: string]: unknown;
}

function errorResult(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

// Tools that require a string argument. Validated before dispatch so a missing
// or mistyped argument never reaches String() coercion as "undefined".
const REQUIRED_STRING_ARGS: Record<string, string> = {
  domphy_get_patch: "name",
  domphy_diagnose: "element",
  domphy_validate: "element",
  domphy_fix: "element",
  domphy_get_app_block: "name",
};

function missingArgument(name: string, arg: string): ToolResult {
  return errorResult(
    `Missing argument: "${arg}" (tool ${name} requires a string "${arg}" argument)`,
  );
}

/**
 * Dispatches one CallTool request to its tool implementation. Unknown tools,
 * missing/invalid arguments, and thrown handler errors all come back as
 * structured results with `isError: true` — never as a hang or a throw.
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
): Promise<ToolResult> {
  const requiredArg = REQUIRED_STRING_ARGS[name];
  if (requiredArg !== undefined && typeof args?.[requiredArg] !== "string") {
    return missingArgument(name, requiredArg);
  }
  let text: string;
  try {
    switch (name) {
      case "domphy_list_patches":
        text = await listPatches();
        break;
      case "domphy_get_patch":
        text = await getPatch(args?.name as string);
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
        text = diagnoseTree(args?.element as string);
        break;
      case "domphy_validate":
        text = validateTree(args?.element as string);
        break;
      case "domphy_fix":
        text = fixTree(args?.element as string);
        break;
      case "domphy_list_app_blocks":
        text = await listAppBlocks();
        break;
      case "domphy_get_app_block":
        text = await getAppBlock(args?.name as string);
        break;
      default:
        // Unknown tool is a client error — flag it so callers can distinguish
        // it from a successful result that happens to mention "Unknown".
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // A handler threw — surface a readable message AND mark the result as an
    // error so MCP clients do not treat the failure text as a normal answer.
    return errorResult(`Error: ${(error as Error).message}`);
  }
  return { content: [{ type: "text", text }] };
}
