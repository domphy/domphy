// Ad-hoc stdio smoke test for the built server (not a vitest — spawns the real
// CLI). Speaks JSON-RPC over stdio: initialize, tools/list, then a few tool
// calls, incl. domphy_diagnose on a sample tree.
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const serverPath = resolve("packages/mcp/dist/index.js");
const child = spawn(process.execPath, [serverPath], {
  env: {
    ...process.env,
    DOMPHY_APP_MANIFEST: resolve("apps/web/public/app-manifest.json"),
  },
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const pending = new Map();
let nextId = 1;

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    index = buffer.indexOf("\n");
    if (!line) continue;
    const message = JSON.parse(line);
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  }
});

function request(method, params) {
  const id = nextId++;
  return new Promise((resolvePromise, reject) => {
    pending.set(id, resolvePromise);
    setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 30000);
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
    );
  });
}

function notify(method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
}

const init = await request("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "smoke", version: "0.0.0" },
});
console.log("initialize ->", JSON.stringify(init.result.serverInfo));

notify("notifications/initialized", {});

const tools = await request("tools/list", {});
console.log("tools/list ->", tools.result.tools.length, "tools");
console.log("  names:", tools.result.tools.map((t) => t.name).join(", "));

async function call(name, args) {
  const res = await request("tools/call", { name, arguments: args });
  const text = res.result.content[0].text;
  console.log(
    `${name} -> isError=${Boolean(res.result.isError)} ${text.slice(0, 160).replace(/\n/g, " | ")}`,
  );
  return res.result;
}

await call("domphy_diagnose", {
  element: JSON.stringify({ div: [{ input: "oops" }, { p: "hi" }] }),
});
await call("domphy_validate", { element: JSON.stringify({ div: "hi" }) });
await call("domphy_tones", {});
await call("domphy_list_packages", {});
await call("domphy_get_patch", { name: "button" });
await call("domphy_get_patch", { name: "nonexistent" });
await call("domphy_list_app_blocks", {});
await call("domphy_get_app_block", { name: "nonexistent" });
await call("domphy_unknown_tool", {});
// missing-arg path
await call("domphy_diagnose", {});

child.kill();
process.exit(0);
