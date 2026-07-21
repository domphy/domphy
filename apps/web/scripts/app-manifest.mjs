// Generates an app-block registry — a machine-readable index of an APP's OWN
// exported Domphy "blocks" (functions/consts that return a Domphy element tree),
// so AI agents can discover and reuse the app's building blocks the same way
// `manifest.json` exposes the framework's 22 packages and `@domphy/ui` patches.
//
// Unlike `manifest.mjs` (which indexes the framework surface), this script scans
// arbitrary app source. It parses every `.ts` file with the TypeScript compiler
// API (no regex) and emits one entry per exported block:
//   { name, kind, file, signature, jsdoc, exportKind }
//
// Usage:
//   node apps/web/scripts/app-manifest.mjs [srcDir] [outFile]
// Defaults (run from anywhere):
//   srcDir  = apps/web/docs/demos
//   outFile = apps/web/public/app-manifest.json

import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
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

// `typescript` is a dev dependency of several packages but is not hoisted to the
// repo root in this pnpm layout, so resolve it from a package that declares it.
// Try a few anchors so the script keeps working if the layout shifts.
const typescript = await loadTypeScript();

async function loadTypeScript() {
  const anchors = [
    resolve(REPO, "packages/doctor/package.json"),
    resolve(REPO, "packages/mcp/package.json"),
    resolve(REPO, "package.json"),
  ];
  for (const anchor of anchors) {
    try {
      const require = createRequire(anchor);
      const specifier = require.resolve("typescript");
      return (await import(`file://${specifier}`)).default;
    } catch {
      // try the next anchor
    }
  }
  throw new Error(
    "Cannot resolve the `typescript` package. Install it as a dev dependency.",
  );
}

const ts = typescript;

// --- arguments ---
const [, , srcArg, outArg] = process.argv;
const srcDir = resolve(srcArg ?? resolve(ROOT, "docs/demos"));
const outFile = resolve(outArg ?? resolve(ROOT, "public/app-manifest.json"));

// --- file discovery ---
/** Recursively collect every `.ts` file under `dir` (skips `.d.ts` declarations). */
async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files.sort();
}

// --- element-shape heuristics ---
// A "block" is an exported function/const whose value (or return value) is a
// Domphy element tree. We accept two strong signals, in order of confidence:
//   1. A type annotation referencing DomphyElement / PartialElement.
//   2. An object-literal value (or arrow/function returning one) whose first
//      property key is a known HTML/SVG tag — the Domphy element grammar.
const ELEMENT_TYPE_NAMES = new Set(["DomphyElement", "PartialElement"]);

// Minimal tag set: enough to recognize the Domphy `{ tag: ... }` grammar without
// importing @domphy/core (this script stays dependency-light). Covers the tags
// that actually appear as element roots in app code.
const TAG_NAMES = new Set([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "meta",
  "meter",
  "nav",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // common SVG roots
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "defs",
  "use",
]);

/** Reads a TypeName / qualified-name node down to its rightmost identifier. */
function typeReferenceName(typeNode) {
  if (!typeNode) return undefined;
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName;
    return ts.isQualifiedName(name) ? name.right.text : name.text;
  }
  return undefined;
}

/** True if the type annotation is (or unwraps to) DomphyElement/PartialElement. */
function isElementType(typeNode) {
  if (!typeNode) return false;
  const name = typeReferenceName(typeNode);
  if (name && ELEMENT_TYPE_NAMES.has(name)) return true;
  // Unwrap arrays (`DomphyElement[]`) and parenthesized types.
  if (ts.isArrayTypeNode(typeNode)) return isElementType(typeNode.elementType);
  if (ts.isParenthesizedTypeNode(typeNode)) return isElementType(typeNode.type);
  // Unwrap a function type whose return type is an element (block factories).
  if (ts.isFunctionTypeNode(typeNode)) return isElementType(typeNode.type);
  return false;
}

/** True if `node` is an object literal whose first property key is a known tag. */
function isElementObjectLiteral(node) {
  if (!node || !ts.isObjectLiteralExpression(node)) return false;
  for (const prop of node.properties) {
    if (
      (ts.isPropertyAssignment(prop) ||
        ts.isShorthandPropertyAssignment(prop)) &&
      prop.name
    ) {
      const key = propertyKeyText(prop.name);
      // The first concrete property key decides — Domphy elements lead with the
      // tag key. (Skip computed/spread members and look at the first real key.)
      if (key !== undefined) return TAG_NAMES.has(key);
    }
  }
  return false;
}

/** Extracts the textual key of a property name node, when it is a plain key. */
function propertyKeyText(nameNode) {
  if (ts.isIdentifier(nameNode)) return nameNode.text;
  if (ts.isStringLiteral(nameNode)) return nameNode.text;
  return undefined;
}

/** Unwraps `as`/parenthesized expressions to the inner expression. */
function unwrapExpression(expr) {
  let current = expr;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isSatisfiesExpression?.(current))
  ) {
    current = current.expression;
  }
  return current;
}

/** True if a value expression is (or returns) a Domphy element object literal. */
function valueLooksLikeElement(expr) {
  const value = unwrapExpression(expr);
  if (!value) return false;
  if (isElementObjectLiteral(value)) return true;
  // Arrow / function expression — inspect its return.
  if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
    return functionReturnsElement(value);
  }
  return false;
}

/** True if a function/arrow's declared return type or body returns an element. */
function functionReturnsElement(fn) {
  if (isElementType(fn.type)) return true;
  // Concise arrow body: `() => ({ div: ... })`.
  if (ts.isArrowFunction(fn) && fn.body && !ts.isBlock(fn.body)) {
    return valueLooksLikeElement(fn.body);
  }
  // Block body: look for a `return <object literal>` statement.
  if (fn.body && ts.isBlock(fn.body)) {
    return blockReturnsElement(fn.body);
  }
  return false;
}

/** Scans a function block (shallow) for `return <element object literal>`. */
function blockReturnsElement(block) {
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) {
      if (valueLooksLikeElement(statement.expression)) return true;
    }
  }
  return false;
}

// --- signature + jsdoc rendering ---
/** Renders a parameter list and return type as readable source text. */
function renderSignature(name, params, returnType, sourceFile) {
  const paramText = (params ?? [])
    .map((p) => p.getText(sourceFile).replace(/\s+/g, " ").trim())
    .join(", ");
  const ret = returnType
    ? `: ${returnType.getText(sourceFile).replace(/\s+/g, " ").trim()}`
    : "";
  return `${name}(${paramText})${ret}`;
}

/** Renders a const block's signature: `name: Type` or its arrow signature. */
function renderConstSignature(name, declaration, sourceFile) {
  const initializer = declaration.initializer
    ? unwrapExpression(declaration.initializer)
    : undefined;
  if (
    initializer &&
    (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
  ) {
    return renderSignature(
      name,
      initializer.parameters,
      initializer.type,
      sourceFile,
    );
  }
  const typeText = declaration.type
    ? declaration.type.getText(sourceFile).replace(/\s+/g, " ").trim()
    : "DomphyElement";
  return `${name}: ${typeText}`;
}

/** Extracts the leading JSDoc summary text for a node, if any. */
function extractJsDoc(node) {
  const docs = ts.getJSDocCommentsAndTags(node);
  for (const doc of docs) {
    if (ts.isJSDoc(doc)) {
      const comment = doc.comment;
      if (typeof comment === "string")
        return comment.replace(/\s+/g, " ").trim();
      if (Array.isArray(comment)) {
        return comment
          .map((part) => part.text ?? "")
          .join("")
          .replace(/\s+/g, " ")
          .trim();
      }
    }
  }
  return "";
}

/** "block" when the value (or return) is an object literal of tags; else "patch". */
function classifyKind(signatureSource) {
  // A factory that takes props and returns an element reads like a reusable
  // patch; a plain element constant is a concrete block. We keep the
  // distinction coarse and deterministic: arrow/function => patch, value => block.
  return signatureSource ? "patch" : "block";
}

// --- per-file extraction ---
function extractBlocks(sourceFile, repoRelativePath) {
  const blocks = [];

  function hasExportModifier(node) {
    return Boolean(
      ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
    );
  }

  // Track names exported via `export { X }` so we can include matching decls.
  const namedExports = new Set();
  const defaultExportNames = new Set();
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const specifier of statement.exportClause.elements) {
          namedExports.add(specifier.propertyName?.text ?? specifier.name.text);
        }
      }
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      // `export default X` where X is an identifier — resolve later.
      const expr = unwrapExpression(statement.expression);
      if (ts.isIdentifier(expr)) {
        defaultExportNames.add(expr.text);
      } else if (valueLooksLikeElement(statement.expression)) {
        // `export default { div: ... }` — anonymous default element.
        blocks.push({
          name: "default",
          kind: classifyKind(undefined),
          file: repoRelativePath,
          signature: "default: DomphyElement",
          jsdoc: extractJsDoc(statement),
          exportKind: "default",
        });
      }
    }
  }

  function recordVariable(declaration, exportKind, jsdocHost) {
    if (!ts.isIdentifier(declaration.name)) return;
    const name = declaration.name.text;
    const annotatedElement = isElementType(declaration.type);
    const valueElement =
      declaration.initializer &&
      (valueLooksLikeElement(declaration.initializer) ||
        (ts.isArrowFunction(unwrapExpression(declaration.initializer)) &&
          isElementType(unwrapExpression(declaration.initializer).type)));
    if (!annotatedElement && !valueElement) return;

    const initializer = declaration.initializer
      ? unwrapExpression(declaration.initializer)
      : undefined;
    const isFactory =
      initializer &&
      (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));
    blocks.push({
      name,
      kind: isFactory ? "patch" : "block",
      file: repoRelativePath,
      signature: renderConstSignature(name, declaration, sourceFile),
      jsdoc: extractJsDoc(jsdocHost),
      exportKind,
    });
  }

  for (const statement of sourceFile.statements) {
    // export const X = ... / export const X: DomphyElement = ...
    if (ts.isVariableStatement(statement)) {
      const exported = hasExportModifier(statement);
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const name = declaration.name.text;
        const isDefault = defaultExportNames.has(name);
        const isNamed = exported || namedExports.has(name);
        if (!isDefault && !isNamed) continue;
        recordVariable(declaration, isDefault ? "default" : "named", statement);
      }
    }

    // export function X(...) : DomphyElement { ... }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      const exported = hasExportModifier(statement);
      const isDefault =
        defaultExportNames.has(name) ||
        ts
          .getModifiers(statement)
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      const isNamed = exported || namedExports.has(name);
      if (!isDefault && !isNamed) continue;
      if (!functionReturnsElement(statement)) continue;
      blocks.push({
        name,
        kind: "patch",
        file: repoRelativePath,
        signature: renderSignature(
          name,
          statement.parameters,
          statement.type,
          sourceFile,
        ),
        jsdoc: extractJsDoc(statement),
        exportKind: isDefault ? "default" : "named",
      });
    }
  }

  return blocks;
}

// --- run ---
const files = await collectFiles(srcDir).catch((error) => {
  console.error(`Cannot read source directory ${srcDir}: ${error.message}`);
  process.exit(1);
});

const entries = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  const repoRelativePath = relative(REPO, file).split("\\").join("/");
  entries.push(...extractBlocks(sourceFile, repoRelativePath));
}

entries.sort(
  (a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name),
);

await writeFormattedJson(outFile, entries);

const byKind = entries.reduce((acc, entry) => {
  acc[entry.kind] = (acc[entry.kind] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `wrote ${outFile} (${entries.length} blocks from ${files.length} files: ${
    byKind.block ?? 0
  } block, ${byKind.patch ?? 0} patch)`,
);
