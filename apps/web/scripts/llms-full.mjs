import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const REPO = resolve(HERE, "../../..");

const out = [];
const push = (s) => out.push(s);
const hr = () => push("\n\n---\n\n");

push("# Domphy — Full LLM Context\n");
push(
  "> One-shot dump for code generation. Contains: critical rules, quickstart, core runtime docs, theme docs, and every `@domphy/ui` patch source. Prefer the curated `llms.txt` index for targeted lookups.\n",
);

hr();
// Critical rules are owned by AGENTS.md at the repo root — embed it verbatim so
// this dump never keeps its own drifting copy. AGENTS.md is plain Markdown (no
// VitePress syntax) so it needs no stripping.
push("## Critical rules (AGENTS.md — canonical source)\n");
push((await readFile(resolve(REPO, "AGENTS.md"), "utf8")).trim());

const stripVitepress = (md) =>
  md
    .replace(/<script setup[\s\S]*?<\/script>\s*/g, "")
    .replace(/<<<\s+@([^\n]+)/g, "// source: $1")
    .replace(/<<<\s+([^\n]+)/g, "// source: $1")
    .replace(/!!!include\(([^)]+)\)!!!/g, "// include: $1")
    .replace(/<CodeEditor[^/]*\/>/g, "")
    .replace(/<DomphyPreview[^/]*\/>/g, "")
    .replace(/:::\s*[a-z-]+(?:\s+[^\n]*)?/g, "")
    .replace(/^:::$/gm, "")
    .replace(/\n{3,}/g, "\n\n");

async function includeFile(absPath, title) {
  try {
    const body = await readFile(absPath, "utf8");
    hr();
    push(`## ${title}\n`);
    push(stripVitepress(body).trim());
  } catch (e) {
    console.warn(`skip ${title}: ${e.message}`);
  }
}

async function collectFiles(absDir, prefix = "") {
  const entries = await readdir(absDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      const sub = await collectFiles(
        resolve(absDir, entry.name),
        prefix ? `${prefix}/${entry.name}` : entry.name,
      );
      results.push(...sub);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".ts")) {
      results.push({
        absPath: resolve(absDir, entry.name),
        relLabel: prefix ? `${prefix}/${entry.name}` : entry.name,
        name: entry.name,
      });
    }
  }
  return results;
}

async function includeDir(absDir, sectionTitle, stripper = stripVitepress) {
  const files = await collectFiles(absDir);
  hr();
  push(`## ${sectionTitle}\n`);
  for (const { absPath, relLabel, name } of files) {
    const body = await readFile(absPath, "utf8");
    push(`### ${relLabel}\n`);
    if (name.endsWith(".ts")) {
      push("```ts");
      push(body.trim());
      push("```\n");
    } else {
      push(stripper(body).trim());
      push("");
    }
  }
}

await includeFile(resolve(ROOT, "docs/index.md"), "Landing");
await includeFile(resolve(ROOT, "docs/quickstart.md"), "Quickstart");

await includeDir(resolve(ROOT, "docs/core"), "Core docs");
await includeDir(resolve(ROOT, "docs/theme"), "Theme docs");
await includeDir(resolve(ROOT, "docs/query"), "Query docs (`@domphy/query`)");
await includeDir(
  resolve(ROOT, "docs/router"),
  "Router docs (`@domphy/router`)",
);
await includeDir(resolve(ROOT, "docs/table"), "Table docs (`@domphy/table`)");
await includeDir(
  resolve(ROOT, "docs/virtual"),
  "Virtual docs (`@domphy/virtual`)",
);
await includeDir(resolve(ROOT, "docs/form"), "Form docs (`@domphy/form`)");
await includeDir(resolve(ROOT, "docs/dnd"), "DnD docs (`@domphy/dnd`)");
await includeDir(
  resolve(ROOT, "docs/palette"),
  "Palette docs (`@domphy/palette`)",
);
await includeDir(resolve(ROOT, "docs/app"), "App docs (`@domphy/app`)");
await includeDir(
  resolve(ROOT, "docs/markdown"),
  "Markdown docs (`@domphy/markdown`)",
);
await includeDir(
  resolve(ROOT, "docs/mermaid"),
  "Mermaid docs (`@domphy/mermaid`)",
);
await includeDir(
  resolve(ROOT, "docs/doctor"),
  "Doctor docs (`@domphy/doctor`)",
);

hr();
push("## UI patch source (`@domphy/ui`)\n");
push(
  "Each block is the authoritative source for a patch — signature, props, style object. These are the contracts to follow.\n",
);
const patchesDir = resolve(REPO, "packages/ui/src/patches");
const patchFiles = (await readdir(patchesDir))
  .filter((f) => f.endsWith(".ts"))
  .sort();
for (const f of patchFiles) {
  const body = await readFile(resolve(patchesDir, f), "utf8");
  push(`### ${basename(f, ".ts")}\n`);
  push("```ts");
  push(body.trim());
  push("```\n");
}

const dest = resolve(ROOT, "public/llms-full.txt");
await writeFile(dest, out.join("\n"), "utf8");
console.log(`wrote ${dest} (${out.join("\n").length} bytes)`);
