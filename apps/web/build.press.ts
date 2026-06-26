// Domphy docs build script. Uses @domphy/press for the standard pipeline
// (markdown → element tree → SSR → HTML) and adds web-specific islands:
// live code previews and editors (code-split per demo via esbuild).

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, defineRoutes } from "@domphy/app";
import type {
  IslandRef,
  LayoutContext,
  RenderedDoc,
  SearchDocument,
} from "@domphy/press";
import {
  buildSearchIndex,
  createHighlighter,
  discoverPages,
  homeShell,
  pageShell,
  pressCSS,
  renderDoc,
} from "@domphy/press";
import { themeCSS } from "@domphy/theme";
import * as esbuild from "esbuild";
import { htmlDocument, type PageIslandSpec } from "./html-template.js";
import { config } from "./press.config.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here);
const docsDir = join(appRoot, "docs");
const repoRoot = resolve(appRoot, "../..");
const publicDir = join(appRoot, "public");
const outDir = join(appRoot, ".vitepress", "dist");
const islandsRuntimePath = join(here, "islands-runtime.ts");

// --- Text utilities ----------------------------------------------------------

function firstParagraphText(body: unknown[]): string {
  for (const node of body) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    const record = node as Record<string, unknown>;
    if ("p" in record) {
      const parts: string[] = [];
      flattenText(record.p, parts);
      const text = parts.join(" ").replace(/\s+/g, " ").trim();
      if (text.length > 10) return text.slice(0, 160);
    }
  }
  return "";
}

function flattenText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    if (!node.trimStart().startsWith("<")) out.push(node);
    return;
  }
  if (typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) flattenText(child, out);
    return;
  }
  if (typeof node === "object") {
    for (const [key, value] of Object.entries(
      node as Record<string, unknown>,
    )) {
      if (key.startsWith("_") || key === "$" || key === "style") continue;
      if (
        key === "class" ||
        key.startsWith("data") ||
        key === "href" ||
        key === "id"
      )
        continue;
      flattenText(value, out);
    }
  }
}

function parseStyleString(value: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const decl of value.split(";")) {
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim();
    const val = decl.slice(colon + 1).trim();
    if (!prop || !val) continue;
    style[prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = val;
  }
  return style;
}

function sanitizeStyles(node: unknown): void {
  if (Array.isArray(node)) {
    for (const child of node) sanitizeStyles(child);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (typeof record.style === "string")
    record.style = parseStyleString(record.style);
  for (const value of Object.values(record)) {
    if (value && (typeof value === "object" || Array.isArray(value)))
      sanitizeStyles(value);
  }
}

// --- Editor island extraction ------------------------------------------------

interface EditorIslandRef {
  kind: "editor";
  id: string;
  source?: string;
  inlineCode?: string;
  storageKey?: string;
}

/**
 * Extracts <CodeEditor> tags from VitePress-style markdown, replacing them
 * with `<div data-island="editor-N">` placeholders. Returns the rewritten
 * source and the extracted island refs.
 *
 * Handled patterns:
 *  1. `:code="Var"` where Var is a `const Var = \`...\`` in the script block
 *  2. `:code="Var"` where Var is `import Var from "./path?raw"` → resolves path
 */
function extractEditorIslands(
  source: string,
  filePath: string,
): { source: string; islands: EditorIslandRef[] } {
  const fileDir = dirname(filePath);
  const islands: EditorIslandRef[] = [];

  // Extract script block content before stripping
  const scriptMatch = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
  const script = scriptMatch ? scriptMatch[1] : "";

  // Build a map: varName → code string (from inline const or ?raw import)
  const codeMap: Record<string, string> = {};

  // Handle: import Var from "./path?raw" (or path.ts?raw)
  for (const m of script.matchAll(
    /import\s+(\w+)\s+from\s+["']([^"']+\?raw)["']/g,
  )) {
    const [, varName, rawPath] = m;
    const cleanPath = rawPath.replace(/\?raw$/, "");
    const absPath = resolve(fileDir, cleanPath);
    if (existsSync(absPath)) {
      codeMap[varName] = readFileSync(absPath, "utf8");
    }
  }

  // Handle: const Var = `...template literal...`
  for (const m of script.matchAll(/const\s+(\w+)\s*=\s*`([\s\S]*?)`/g)) {
    const [, varName, content] = m;
    codeMap[varName] = content.trim();
  }

  // Find and replace <CodeEditor :code="Var" storageKey="..." /> tags
  let counter = 0;
  const processed = source.replace(
    /<CodeEditor\b([^>]*?)(?:\/>|><\/CodeEditor>)/g,
    (_match, attrs: string) => {
      const codeAttr = attrs.match(/:code=["'](\w+)["']/);
      const storageAttr = attrs.match(/storageKey=["']([^"']+)["']/);
      const storageKey = storageAttr ? storageAttr[1] : undefined;

      let inlineCode: string | undefined;
      let source: string | undefined;

      if (codeAttr) {
        const varName = codeAttr[1];
        inlineCode = codeMap[varName];
        if (!inlineCode) {
          // Last resort: look for the source path from import ... ?raw
          const importMatch = script.match(
            new RegExp(`import\\s+${varName}\\s+from\\s+["']([^"']+)["']`),
          );
          if (importMatch) {
            source = resolve(fileDir, importMatch[1].replace(/\?raw$/, ""));
          }
        }
      }

      const id = `editor-${counter++}`;
      islands.push({ kind: "editor", id, source, inlineCode, storageKey });
      return `<div data-island="${id}" style="margin:2rem 0"></div>`;
    },
  );

  return { source: processed, islands };
}

// --- Island helpers ----------------------------------------------------------

interface BuiltPage {
  route: string;
  outFile: string;
  title: string;
  doc: RenderedDoc;
  islands: IslandRef[];
}

function pageIslandSpecs(page: BuiltPage): PageIslandSpec[] {
  const specs: PageIslandSpec[] = [{ kind: "search", id: "search" }];
  for (const island of page.islands) {
    if (island.kind === "editor") {
      const editorIsland = island as unknown as EditorIslandRef;
      let code = editorIsland.inlineCode;
      if (!code && editorIsland.source) {
        code = existsSync(editorIsland.source)
          ? readFileSync(editorIsland.source, "utf8")
          : "// demo source not found";
      }
      code ??= "// demo source not found";
      const spec: PageIslandSpec = { kind: "editor", id: island.id, code };
      if (editorIsland.storageKey) spec.storageKey = editorIsland.storageKey;
      specs.push(spec);
    } else {
      specs.push({ kind: "preview", id: island.id, source: island.source! });
    }
  }
  return specs;
}

async function buildIslands(
  built: BuiltPage[],
  cacheDir: string,
): Promise<void> {
  const previewSources = new Set<string>();
  for (const page of built) {
    for (const island of page.islands) {
      if (island.kind === "preview") previewSources.add(island.source!);
    }
  }
  const registryEntries = [...previewSources]
    .map(
      (source) =>
        `  ${JSON.stringify(source)}: () => import(${JSON.stringify(source)}),`,
    )
    .join("\n");
  const entrySource = `import { bootstrap } from ${JSON.stringify(islandsRuntimePath)};
const previewRegistry = {
${registryEntries}
};
bootstrap(previewRegistry);
`;
  mkdirSync(cacheDir, { recursive: true });
  const entryFile = join(cacheDir, "islands-entry.ts");
  writeFileSync(entryFile, entrySource, "utf8");
  await esbuild.build({
    entryPoints: { "islands-entry": entryFile },
    bundle: true,
    splitting: true,
    format: "esm",
    outdir: join(outDir, "assets"),
    entryNames: "[name]",
    chunkNames: "chunks/[name]-[hash]",
    assetNames: "media/[name]-[hash]",
    minify: true,
    sourcemap: false,
    target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
    loader: { ".ttf": "file", ".woff": "file", ".woff2": "file" },
  });
}

function buildSitemap(pages: BuiltPage[], hostname: string): string {
  const urls = pages
    .map((page) => {
      const loc =
        page.route === "/" ? `${hostname}/` : `${hostname}${page.route}/`;
      return `  <url><loc>${loc}</loc></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

// --- Main build --------------------------------------------------------------

async function run(): Promise<void> {
  const startedPages = discoverPages(appRoot);
  console.log(`Discovered ${startedPages.length} pages.`);

  const highlight = await createHighlighter();
  const generatedCss = themeCSS() + pressCSS();

  const built: BuiltPage[] = [];
  const searchDocs: SearchDocument[] = [];

  for (const page of startedPages) {
    const rawSource = readFileSync(page.filePath, "utf8");
    const { source, islands: editorIslands } = extractEditorIslands(
      rawSource,
      page.filePath,
    );
    const doc = await renderDoc(source, {
      filePath: page.filePath,
      docsDir,
      repoRoot,
      highlight,
    });
    sanitizeStyles(doc.body);
    const textParts: string[] = [];
    flattenText(doc.body, textParts);
    built.push({
      route: page.route,
      outFile: page.outFile,
      title: doc.title,
      doc,
      islands: [...doc.islands, ...(editorIslands as unknown as IslandRef[])],
    });
    searchDocs.push({
      route: page.route,
      title: doc.title,
      text: textParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 20000),
      toc: doc.toc,
    });
  }

  const routes = defineRoutes(
    built.map((page) => {
      const ctx: LayoutContext = {
        route: page.route,
        title: page.title,
        body: page.doc.body,
        toc: page.doc.toc,
        frontmatter: page.doc.frontmatter,
        config,
      };
      const isHome = page.route === "/";
      const description =
        typeof page.doc.frontmatter.description === "string"
          ? page.doc.frontmatter.description
          : firstParagraphText(page.doc.body) || config.description;
      const pageTitle =
        page.title === config.title
          ? config.title
          : `${page.title} | ${config.title}`;
      const canonical =
        page.route === "/"
          ? `${config.hostname}/`
          : `${config.hostname}${page.route}/`;
      return {
        path: page.route,
        metadata: {
          title: pageTitle,
          description,
          metadataBase: config.hostname,
          openGraph: {
            title: pageTitle,
            description,
            url: page.route === "/" ? "/" : `${page.route}/`,
            siteName: config.title,
            type: "website",
          },
          twitter: { card: "summary" as const, title: pageTitle, description },
          alternates: { canonical },
        },
        page: () => (isHome ? homeShell(ctx) : pageShell(ctx)),
      };
    }),
  );
  const app = createApp(routes);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  await buildIslands(built, join(appRoot, ".dp-cache"));

  let totalBytes = 0;
  const failures: { route: string; error: string }[] = [];
  for (const page of built) {
    try {
      const result = await app.renderToString(page.route);
      const doc = htmlDocument(
        result,
        generatedCss,
        pageIslandSpecs(page),
        config.head,
      );
      const outPath = join(outDir, page.outFile);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, doc, "utf8");
      totalBytes += doc.length;
      if (result.status !== 200)
        console.warn(`  ! ${page.route} -> status ${result.status}`);
    } catch (error) {
      failures.push({
        route: page.route,
        error: String((error as Error).message || error),
      });
    }
  }
  if (failures.length > 0) {
    console.warn(`\n${failures.length} page(s) failed to render:`);
    for (const failure of failures)
      console.warn(`  ✗ ${failure.route}: ${failure.error}`);
  }

  const indexJson = buildSearchIndex(searchDocs);
  if (existsSync(publicDir)) cpSync(publicDir, outDir, { recursive: true });
  writeFileSync(join(outDir, "search-index.json"), indexJson, "utf8");
  writeFileSync(
    join(outDir, "sitemap.xml"),
    buildSitemap(built, config.hostname),
    "utf8",
  );

  const islandCount = built.reduce((sum, page) => sum + page.islands.length, 0);
  console.log(
    `Wrote ${built.length} pages (${(totalBytes / 1024).toFixed(0)} KB), ${islandCount} islands.`,
  );
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("build.press.ts")) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
