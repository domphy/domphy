// DomphyPress static site generator.
// Pipeline: discover pages → renderDoc → layout → renderToString → HTML.
// Extras: islands bundle, search index, sitemap, git last-updated, locales.

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, defineRoutes } from "@domphy/app";
import { themeCSS } from "@domphy/theme";
import type * as EsbuildType from "esbuild";
import { createHighlighter } from "./highlight.js";
import { homeShell, type LayoutContext, pageShell } from "./layout.js";
import { renderDoc } from "./pipeline.js";
import { discoverPages } from "./routes.js";
import { buildSearchIndex } from "./search.js";
import { pressCSS } from "./theme.js";
import type { SiteConfig } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));

// --- Utilities ---------------------------------------------------------------

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

function estimateReadingTime(textContent: string): number {
  return Math.max(1, Math.round(textContent.split(/\s+/).length / 200));
}

function getLastUpdated(filePath: string): string | undefined {
  try {
    const result = execSync(`git log -1 --format="%aI" -- "${filePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}

// --- Islands bundle ----------------------------------------------------------

async function buildIslandsBundle(
  outDir: string,
  searchEnabled: boolean,
): Promise<void> {
  if (!searchEnabled) return;
  const islandsSource = join(here, "islands.js");
  const entrySource = `import{bootstrap}from${JSON.stringify(islandsSource)};bootstrap({search:{kind:"search",id:"search"}});`;
  const tmpEntry = join(outDir, "_press_islands_entry.js");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(tmpEntry, entrySource, "utf8");
  const { build: esbuildBuild } = (await import(
    "esbuild"
  )) as typeof EsbuildType;
  await esbuildBuild({
    entryPoints: { "press-islands": tmpEntry },
    bundle: true,
    splitting: false,
    format: "esm",
    outdir: join(outDir, "assets"),
    entryNames: "[name]",
    minify: true,
    sourcemap: false,
    target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  });
  rmSync(tmpEntry);
}

// --- Sitemap -----------------------------------------------------------------

function toAbsUrl(hostname: string, route: string): string {
  return route === "/" ? `${hostname}/` : `${hostname}${route}`.replace(/\/+$/, "") + "/";
}

function buildSitemap(
  routes: string[],
  hostname: string,
  locales?: Record<string, import("./types.js").LocaleConfig>,
): string {
  const routeSet = new Set(routes);
  const localePairs = locales ? Object.entries(locales) : [];
  // Only emit xhtml alternates when there are 2+ locales
  const hasAlternates = localePairs.length >= 2;

  const xmlns = hasAlternates
    ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    : "";

  // Determine the default locale prefix (key "/" if present, else first key)
  const defaultPrefix =
    localePairs.find(([k]) => k === "/") != null
      ? "/"
      : (localePairs[0]?.[0] ?? "/");

  const urls = routes.map((route) => {
    const loc = toAbsUrl(hostname, route);

    if (!hasAlternates) return `  <url><loc>${loc}</loc></url>`;

    // Identify which locale prefix this route belongs to
    let ownPrefix = "/";
    for (const [prefix] of localePairs) {
      if (prefix !== "/" && route.startsWith(prefix)) {
        ownPrefix = prefix;
        break;
      }
    }

    // Canonical slug = route with locale prefix stripped
    const slug =
      ownPrefix === "/"
        ? route
        : "/" + route.slice(ownPrefix.length);

    // Build alternate links for each locale that has this page
    const alternates: string[] = [];
    for (const [prefix, locale] of localePairs) {
      const altRoute = prefix === "/" ? slug : prefix + slug.slice(1);
      if (!routeSet.has(altRoute)) continue;
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="${locale.lang}" href="${toAbsUrl(hostname, altRoute)}"/>`,
      );
    }

    // x-default points to the default locale's version
    const xDefaultRoute =
      defaultPrefix === "/" ? slug : defaultPrefix + slug.slice(1);
    if (routeSet.has(xDefaultRoute)) {
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${toAbsUrl(hostname, xDefaultRoute)}"/>`,
      );
    }

    if (alternates.length === 0) return `  <url><loc>${loc}</loc></url>`;
    return `  <url>\n    <loc>${loc}</loc>\n${alternates.join("\n")}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xmlns}>\n${urls.join("\n")}\n</urlset>`;
}

// --- HTML document -----------------------------------------------------------

const RUNTIME_SCRIPT = `(function(){
try{var t=localStorage.getItem('dp-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(_){}
function closeSidebar(){document.documentElement.setAttribute('data-sidebar','');}
addEventListener('click',function(e){
  var el=e.target.closest&&e.target.closest('[data-theme-toggle]');
  if(el){var d=document.documentElement;var n=d.getAttribute('data-theme')==='dark'?'':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('dp-theme',n);}catch(_){}return;}
  var m=e.target.closest&&e.target.closest('[data-menu-toggle]');
  if(m){var d2=document.documentElement;d2.setAttribute('data-sidebar',d2.getAttribute('data-sidebar')==='open'?'':'open');return;}
  var bd=e.target.closest&&e.target.closest('.dp-sidebar-backdrop');
  if(bd){closeSidebar();return;}
  var cp=e.target.closest&&e.target.closest('[data-copy]');
  if(cp){var ci=cp.closest('.code-block-inner');var ce=ci&&ci.querySelector('code');if(ce){navigator.clipboard&&navigator.clipboard.writeText(ce.textContent||'').then(function(){cp.textContent='✓';setTimeout(function(){cp.textContent='⎘';},2000);}).catch(function(){});}return;}
  var st=e.target.closest&&e.target.closest('[data-sidebar-toggle]');
  if(st){var gr=st.closest('.dp-sidebar-group');if(gr){gr.classList.toggle('collapsed');var sp=st.parentNode&&st.parentNode.querySelector('span');var k=sp&&sp.textContent;if(k)try{localStorage.setItem('dp-sc-'+k,gr.classList.contains('collapsed')?'1':'0');}catch(_){}}return;}
  var da=e.target.closest&&e.target.closest('[data-dismiss-announcement]');
  if(da){var bar=document.querySelector('.dp-announcement');if(bar){var id=bar.getAttribute('data-id');if(id)try{localStorage.setItem('dp-dismiss-'+id,'1');}catch(_){}bar.remove();}return;}
});
addEventListener('keydown',function(e){if(e.key==='Escape'){var d=document.documentElement;if(d.getAttribute('data-sidebar')==='open'){closeSidebar();}}});
addEventListener('DOMContentLoaded',function(){
  try{document.querySelectorAll('.dp-announcement[data-id]').forEach(function(b){if(localStorage.getItem('dp-dismiss-'+b.getAttribute('data-id')))b.remove();});}catch(_){}
  try{document.querySelectorAll('.dp-sidebar-group').forEach(function(gr){var tb=gr.querySelector('[data-sidebar-toggle]');if(!tb)return;var sp=tb.parentNode&&tb.parentNode.querySelector('span');var k=sp&&sp.textContent;if(!k)return;var v=localStorage.getItem('dp-sc-'+k);if(v==='1')gr.classList.add('collapsed');else if(v==='0')gr.classList.remove('collapsed');});}catch(_){}
});
})();`;

function mermaidHeadScript(mermaid: boolean | { cdn?: string }): string {
  const cdn =
    typeof mermaid === "object" && mermaid.cdn
      ? mermaid.cdn
      : "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  return `<script type="module">import mermaid from '${cdn}';mermaid.initialize({startOnLoad:false,theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'default'});document.addEventListener('DOMContentLoaded',()=>mermaid.run({querySelector:'.dp-mermaid'}));</script>`;
}

function htmlDocument(
  result: { html: string; css: string; head: string; status: number },
  config: SiteConfig,
  searchEnabled: boolean,
  generatedCss: string,
  pageHead: string[],
  lang: string,
): string {
  const islandsScript = searchEnabled
    ? `\n<script type="module" src="${config.base}assets/press-islands.js"></script>`
    : "";
  const mermaidScript = config.themeConfig.mermaid
    ? mermaidHeadScript(config.themeConfig.mermaid)
    : "";
  return `<!DOCTYPE html>
<html lang="${lang}" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${result.head}
${config.head.join("\n")}
${pageHead.join("\n")}
${mermaidScript}
<style>${generatedCss}</style>
<style id="domphy-style">${result.css}</style>
<script>${RUNTIME_SCRIPT}</script>
</head>
<body>
<div id="domphy-app">${result.html}</div>${islandsScript}
</body>
</html>`;
}

// --- Main build --------------------------------------------------------------

export interface BuildOptions {
  config: SiteConfig;
  srcDir: string;
  outDir: string;
  publicDir?: string;
}

export async function buildSite(options: BuildOptions): Promise<void> {
  const { config, srcDir, outDir, publicDir } = options;
  const searchEnabled = config.themeConfig.search !== false;
  const showLastUpdated = !!config.lastUpdated;

  // Discover pages: root + locales
  const pages = discoverPages(srcDir);
  const localePages: Array<{
    filePath: string;
    route: string;
    outFile: string;
    localeKey: string;
  }> = pages.map((p) => ({ ...p, localeKey: "/" }));
  if (config.locales) {
    for (const [localeKey, _locale] of Object.entries(config.locales)) {
      if (localeKey === "/") continue;
      const localeDir = resolve(
        srcDir,
        localeKey.replace(/^\//, "").replace(/\/$/, ""),
      );
      if (!existsSync(localeDir)) continue;
      for (const p of discoverPages(localeDir)) {
        const prefix = localeKey.replace(/\/$/, "");
        localePages.push({
          filePath: p.filePath,
          route: prefix + p.route,
          outFile:
            p.outFile === "index.html"
              ? `${localeKey.replace(/^\//, "")}index.html`
              : localeKey.replace(/^\//, "") + p.outFile,
          localeKey,
        });
      }
    }
  }
  console.log(`Discovered ${localePages.length} pages.`);

  const highlight = await createHighlighter();
  const generatedCss = themeCSS() + pressCSS();

  // 1. Render markdown → Domphy docs
  const built: Array<{
    route: string;
    outFile: string;
    title: string;
    localeKey: string;
    doc: Awaited<ReturnType<typeof renderDoc>>;
    lastUpdated: string | undefined;
    readingTime: number;
    filePath: string;
    relPath: string;
  }> = [];
  const searchDocs = [];

  for (const page of localePages) {
    const source = readFileSync(page.filePath, "utf8");
    const doc = await renderDoc(source, {
      filePath: page.filePath,
      docsDir: srcDir,
      repoRoot: srcDir,
      highlight,
      markdownConfig: config.markdown?.config,
    });
    if (doc.frontmatter.draft === true) {
      console.log(`  ↷ ${page.route} (draft, skipped)`);
      continue;
    }
    sanitizeStyles(doc.body);
    const textParts: string[] = [];
    flattenText(doc.body, textParts);
    const textContent = textParts.join(" ").replace(/\s+/g, " ").trim();
    const readingTime = estimateReadingTime(textContent);
    const lastUpdated = showLastUpdated
      ? getLastUpdated(page.filePath)
      : undefined;
    const relPath = relative(srcDir, page.filePath).replace(/\\/g, "/");

    built.push({
      route: page.route,
      outFile: page.outFile,
      title: doc.title,
      localeKey: page.localeKey,
      doc,
      lastUpdated,
      readingTime,
      filePath: page.filePath,
      relPath,
    });
    searchDocs.push({
      route: page.route,
      title: doc.title,
      text: textContent.slice(0, 20000),
      toc: doc.toc,
    });
  }

  // Per-page metadata maps (route → head strings / lang code)
  const pageHeadMap = new Map<string, string[]>();
  const pageLangMap = new Map<string, string>();

  // 2. Define @domphy/app routes
  const appRoutes = defineRoutes(
    built.map((page) => {
      const localeConfig = config.locales?.[page.localeKey];
      const mergedTheme = localeConfig?.themeConfig
        ? { ...config.themeConfig, ...localeConfig.themeConfig }
        : config.themeConfig;
      const mergedConfig: SiteConfig = { ...config, themeConfig: mergedTheme };
      const lang = localeConfig?.lang ?? "en";
      const ctx: LayoutContext = {
        route: page.route,
        title: page.title,
        body: page.doc.body,
        toc: page.doc.toc,
        frontmatter: page.doc.frontmatter,
        config: mergedConfig,
        lastUpdated: page.lastUpdated,
        readingTime: page.readingTime,
        filePath: page.relPath,
      };
      const isHome =
        page.route === "/" ||
        (page.localeKey !== "/" && page.route === page.localeKey);
      const description =
        typeof page.doc.frontmatter.description === "string"
          ? page.doc.frontmatter.description
          : firstParagraphText(page.doc.body) || config.description;
      const siteTitle = localeConfig?.title ?? config.title;
      const pageTitle =
        page.title === siteTitle ? siteTitle : `${page.title} | ${siteTitle}`;
      const canonical =
        page.route === "/"
          ? `${config.hostname}/`
          : `${config.hostname}${page.route}/`;
      // Store per-page head and lang for use during HTML serialization
      const pageHead = Array.isArray(page.doc.frontmatter.head)
        ? (page.doc.frontmatter.head as string[]).filter(
            (s) => typeof s === "string",
          )
        : [];
      pageHeadMap.set(page.route, pageHead);
      pageLangMap.set(page.route, lang);
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
            siteName: siteTitle,
            type: "website" as const,
          },
          twitter: { card: "summary" as const, title: pageTitle, description },
          alternates: { canonical },
        },
        page: () => (isHome ? homeShell(ctx) : pageShell(ctx)),
      };
    }),
  );
  const app = createApp(appRoutes);

  // 3. Render each route to static HTML
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const failures: Array<{ route: string; error: string }> = [];
  let totalBytes = 0;
  for (const page of built) {
    try {
      const result = await app.renderToString(page.route);
      const pageHead = pageHeadMap.get(page.route) ?? [];
      const lang = pageLangMap.get(page.route) ?? "en";
      const html = htmlDocument(
        result,
        config,
        searchEnabled,
        generatedCss,
        pageHead,
        lang,
      );
      const outPath = join(outDir, page.outFile);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html, "utf8");
      totalBytes += html.length;
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
    console.warn(`\n${failures.length} page(s) failed:`);
    for (const failure of failures)
      console.warn(`  ✗ ${failure.route}: ${failure.error}`);
  }

  // 4. Islands bundle
  await buildIslandsBundle(outDir, searchEnabled);

  // 5. Search index
  writeFileSync(
    join(outDir, "search-index.json"),
    buildSearchIndex(searchDocs),
    "utf8",
  );

  // 6. Public dir
  if (publicDir && existsSync(publicDir))
    cpSync(publicDir, outDir, { recursive: true });

  // 7. Sitemap
  if (config.hostname) {
    writeFileSync(
      join(outDir, "sitemap.xml"),
      buildSitemap(
        built.map((p) => p.route),
        config.hostname,
        config.locales,
      ),
      "utf8",
    );
  }

  console.log(
    `Built ${built.length} pages (${(totalBytes / 1024).toFixed(0)} KB) → ${outDir}`,
  );
}
