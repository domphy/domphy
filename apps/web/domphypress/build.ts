// DomphyPress static site generator.
//
// Pipeline: discover pages -> renderDoc (markdown -> Domphy, shiki, containers,
// includes, islands, mermaid) -> wrap in the Domphy layout shell -> one route
// per page in @domphy/app -> renderToString(route) -> write a standalone .html.
// Also builds the local search index and copies public/ assets.
//
// Run: pnpm --filter @domphy/web exec tsx domphypress/build.ts

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

import * as esbuild from "esbuild";
import type { DomphyElement } from "@domphy/core";
import { createApp, defineRoutes } from "@domphy/app";

import { config } from "./config.js";
import { createHighlighter } from "./highlight.js";
import { homeShell, pageShell, type LayoutContext } from "./layout.js";
import { renderDoc } from "./pipeline.js";
import { discoverPages } from "./routes.js";
import { buildSearchIndex } from "./search.js";
import type { IslandRef, RenderedDoc, SearchDocument } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, ".."); // apps/web
const docsDir = join(appRoot, "docs");
const repoRoot = resolve(appRoot, "../..");
const publicDir = join(appRoot, "public");
// Output where the existing deploy publishes from (Netlify/Vercel: .vitepress/dist).
const outDir = join(appRoot, ".vitepress", "dist");

/** Recursively flattens an element tree to plain text for the search index. */
function flattenText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    // Skip raw HTML/SVG island/mermaid blobs to keep the index clean.
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
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      // Element content lives under the tag key (first non-reserved key) and in
      // `$`/style/etc. we ignore; tag values are strings/arrays/elements.
      if (key.startsWith("_") || key === "$" || key === "style") continue;
      if (key === "class" || key.startsWith("data") || key === "href" || key === "id")
        continue;
      flattenText(value, out);
    }
  }
}

/** Parses a CSS declaration string ("a: b; c: d") into a Domphy style object. */
function parseStyleString(value: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const decl of value.split(";")) {
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim();
    const val = decl.slice(colon + 1).trim();
    if (!prop || !val) continue;
    const camel = prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    style[camel] = val;
  }
  return style;
}

/**
 * Walks a rendered element tree and converts any string `style` attribute
 * (which raw HTML in markdown can carry, e.g. `<div style="...">`) into the
 * object form Domphy requires. Mutates in place.
 */
function sanitizeStyles(node: unknown): void {
  if (Array.isArray(node)) {
    for (const child of node) sanitizeStyles(child);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (typeof record.style === "string") {
    record.style = parseStyleString(record.style);
  }
  for (const value of Object.values(record)) {
    if (value && (typeof value === "object" || Array.isArray(value))) {
      sanitizeStyles(value);
    }
  }
}

interface BuiltPage {
  route: string;
  outFile: string;
  title: string;
  doc: RenderedDoc;
  islands: IslandRef[];
}

/** Per-page island specs embedded into the page for the client runtime. */
interface PageIslandSpec {
  kind: "search" | "preview" | "editor";
  id: string;
  source?: string;
  code?: string;
}

/** Builds the specs for one page: the header search box plus its content islands. */
function pageIslandSpecs(page: BuiltPage): PageIslandSpec[] {
  const specs: PageIslandSpec[] = [{ kind: "search", id: "search" }];
  for (const island of page.islands) {
    if (island.kind === "editor") {
      // The editor takes the demo's raw source text (it transforms it itself).
      const code = existsSync(island.source)
        ? readFileSync(island.source, "utf8")
        : "// demo source not found";
      specs.push({ kind: "editor", id: island.id, code });
    } else {
      specs.push({ kind: "preview", id: island.id, source: island.source });
    }
  }
  return specs;
}

/**
 * Bundles the client island runtime with esbuild. Generates an entry that maps
 * every preview demo path to a dynamic import (so esbuild code-splits each demo)
 * and calls `bootstrap`. Outputs `assets/islands-entry.js` plus on-demand chunks.
 */
async function buildIslands(built: BuiltPage[], cacheDir: string): Promise<void> {
  const previewSources = new Set<string>();
  for (const page of built) {
    for (const island of page.islands) {
      if (island.kind === "preview") previewSources.add(island.source);
    }
  }

  const runtimePath = join(here, "islands-runtime.ts");
  const registryEntries = [...previewSources]
    .map((source) => `  ${JSON.stringify(source)}: () => import(${JSON.stringify(source)}),`)
    .join("\n");
  const entrySource = `import { bootstrap } from ${JSON.stringify(runtimePath)};
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

async function run(): Promise<void> {
  const startedPages = discoverPages(appRoot);
  console.log(`Discovered ${startedPages.length} pages.`);

  const highlight = await createHighlighter();
  // Mermaid is rendered client-side (see domphypress/islands-runtime.ts) so the
  // build needs no headless browser and dev/production render identically.

  // 1) Render every page's markdown to a Domphy doc.
  const built: BuiltPage[] = [];
  const searchDocs: SearchDocument[] = [];
  for (const page of startedPages) {
    const source = readFileSync(page.filePath, "utf8");
    const doc = await renderDoc(source, {
      filePath: page.filePath,
      docsDir,
      repoRoot,
      highlight,
    });
    sanitizeStyles(doc.body);
    built.push({
      route: page.route,
      outFile: page.outFile,
      title: doc.title,
      doc,
      islands: doc.islands,
    });
    const textParts: string[] = [];
    flattenText(doc.body, textParts);
    searchDocs.push({
      route: page.route,
      title: doc.title,
      text: textParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 20000),
      toc: doc.toc,
    });
  }

  // 2) Build one @domphy/app route per page; the page function returns the shell.
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
      return {
        path: page.route,
        metadata: { title: page.title === config.title ? { default: config.title } : page.title },
        page: () => (isHome ? homeShell(ctx) : pageShell(ctx)),
      };
    }),
  );
  const app = createApp(routes);

  // 3) Render every route to static HTML.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const themeCss = readFileSync(join(here, "theme.css"), "utf8");

  // Bundle the client island runtime (editors, previews, search) with esbuild.
  await buildIslands(built, join(appRoot, ".dp-cache"));

  let totalBytes = 0;
  const failures: { route: string; error: string }[] = [];
  for (const page of built) {
    try {
      const result = await app.renderToString(page.route);
      const doc = htmlDocument(result, themeCss, pageIslandSpecs(page));
      const outPath = join(outDir, page.outFile);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, doc, "utf8");
      totalBytes += doc.length;
      if (result.status !== 200) {
        console.warn(`  ! ${page.route} -> status ${result.status}`);
      }
    } catch (error) {
      failures.push({ route: page.route, error: String((error as Error).message || error) });
    }
  }
  if (failures.length > 0) {
    console.warn(`\n${failures.length} page(s) failed to render:`);
    for (const failure of failures) console.warn(`  ✗ ${failure.route}: ${failure.error}`);
  }

  // 4) Search index + assets.
  const indexJson = buildSearchIndex(searchDocs);
  if (existsSync(publicDir)) {
    cpSync(publicDir, outDir, { recursive: true });
  }
  writeFileSync(join(outDir, "search-index.json"), indexJson, "utf8");

  const islandCount = built.reduce((sum, page) => sum + page.islands.length, 0);
  console.log(
    `Wrote ${built.length} pages (${(totalBytes / 1024).toFixed(0)} KB), ` +
      `${islandCount} islands, search index ${(indexJson.length / 1024).toFixed(0)} KB -> ${outDir}`,
  );
}

/** Inline script: set theme before paint (no FOUC) + wire toggles. */
const RUNTIME_SCRIPT = `
(function(){
  try{var t=localStorage.getItem('dp-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
  addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-theme-toggle]');
    if(el){var d=document.documentElement;var n=d.getAttribute('data-theme')==='dark'?'':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('dp-theme',n);}catch(_){}return;}
    var m=e.target.closest&&e.target.closest('[data-menu-toggle]');
    if(m){var d2=document.documentElement;d2.setAttribute('data-sidebar',d2.getAttribute('data-sidebar')==='open'?'':'open');}
  });
})();`;

function htmlDocument(
  result: { html: string; css: string; head: string; status: number },
  themeCss: string,
  islandSpecs: PageIslandSpec[],
): string {
  // Embed the page island specs; escape `<` so editor source can't break out.
  const specsJson = JSON.stringify(islandSpecs).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${result.head}
${config.head.join("\n")}
<style>${themeCss}</style>
<style id="domphy-style">${result.css}</style>
<script>${RUNTIME_SCRIPT}</script>
</head>
<body>
<div id="domphy-app">${result.html}</div>
<script>window.__DP_PAGE_ISLANDS__=${specsJson};</script>
<script type="module" src="/assets/islands-entry.js"></script>
</body>
</html>`;
}

export { run as buildSite };

// Auto-run when invoked directly (`tsx build.ts`); imported by dev.ts otherwise.
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("domphypress/build.ts")) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
