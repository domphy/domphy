import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const REPO = resolve(HERE, "../../..");

const out = [];
const push = (s) => out.push(s);
const hr = () => push("\n\n---\n\n");

push("# Domphy — Full LLM Context\n");
push("> One-shot dump for code generation. Contains: critical rules, quickstart, core runtime docs, theme docs, and every `@domphy/ui` patch source. Prefer the curated `llms.txt` index for targeted lookups.\n");

hr();
push("## Critical rules\n");
push(`- Build UIs as plain objects keyed by HTML tag. Apply patches via \`$\`. Never wrap in components.
- Never inline typography styles. Use typography patches: \`small()\`, \`paragraph()\`, \`heading()\`, \`link()\`, \`strong()\`, \`emphasis()\`, \`code()\`, \`keyboard()\`.
- For forms, compose \`form()\` + \`field()\`. Do NOT wire \`FormState\`/\`FieldState\` manually.
- \`field\` patch \`value\`/\`checked\` must be static defaults, never reactive — reactive bindings loop forever.
- Build tool: tsup. Docs: VitePress.`);

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

async function includeDir(absDir, sectionTitle, stripper = stripVitepress) {
    const files = (await readdir(absDir)).filter((f) => f.endsWith(".md") || f.endsWith(".ts")).sort();
    hr();
    push(`## ${sectionTitle}\n`);
    for (const f of files) {
        const body = await readFile(resolve(absDir, f), "utf8");
        push(`### ${basename(f)}\n`);
        if (f.endsWith(".ts")) {
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

hr();
push("## UI patch source (`@domphy/ui`)\n");
push("Each block is the authoritative source for a patch — signature, props, style object. These are the contracts to follow.\n");
const patchesDir = resolve(REPO, "packages/ui/src/patches");
const patchFiles = (await readdir(patchesDir)).filter((f) => f.endsWith(".ts")).sort();
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
