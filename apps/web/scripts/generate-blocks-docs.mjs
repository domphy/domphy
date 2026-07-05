// Generates one demo file + one doc page per @domphy/blocks export (mirroring
// the @domphy/ui patch docs convention: an editable <CodeEditor> playground
// plus a code-group source include), plus a nested sidebar data module for
// press.config.ts. Re-run whenever packages/blocks/registry.json changes.
// Run via `node scripts/generate-blocks-docs.mjs` from apps/web.
//
// Each doc page's "## Props" table is parsed straight from the block's own
// source with the TypeScript compiler API (mirrors apps/web/scripts/
// manifest.mjs's approach for @domphy/ui patches) — never hand-maintained,
// never drifts. Blocks document each prop with a plain leading JSDoc comment
// directly on the interface member (not `@param` tags on the function, which
// is the ui-patch convention) — extraction reads that.
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, ".."); // apps/web
const REPO = resolve(HERE, "../../.."); // monorepo root

const registry = JSON.parse(await readFile(resolve(REPO, "packages/blocks/registry.json"), "utf8"));

// --- typescript compiler API (same dynamic-resolve trick as manifest.mjs —
// `typescript` isn't hoisted to the repo root in this pnpm layout) ---
async function loadModule(specifier, anchors) {
  for (const anchor of anchors) {
    try {
      const require = createRequire(anchor);
      const resolved = require.resolve(specifier);
      return await import(`file://${resolved}`);
    } catch {
      // try the next anchor
    }
  }
  throw new Error(`Cannot resolve "${specifier}" from any known anchor.`);
}
const tsModule = await loadModule("typescript", [
  resolve(REPO, "packages/doctor/package.json"),
  resolve(REPO, "packages/mcp/package.json"),
  resolve(REPO, "package.json"),
]);
const ts = tsModule.default ?? tsModule;

const oneLine = (text) => text.replace(/\s+/g, " ").trim();

function propertyKeyText(nameNode) {
  if (ts.isIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteral(nameNode)) return nameNode.text;
  return undefined;
}

function typeReferenceName(typeNode) {
  if (typeNode && ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName;
    return ts.isQualifiedName(name) ? name.right.text : name.text;
  }
  return undefined;
}

function commentText(comment) {
  if (typeof comment === "string") return oneLine(comment);
  if (Array.isArray(comment)) return oneLine(comment.map((part) => part.text ?? "").join(""));
  return "";
}

/** Resolves a named type to the member list of its object-literal shape, if any. */
function membersOfNamedType(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) {
      return statement.members;
    }
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === name &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      return statement.type.members;
    }
  }
  return null;
}

/** A handful of blocks (the sidebar01-04 family) import their props type from
 * a "-shared.ts" companion file rather than declaring it locally — falls back
 * to resolving it from the importing file's own import declarations. One
 * level only (the shared file itself re-exporting from a third file isn't a
 * pattern used anywhere in this package today). */
async function membersOfImportedType(sourceFile, sourceDir, name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
    const bindings = statement.importClause.namedBindings;
    if (!ts.isNamedImports(bindings)) continue;
    const matches = bindings.elements.some((el) => (el.propertyName ?? el.name).text === name);
    if (!matches) continue;

    const specifier = statement.moduleSpecifier.text; // e.g. "./sidebar01-04-shared.js"
    if (!specifier.startsWith(".")) continue; // only chase relative imports, not @domphy/* packages
    const importedPath = resolve(sourceDir, specifier).replace(/\.js$/, ".ts");
    const importedSource = await readFile(importedPath, "utf8").catch(() => null);
    if (!importedSource) continue;
    const importedFile = ts.createSourceFile(importedPath, importedSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const members = membersOfNamedType(importedFile, name);
    if (members) return { members, sourceFile: importedFile };
  }
  return null;
}

/** Blocks document each prop with a plain leading JSDoc comment on the
 * interface member itself (`/** ... *\/ foo?: string`), not `@param` tags on
 * the function — read that comment directly off the member node. */
function memberJsDoc(member) {
  for (const doc of ts.getJSDocCommentsAndTags(member)) {
    if (ts.isJSDoc(doc) && doc.comment) return commentText(doc.comment);
  }
  return "";
}

/** Extracts props [{ name, type, optional, doc }] from a block factory
 * function's first parameter, by name (blocks aren't required to be the
 * only function declaration in a "-shared.ts" file). Falls back to the
 * importing file's own imports when the props type isn't declared locally
 * (the sidebar01-04 family imports `SidebarBlockOptions` from a shared file). */
async function extractBlockProps(sourceFile, sourceDir, exportName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;
    if (statement.name.text !== exportName) continue;

    const param = statement.parameters?.[0];
    if (!param || !param.type) return [];

    let members = null;
    let membersSourceFile = sourceFile;
    if (ts.isTypeLiteralNode(param.type)) {
      members = param.type.members;
    } else if (ts.isTypeReferenceNode(param.type)) {
      const typeName = typeReferenceName(param.type);
      members = membersOfNamedType(sourceFile, typeName);
      if (!members) {
        const imported = await membersOfImportedType(sourceFile, sourceDir, typeName);
        if (imported) {
          members = imported.members;
          membersSourceFile = imported.sourceFile;
        }
      }
    }
    if (!members) return [];

    const props = [];
    for (const member of members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const name = propertyKeyText(member.name);
      if (!name) continue;
      props.push({
        name,
        type: member.type ? oneLine(member.type.getText(membersSourceFile)) : "unknown",
        optional: Boolean(member.questionToken),
        doc: memberJsDoc(member),
      });
    }
    return props;
  }
  return [];
}

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

// GFM table cells split on literal "|" at the line level, before any inline
// markdown/code-span parsing runs — even a `|` inside backticks must be
// escaped or it silently truncates the row.
function escapeTableCell(text) {
  return escapeProseForMarkdown(text).replace(/\|/g, "\\|");
}

function renderPropsSection(props) {
  if (props.length === 0) {
    return "## Props\n\nThis block takes no configurable props — call it with no arguments for the default demo.";
  }
  const rows = props.map((prop) => {
    const name = prop.optional ? `\`${prop.name}\`` : `\`${prop.name}\` (required)`;
    const type = `\`${escapeTableCell(prop.type)}\``;
    const description = escapeTableCell(prop.doc || "—");
    return `| ${name} | ${type} | ${description} |`;
  });
  return ["## Props", "", "| Prop | Type | Description |", "|---|---|---|", ...rows].join("\n");
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

const SOURCE_LABELS = { shadcn: "shadcn/ui", magicui: "Magic UI" };
const SOURCE_CATALOG_SLUG = { shadcn: "shadcn", magicui: "magicui" };

// --- clean slate for generated output (demo files + doc pages only; the
// hand-written catalog/overview/methodology/api pages are untouched since
// they live at the same docsDir root — only per-export pages are removed) ---
const HAND_WRITTEN_DOC_PAGES = new Set(["index.md", "shadcn.md", "magicui.md", "methodology.md", "api.md"]);

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

  const absoluteSourcePath = resolve(REPO, repoRelativePath);
  const blockSource = await readFile(absoluteSourcePath, "utf8");
  const blockSourceFile = ts.createSourceFile(entry.exportName, blockSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const props = await extractBlockProps(blockSourceFile, dirname(absoluteSourcePath), entry.exportName);

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
    renderPropsSection(props),
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

const sourceOrder = ["shadcn", "magicui"];
const groupKeysBySource = new Map(sourceOrder.map((source) => [source, []]));
for (const groupKey of bySourceCategory.keys()) {
  const source = groupKey.split("/")[0];
  if (!groupKeysBySource.has(source)) groupKeysBySource.set(source, []);
  groupKeysBySource.get(source).push(groupKey);
}

// Skip sources with zero groups — a source can go from "has entries" to
// "fully removed from the registry" (e.g. the Aceternity UI purge), and a
// pre-seeded-but-now-empty Map entry must not surface as an empty sidebar
// heading with no children under it.
const sidebarGroups = [];
for (const source of [...groupKeysBySource.keys()]) {
  const groupKeys = groupKeysBySource.get(source).sort();
  if (groupKeys.length === 0) continue;
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
