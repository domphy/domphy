#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { handleToolCall, SERVER_VERSION, TOOLS } from "./handler.js";

// Thin stdio bootstrap only — all logic lives in handler.ts (transport-free,
// unit-testable). This module is the CLI entry; do not import it from tests.
const server = new Server(
  { name: "domphy", version: SERVER_VERSION },
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

await server.connect(new StdioServerTransport());
