// Generates apps/web/public/manifest.json — a machine-readable index of every
// @domphy package and every @domphy/ui patch (name, host tag, props schema, doc,
// example). Also writes apps/web/public/tones.json (valid tone names + theme
// color names). Agents/MCP query these for a deterministic API surface.
// Auto-generated, never drifts. Parses patch source with the TypeScript compiler
// API (no regex), so prop names/types/optionality come straight from the
// declarations and descriptions from JSDoc. Run via `pnpm --filter domphy-web
// run manifest` (also part of build).
import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, ".."); // apps/web
const REPO = resolve(HERE, "../../.."); // monorepo root

/** Write JSON then biome-format so `pnpm check` stays green after build. */
async function writeFormattedJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  // Resolve the monorepo biome binary directly — `pnpm exec`/`pnpm.cmd` is
  // unreliable under execFileSync on Windows (silent no-op → dirty check).
  const biomeCli = resolve(REPO, "node_modules/@biomejs/biome/bin/biome");
  execFileSync(process.execPath, [biomeCli, "format", "--write", path], {
    cwd: REPO,
    stdio: "pipe",
  });
}

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

// `typescript` / `@domphy/theme` are not hoisted to the repo root in this pnpm
// layout, so resolve them from a package that declares them. Try several anchors
// so the script keeps working if the layout shifts.
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

// --- packages ---
const pkgDir = resolve(REPO, "packages");
const pkgNames = (await readdir(pkgDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const packages = [];
for (const name of pkgNames) {
  try {
    const p = await readJson(resolve(pkgDir, name, "package.json"));
    // "private": true packages (e.g. @domphy/pages) are internal/parked —
    // never published, never a public import — so they don't belong in a
    // manifest whose whole point is "what can a consumer import".
    if (p.private) continue;
    packages.push({
      name: p.name,
      version: p.version,
      description: p.description ?? "",
      subpaths: Object.keys(p.exports ?? { ".": true }),
      peerDependencies: Object.keys(p.peerDependencies ?? {}),
    });
  } catch {
    // not a publishable package
  }
}

// --- TS helpers (no regex) ---
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

// Patch factories return either a PartialElement (a `$`-patch merged onto the
// host element) or a full DomphyElement (e.g. toolbarSpacer). Both belong in
// the registry.
const PATCH_RETURN_TYPES = new Set(["PartialElement", "DomphyElement"]);

function returnsPatchElement(fn) {
  const name = typeReferenceName(fn.type);
  return name !== undefined && PATCH_RETURN_TYPES.has(name);
}

function commentText(comment) {
  if (typeof comment === "string") return oneLine(comment);
  if (Array.isArray(comment))
    return oneLine(comment.map((part) => part.text ?? "").join(""));
  return "";
}

/** Rightmost identifier of a `@param props.color` style tag name. */
function paramTagKey(tag) {
  const name = tag.name;
  if (!name) return undefined;
  if (ts.isQualifiedName(name)) return name.right.text;
  if (ts.isIdentifier(name)) return name.text;
  return undefined;
}

/** Pulls summary, @hostTag, @example and per-prop @param docs off a node's JSDoc. */
function readJsDoc(node) {
  let summary = "";
  let hostTag = null;
  let example = "";
  const paramDocs = new Map();

  const visitTag = (tag) => {
    const tagName = tag.tagName?.text;
    if (tagName === "hostTag") {
      hostTag = commentText(tag.comment) || null;
    } else if (tagName === "example" && !example) {
      example = commentText(tag.comment);
    } else if (tagName === "param") {
      const key = paramTagKey(tag);
      // JSDoc `@param name - desc` keeps the "- " separator in the comment; drop
      // a single leading dash so the stored description reads cleanly.
      if (key)
        paramDocs.set(key, commentText(tag.comment).replace(/^-\s*/, ""));
    }
  };

  for (const doc of ts.getJSDocCommentsAndTags(node)) {
    if (ts.isJSDoc(doc)) {
      if (!summary) summary = commentText(doc.comment);
      for (const tag of doc.tags ?? []) visitTag(tag);
    } else {
      visitTag(doc);
    }
  }
  return { summary, hostTag, example, paramDocs };
}

/** Resolves a named type alias/interface to its type NODE (not yet flattened). */
function namedTypeNode(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) {
      return statement;
    }
    if (ts.isTypeAliasDeclaration(statement) && statement.name.text === name) {
      return statement.type;
    }
  }
  return null;
}

// Recursively flattens a type node into its property-signature members,
// keyed by name (last write wins — good enough for a manifest's "what props
// exist" question, not a structural-typing checker). Handles the shapes
// patch prop types actually use in this codebase:
//   { a, b }                    TypeLiteral — its own members
//   A & B                       Intersection — union of both sides' members
//   A | B                       Union (e.g. a discriminated variant prop
//                                like ImageProps's alt/decorative pair) —
//                                union of every branch's members, so a prop
//                                that exists on ANY branch is documented
//   SomeInterface / SomeAlias   TypeReference — resolve then recurse
function collectMembers(sourceFile, typeNode, seen = new Set()) {
  if (!typeNode) return new Map();
  if (ts.isTypeLiteralNode(typeNode)) {
    const map = new Map();
    for (const member of typeNode.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const name = propertyKeyText(member.name);
      if (name) map.set(name, member);
    }
    return map;
  }
  if (ts.isIntersectionTypeNode(typeNode) || ts.isUnionTypeNode(typeNode)) {
    const map = new Map();
    for (const part of typeNode.types) {
      for (const [name, member] of collectMembers(sourceFile, part, seen)) {
        map.set(name, member);
      }
    }
    return map;
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeReferenceName(typeNode);
    if (!name || seen.has(name)) return new Map();
    seen.add(name);
    const resolved = namedTypeNode(sourceFile, name);
    if (!resolved) return new Map();
    if (ts.isInterfaceDeclaration(resolved)) {
      const map = new Map();
      for (const member of resolved.members) {
        if (!ts.isPropertySignature(member) || !member.name) continue;
        const propName = propertyKeyText(member.name);
        if (propName) map.set(propName, member);
      }
      return map;
    }
    return collectMembers(sourceFile, resolved, seen);
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return collectMembers(sourceFile, typeNode.type, seen);
  }
  return new Map();
}

/** Extracts props [{ name, type, optional, doc }] from a patch fn's first param. */
function extractProps(fn, sourceFile, paramDocs) {
  const param = fn.parameters?.[0];
  if (!param || !param.type) return [];

  const members = collectMembers(sourceFile, param.type);
  const props = [];
  for (const [name, member] of members) {
    props.push({
      name,
      type: member.type ? oneLine(member.type.getText(sourceFile)) : "unknown",
      optional: Boolean(member.questionToken),
      doc: paramDocs.get(name) ?? "",
    });
  }
  props.sort((a, b) => a.name.localeCompare(b.name));
  return props;
}

/** Source-level fallback for a host tag: a `node.tagName !== "x"` guard. */
function hostTagFromGuard(source) {
  const match = source.match(/tagName\s*[!=]==?\s*["']([a-z0-9]+)["']/i);
  return match ? match[1] : null;
}

function renderSignature(name, fn, sourceFile) {
  const params = (fn.parameters ?? [])
    .map((p) => oneLine(p.getText(sourceFile)))
    .join(", ");
  return `${name}(${params})`;
}

// --- ui patches ---
const patchesDir = resolve(REPO, "packages/ui/src/patches");
const patchFiles = (await readdir(patchesDir))
  .filter((f) => f.endsWith(".ts"))
  .sort();

const patches = [];
for (const file of patchFiles) {
  const source = await readFile(resolve(patchesDir, file), "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );

  // Names exported via `export { a, b }` — patches export their functions there.
  const exported = new Set();
  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        exported.add(specifier.propertyName?.text ?? specifier.name.text);
      }
    }
  }

  const guardHost = hostTagFromGuard(source);

  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;
    const name = statement.name.text;
    if (!exported.has(name)) continue;
    if (!returnsPatchElement(statement)) continue;

    const jsdoc = readJsDoc(statement);
    patches.push({
      name,
      hostTag: jsdoc.hostTag ?? guardHost,
      signature: renderSignature(name, statement, sourceFile),
      props: extractProps(statement, sourceFile, jsdoc.paramDocs),
      doc: jsdoc.summary,
      example: jsdoc.example,
      source: `packages/ui/src/patches/${basename(file)}`,
    });
  }
}
patches.sort((a, b) => a.name.localeCompare(b.name));

const manifest = {
  name: "domphy",
  version: packages.find((p) => p.name === "@domphy/core")?.version ?? "0.0.0",
  generated: "auto",
  rules: "https://domphy.com/llms.txt",
  tones: "https://domphy.com/tones.json",
  packages,
  patches,
};

const manifestDest = resolve(ROOT, "public/manifest.json");
await writeFormattedJson(manifestDest, manifest);

// --- tones.json (valid tone names + theme color names) ---
const theme = await loadModule("@domphy/theme", [
  resolve(REPO, "apps/web/package.json"),
  resolve(REPO, "packages/ui/package.json"),
  resolve(REPO, "package.json"),
]);
const tones = {
  generated: "auto",
  note: 'Valid `dataTone` / patch tone values and theme color names. Use a tone with themeColor(listener, tone, color); e.g. themeColor(l, "shift-9", "primary").',
  tones: [...theme.ElementTones],
  colors: Object.keys(theme.getTheme("light").colors),
};
const tonesDest = resolve(ROOT, "public/tones.json");
await writeFormattedJson(tonesDest, tones);

const propCount = patches.reduce((sum, p) => sum + p.props.length, 0);
console.log(
  `wrote ${manifestDest} (${packages.length} packages, ${patches.length} patches, ${propCount} props)`,
);
console.log(
  `wrote ${tonesDest} (${tones.tones.length} tones, ${tones.colors.length} colors)`,
);
