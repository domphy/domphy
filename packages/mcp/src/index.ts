#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleToolCall, SERVER_VERSION, TOOLS } from "./handler.js";

// Thin stdio bootstrap only — all logic lives in handler.ts (transport-free,
// unit-testable). This module is the CLI entry; do not import it from tests.
const server = new Server(
  { name: "domphy", version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(
    request.params.name,
    request.params.arguments as Record<string, unknown> | undefined,
  ),
);

await server.connect(new StdioServerTransport());
