// DomphyPress static site generator.
// Pipeline: discover pages → renderDoc → wrap in layout → renderToString → HTML.
// Also builds the client islands bundle and writes search-index.json + sitemap.

import {
  cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createApp, defineRoutes } from "@domphy/app"
import * as esbuild from "esbuild"
import { createHighlighter } from "./highlight.js"
import { homeShell, type LayoutContext, pageShell } from "./layout.js"
import { renderDoc } from "./pipeline.js"
import { discoverPages } from "./routes.js"
import { buildSearchIndex } from "./search.js"
import type { SiteConfig } from "./types.js"

const here = dirname(fileURLToPath(import.meta.url))

// --- Utilities ---------------------------------------------------------------

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

// --- Islands bundle ----------------------------------------------------------

async function buildIslandsBundle(outDir: string, searchEnabled: boolean): Promise<void> {
  if (!searchEnabled) return
  // The islands entry just bootstraps search. Inline so no temp file needed.
  const islandsSource = join(here, "islands.js")
  const entrySource = `
import { bootstrap } from ${JSON.stringify(islandsSource)};
bootstrap({ search: { kind: "search", id: "search" } });
`
  const tmpEntry = join(outDir, "_press_islands_entry.js")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(tmpEntry, entrySource, "utf8")
  await esbuild.build({
    entryPoints: { "press-islands": tmpEntry },
    bundle: true, splitting: false, format: "esm",
    outdir: join(outDir, "assets"),
    entryNames: "[name]",
    minify: true, sourcemap: false, target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  })
  rmSync(tmpEntry)
}

// --- Sitemap -----------------------------------------------------------------

function buildSitemap(routes: string[], hostname: string): string {
  const urls = routes.map(route => {
    const loc = route === "/" ? `${hostname}/` : `${hostname}${route}`.replace(/\/+$/, "") + "/"
    return `  <url><loc>${loc}</loc></url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
}

// --- HTML document -----------------------------------------------------------

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
  config: SiteConfig,
  searchEnabled: boolean,
  themeCss: string,
): string {
  const islandsScript = searchEnabled ? `\n<script type="module" src="${config.base}assets/press-islands.js"></script>` : ""
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
<div id="domphy-app">${result.html}</div>${islandsScript}
</body>
</html>`
}

// --- Main build --------------------------------------------------------------

export interface BuildOptions {
  config: SiteConfig
  /** Absolute path to srcDir (resolved by CLI before calling buildSite). */
  srcDir: string
  /** Absolute path to outDir. */
  outDir: string
  /** Absolute path to public/ dir to copy as-is. Optional. */
  publicDir?: string
  /** Absolute path to a custom theme.css to override the default. Optional. */
  themeCssPath?: string
}

export async function buildSite(options: BuildOptions): Promise<void> {
  const { config, srcDir, outDir, publicDir, themeCssPath } = options
  const searchEnabled = config.themeConfig.search !== false

  const pages = discoverPages(srcDir)
  console.log(`Discovered ${pages.length} pages.`)

  const highlight = await createHighlighter()
  const themeCss = themeCssPath
    ? readFileSync(themeCssPath, "utf8")
    : readFileSync(join(here, "..", "theme.css"), "utf8")

  // 1. Render markdown → Domphy docs
  const built: Array<{
    route: string; outFile: string; title: string
    doc: Awaited<ReturnType<typeof renderDoc>>
  }> = []
  const searchDocs = []
  for (const page of pages) {
    const source = readFileSync(page.filePath, "utf8")
    const doc = await renderDoc(source, {
      filePath: page.filePath, docsDir: srcDir, repoRoot: srcDir, highlight,
    })
    sanitizeStyles(doc.body)
    built.push({ route: page.route, outFile: page.outFile, title: doc.title, doc })
    const textParts: string[] = []
    flattenText(doc.body, textParts)
    searchDocs.push({
      route: page.route, title: doc.title,
      text: textParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 20000),
      toc: doc.toc,
    })
  }

  // 2. Define @domphy/app routes
  const routes = defineRoutes(
    built.map(page => {
      const ctx: LayoutContext = {
        route: page.route, title: page.title,
        body: page.doc.body, toc: page.doc.toc,
        frontmatter: page.doc.frontmatter, config,
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
          title: pageTitle, description, metadataBase: config.hostname,
          openGraph: { title: pageTitle, description, url: page.route === "/" ? "/" : `${page.route}/`, siteName: config.title, type: "website" as const },
          twitter: { card: "summary" as const, title: pageTitle, description },
          alternates: { canonical },
        },
        page: () => isHome ? homeShell(ctx) : pageShell(ctx),
      }
    }),
  )
  const app = createApp(routes)

  // 3. Render each route to static HTML
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const failures: Array<{ route: string; error: string }> = []
  let totalBytes = 0
  for (const page of built) {
    try {
      const result = await app.renderToString(page.route)
      const doc = htmlDocument(result, config, searchEnabled, themeCss)
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
    console.warn(`\n${failures.length} page(s) failed:`)
    for (const failure of failures) console.warn(`  ✗ ${failure.route}: ${failure.error}`)
  }

  // 4. Islands bundle
  await buildIslandsBundle(outDir, searchEnabled)

  // 5. Search index
  const searchIndex = buildSearchIndex(searchDocs)
  writeFileSync(join(outDir, "search-index.json"), searchIndex, "utf8")

  // 6. Public dir
  if (publicDir && existsSync(publicDir)) cpSync(publicDir, outDir, { recursive: true })

  // 7. Sitemap
  if (config.hostname) {
    writeFileSync(join(outDir, "sitemap.xml"), buildSitemap(built.map(p => p.route), config.hostname), "utf8")
  }

  console.log(`Built ${built.length} pages (${(totalBytes / 1024).toFixed(0)} KB) → ${outDir}`)
}
