// Domphy docs build script. Uses @domphy/press for the standard pipeline
// (markdown → element tree → SSR → HTML) and adds web-specific islands:
// live code previews and editors (code-split per demo via esbuild).

import {
  cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createApp, defineRoutes } from "@domphy/app"
import { themeCSS } from "@domphy/theme"
import * as esbuild from "esbuild"
import {
  buildSearchIndex, createHighlighter,
  discoverPages, homeShell, pageShell, pressCSS,
  renderDoc,
} from "@domphy/press"
import type { IslandRef, LayoutContext, RenderedDoc, SearchDocument } from "@domphy/press"
import { config } from "./press.config.js"

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here)
const docsDir = join(appRoot, "docs")
const repoRoot = resolve(appRoot, "../..")
const publicDir = join(appRoot, "public")
const outDir = join(appRoot, ".vitepress", "dist")
const islandsRuntimePath = join(here, "islands-runtime.ts")

// --- Text utilities ----------------------------------------------------------

function firstParagraphText(body: unknown[]): string {
  for (const node of body) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue
    const record = node as Record<string, unknown>
    if ("p" in record) {
      const parts: string[] = []
      flattenText(record.p, parts)
      const text = parts.join(" ").replace(/\s+/g, " ").trim()
      if (text.length > 10) return text.slice(0, 160)
    }
  }
  return ""
}

function flattenText(node: unknown, out: string[]): void {
  if (node == null) return
  if (typeof node === "string") {
    if (!node.trimStart().startsWith("<")) out.push(node)
    return
  }
  if (typeof node === "number") { out.push(String(node)); return }
  if (Array.isArray(node)) { for (const child of node) flattenText(child, out); return }
  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key.startsWith("_") || key === "$" || key === "style") continue
      if (key === "class" || key.startsWith("data") || key === "href" || key === "id") continue
      flattenText(value, out)
    }
  }
}

function parseStyleString(value: string): Record<string, string> {
  const style: Record<string, string> = {}
  for (const decl of value.split(";")) {
    const colon = decl.indexOf(":")
    if (colon === -1) continue
    const prop = decl.slice(0, colon).trim()
    const val = decl.slice(colon + 1).trim()
    if (!prop || !val) continue
    style[prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = val
  }
  return style
}

function sanitizeStyles(node: unknown): void {
  if (Array.isArray(node)) { for (const child of node) sanitizeStyles(child); return }
  if (!node || typeof node !== "object") return
  const record = node as Record<string, unknown>
  if (typeof record.style === "string") record.style = parseStyleString(record.style)
  for (const value of Object.values(record)) {
    if (value && (typeof value === "object" || Array.isArray(value))) sanitizeStyles(value)
  }
}

// --- Island helpers ----------------------------------------------------------

interface BuiltPage {
  route: string
  outFile: string
  title: string
  doc: RenderedDoc
  islands: IslandRef[]
}

interface PageIslandSpec {
  kind: "search" | "preview" | "editor"
  id: string
  source?: string
  code?: string
}

function pageIslandSpecs(page: BuiltPage): PageIslandSpec[] {
  const specs: PageIslandSpec[] = [{ kind: "search", id: "search" }]
  for (const island of page.islands) {
    if (island.kind === "editor") {
      const code = existsSync(island.source!)
        ? readFileSync(island.source!, "utf8")
        : "// demo source not found"
      specs.push({ kind: "editor", id: island.id, code })
    } else {
      specs.push({ kind: "preview", id: island.id, source: island.source! })
    }
  }
  return specs
}

async function buildIslands(built: BuiltPage[], cacheDir: string): Promise<void> {
  const previewSources = new Set<string>()
  for (const page of built) {
    for (const island of page.islands) {
      if (island.kind === "preview") previewSources.add(island.source!)
    }
  }
  const registryEntries = [...previewSources]
    .map(source => `  ${JSON.stringify(source)}: () => import(${JSON.stringify(source)}),`)
    .join("\n")
  const entrySource = `import { bootstrap } from ${JSON.stringify(islandsRuntimePath)};
const previewRegistry = {
${registryEntries}
};
bootstrap(previewRegistry);
`
  mkdirSync(cacheDir, { recursive: true })
  const entryFile = join(cacheDir, "islands-entry.ts")
  writeFileSync(entryFile, entrySource, "utf8")
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
  })
}

// --- HTML document generation ------------------------------------------------

const RUNTIME_SCRIPT = `
(function(){
  try{var t=localStorage.getItem('dp-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
  addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-theme-toggle]');
    if(el){var d=document.documentElement;var n=d.getAttribute('data-theme')==='dark'?'':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('dp-theme',n);}catch(_){}return;}
    var m=e.target.closest&&e.target.closest('[data-menu-toggle]');
    if(m){var d2=document.documentElement;d2.setAttribute('data-sidebar',d2.getAttribute('data-sidebar')==='open'?'':'open');}
  });
})();`

function htmlDocument(
  result: { html: string; css: string; head: string; status: number },
  generatedCss: string,
  islandSpecs: PageIslandSpec[],
): string {
  const specsJson = JSON.stringify(islandSpecs).replace(/</g, "\\u003c")
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${result.head}
${config.head.join("\n")}
<style>${generatedCss}</style>
<style id="domphy-style">${result.css}</style>
<script>${RUNTIME_SCRIPT}</script>
</head>
<body>
<div id="domphy-app">${result.html}</div>
<script>window.__DP_PAGE_ISLANDS__=${specsJson};</script>
<script type="module" src="/assets/islands-entry.js"></script>
</body>
</html>`
}

function buildSitemap(pages: BuiltPage[], hostname: string): string {
  const urls = pages.map(page => {
    const loc = page.route === "/" ? `${hostname}/` : `${hostname}${page.route}/`
    return `  <url><loc>${loc}</loc></url>`
  }).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

// --- Main build --------------------------------------------------------------

async function run(): Promise<void> {
  const startedPages = discoverPages(appRoot)
  console.log(`Discovered ${startedPages.length} pages.`)

  const highlight = await createHighlighter()
  const generatedCss = themeCSS() + pressCSS()

  const built: BuiltPage[] = []
  const searchDocs: SearchDocument[] = []

  for (const page of startedPages) {
    const source = readFileSync(page.filePath, "utf8")
    const doc = await renderDoc(source, { filePath: page.filePath, docsDir, repoRoot, highlight })
    sanitizeStyles(doc.body)
    const textParts: string[] = []
    flattenText(doc.body, textParts)
    built.push({ route: page.route, outFile: page.outFile, title: doc.title, doc, islands: doc.islands })
    searchDocs.push({
      route: page.route,
      title: doc.title,
      text: textParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 20000),
      toc: doc.toc,
    })
  }

  const routes = defineRoutes(
    built.map(page => {
      const ctx: LayoutContext = {
        route: page.route,
        title: page.title,
        body: page.doc.body,
        toc: page.doc.toc,
        frontmatter: page.doc.frontmatter,
        config,
      }
      const isHome = page.route === "/"
      const description = typeof page.doc.frontmatter.description === "string"
        ? page.doc.frontmatter.description
        : firstParagraphText(page.doc.body) || config.description
      const pageTitle = page.title === config.title ? config.title : `${page.title} | ${config.title}`
      const canonical = page.route === "/" ? `${config.hostname}/` : `${config.hostname}${page.route}/`
      return {
        path: page.route,
        metadata: {
          title: pageTitle,
          description,
          metadataBase: config.hostname,
          openGraph: { title: pageTitle, description, url: page.route === "/" ? "/" : `${page.route}/`, siteName: config.title, type: "website" },
          twitter: { card: "summary" as const, title: pageTitle, description },
          alternates: { canonical },
        },
        page: () => (isHome ? homeShell(ctx) : pageShell(ctx)),
      }
    }),
  )
  const app = createApp(routes)

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  await buildIslands(built, join(appRoot, ".dp-cache"))

  let totalBytes = 0
  const failures: { route: string; error: string }[] = []
  for (const page of built) {
    try {
      const result = await app.renderToString(page.route)
      const doc = htmlDocument(result, generatedCss, pageIslandSpecs(page))
      const outPath = join(outDir, page.outFile)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, doc, "utf8")
      totalBytes += doc.length
      if (result.status !== 200) console.warn(`  ! ${page.route} -> status ${result.status}`)
    } catch (error) {
      failures.push({ route: page.route, error: String((error as Error).message || error) })
    }
  }
  if (failures.length > 0) {
    console.warn(`\n${failures.length} page(s) failed to render:`)
    for (const failure of failures) console.warn(`  ✗ ${failure.route}: ${failure.error}`)
  }

  const indexJson = buildSearchIndex(searchDocs)
  if (existsSync(publicDir)) cpSync(publicDir, outDir, { recursive: true })
  writeFileSync(join(outDir, "search-index.json"), indexJson, "utf8")
  writeFileSync(join(outDir, "sitemap.xml"), buildSitemap(built, config.hostname), "utf8")

  const islandCount = built.reduce((sum, page) => sum + page.islands.length, 0)
  console.log(`Wrote ${built.length} pages (${(totalBytes / 1024).toFixed(0)} KB), ${islandCount} islands.`)
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("build.press.ts")) {
  run().catch(error => { console.error(error); process.exit(1) })
}
