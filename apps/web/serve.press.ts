import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "@domphy/press";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, ".vitepress", "dist");
const port = Number(process.argv[2]) || 4173;

if (!existsSync(root)) {
  console.error(`No build at ${root}. Run "pnpm build" first.`);
  process.exit(1);
}

startServer(root, port);
