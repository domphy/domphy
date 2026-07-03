// Generates one demo file + one doc page per @domphy/blocks export (mirroring
// the @domphy/ui patch docs convention: an editable <CodeEditor> playground
// plus a code-group source include), plus a nested sidebar data module for
// press.config.ts. Re-run whenever packages/blocks/registry.json changes.
// Run via `node scripts/generate-blocks-docs.mjs` from apps/web.
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, ".."); // apps/web
const REPO = resolve(HERE, "../../.."); // monorepo root

const registry = JSON.parse(await readFile(resolve(REPO, "packages/blocks/registry.json"), "utf8"));

const demosDir = resolve(ROOT, "docs/demos/blocks");
const docsDir = resolve(ROOT, "docs/blocks");
const sidebarOutPath = resolve(ROOT, "blocks-sidebar.generated.ts");

// Older port batches recorded `filePath` inconsistently (repo-root-relative,
// packages/blocks-relative, or an absolute path) — normalize to always be
// repo-root-relative, e.g. "packages/blocks/src/shadcn/sidebar/sidebar01.ts".
function normalizeFilePath(filePath) {
  const normalized = filePath.split("\\").join("/");
  const anchorIndex = normalized.indexOf("packages/blocks/");
  if (anchorIndex >= 0) return normalized.slice(anchorIndex);
  if (normalized.startsWith("src/")) return `packages/blocks/${normalized}`;
  return normalized;
}

// Group by directory (source/category), not the registry's own free-text
// `category` field — a few "labs" entries recorded a descriptive label there
// (e.g. "Hero / Poster / Motion") that isn't valid as a sidebar/heading key.
function categoryKeyOf(repoRelativePath) {
  const afterSrc = repoRelativePath.slice(repoRelativePath.indexOf("src/") + 4);
  const [source, category] = afterSrc.split("/");
  return { source, category };
}

// fidelityNotes is prose, not markup — mentions of raw tag names like "<a>"
// or "<dialog>" must not be interpreted as inline HTML by the markdown
// renderer (remark), which would swallow/mangle the rest of the paragraph.
function escapeProseForMarkdown(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function frontmatterDescription(fidelityNotes) {
  // YAML scalar, not markdown — angle brackets are harmless here, only
  // backslashes/quotes need escaping for a double-quoted YAML string.
  const firstSentence = (fidelityNotes ?? "").split(". ")[0] || "A composed Domphy block.";
  const escaped = firstSentence.replace(/\\/g, "\\\\").replace(/"/g, "'");
  if (escaped.length <= 160) return `${escaped}.`;
  const truncated = escaped.slice(0, 160);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace)}...`;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function titleCase(kebabOrCamel) {
  return kebabOrCamel
    .replace(/-/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => (/^\d+d$/i.test(word) ? word.toUpperCase() : capitalize(word)))
    .join(" ");
}

const SOURCE_LABELS = { shadcn: "shadcn/ui", magicui: "Magic UI", aceternity: "Aceternity UI" };
const SOURCE_CATALOG_SLUG = { shadcn: "shadcn", magicui: "magicui", aceternity: "aceternity" };

// --- clean slate for generated output (demo files + doc pages only; the 6
// hand-written catalog/overview/methodology/api pages are untouched since
// they live at the same docsDir root — only per-export pages are removed) ---
const HAND_WRITTEN_DOC_PAGES = new Set(["index.md", "shadcn.md", "magicui.md", "aceternity.md", "methodology.md", "api.md"]);

await mkdir(demosDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

for (const name of await readdir(demosDir).catch(() => [])) {
  await rm(resolve(demosDir, name));
}
for (const name of await readdir(docsDir).catch(() => [])) {
  if (!HAND_WRITTEN_DOC_PAGES.has(name)) await rm(resolve(docsDir, name));
}

// --- generate demo + doc page per entry ---
const bySourceCategory = new Map(); // "shadcn/sidebar" -> [entry, ...]

for (const entry of registry) {
  const repoRelativePath = normalizeFilePath(entry.filePath);
  const { source, category } = categoryKeyOf(repoRelativePath);
  const groupKey = `${source}/${category}`;
  if (!bySourceCategory.has(groupKey)) bySourceCategory.set(groupKey, []);
  bySourceCategory.get(groupKey).push({ ...entry, source, category, repoRelativePath });

  const demoVar = `${capitalize(entry.exportName)}Demo`;
  const demoFileName = `${entry.exportName}.ts`;
  await writeFile(
    resolve(demosDir, demoFileName),
    `import { ${entry.exportName} } from "@domphy/blocks";\n\nexport default ${entry.exportName}();\n`,
    "utf8",
  );

  const sourceLabel = SOURCE_LABELS[source] ?? source;
  const catalogSlug = SOURCE_CATALOG_SLUG[source] ?? source;
  const categoryLabel = titleCase(category);

  const doc = [
    "---",
    `title: "@domphy/blocks — ${entry.exportName}"`,
    `description: "${frontmatterDescription(entry.fidelityNotes)}"`,
    "---",
    "",
    `# ${entry.exportName}`,
    "",
    "<script setup lang=\"ts\">",
    `import ${demoVar} from "../demos/blocks/${entry.exportName}.ts?raw"`,
    "</script>",
    "",
    `A **${categoryLabel}** block/component from **[${sourceLabel}](/docs/blocks/${catalogSlug})** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call \`${entry.exportName}()\` with no arguments for a working demo, or edit the code below live.`,
    "",
    `<CodeEditor :code="${demoVar}" />`,
    "",
    "::: details Implementation notes",
    escapeProseForMarkdown(entry.fidelityNotes || "No additional notes recorded."),
    "",
    `Status: **${entry.status}** · Reference: [${sourceLabel} original](${entry.refUrl})`,
    ":::",
    "",
    "::: code-group",
    `<<< ../../../../${repoRelativePath} [${entry.exportName}]`,
    ":::",
    "",
    `[← Back to ${sourceLabel} catalog](/docs/blocks/${catalogSlug})`,
    "",
  ].join("\n");

  await writeFile(resolve(docsDir, `${entry.exportName}.md`), doc, "utf8");
}

console.log(`Wrote ${registry.length} demo files to ${demosDir}`);
console.log(`Wrote ${registry.length} doc pages to ${docsDir}`);

// --- generate nested sidebar data module ---
function sidebarItemsFor(groupKey) {
  const items = bySourceCategory.get(groupKey) ?? [];
  return items
    .slice()
    .sort((a, b) => a.exportName.localeCompare(b.exportName))
    .map((entry) => ({ text: entry.exportName, link: `/docs/blocks/${entry.exportName}` }));
}

const sourceOrder = ["shadcn", "magicui", "aceternity"];
const groupKeysBySource = new Map(sourceOrder.map((source) => [source, []]));
for (const groupKey of bySourceCategory.keys()) {
  const source = groupKey.split("/")[0];
  if (!groupKeysBySource.has(source)) groupKeysBySource.set(source, []);
  groupKeysBySource.get(source).push(groupKey);
}

const sidebarGroups = [];
for (const source of [...groupKeysBySource.keys()]) {
  const groupKeys = groupKeysBySource.get(source).sort();
  const sourceLabel = SOURCE_LABELS[source] ?? source;
  const categoryItems = groupKeys.map((groupKey) => {
    const category = groupKey.split("/")[1];
    return { text: titleCase(category), items: sidebarItemsFor(groupKey) };
  });
  sidebarGroups.push({ text: sourceLabel, items: categoryItems });
}

const sidebarModule = `// AUTO-GENERATED by apps/web/scripts/generate-blocks-docs.mjs — do not hand-edit.
// Re-run that script after packages/blocks/registry.json changes.
export const blocksSidebarGroups = ${JSON.stringify(sidebarGroups, null, 2)};
`;

await writeFile(sidebarOutPath, sidebarModule, "utf8");
console.log(`Wrote generated sidebar data to ${sidebarOutPath}`);
