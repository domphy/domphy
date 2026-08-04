// DomphyPress static site generator.
// Pipeline: discover pages → renderDoc → layout → renderToString → HTML.
// Extras: islands bundle, search index, sitemap, git last-updated, locales.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, defineRoutes } from "@domphy/app";
import type { DomphyElement } from "@domphy/core";
import { configure } from "@domphy/core";
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

export function getLastUpdated(filePath: string): string | undefined {
  try {
    // execFileSync bypasses shell interpretation, unlike execSync, so
    // filePath cannot break out of the argument via shell metacharacters.
    const result = execFileSync(
      "git",
      ["log", "-1", "--format=%aI", "--", filePath],
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], timeout: 5000 },
    ).trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}

// --- Incremental build cache -------------------------------------------------

interface CacheEntry {
  hash: string;
  searchDoc: import("./types.js").SearchDocument;
  /** Output file (relative to outDir) this page emitted — used to remove
   *  stale output when the page is deleted or becomes a draft. */
  outFile: string;
}

interface PressCache {
  configHash: string;
  pages: Record<string, CacheEntry>;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function hashConfig(config: SiteConfig): string {
  // Hash every content-affecting field so cached pages are invalidated
  // whenever config changes, not just srcDir/outDir (build inputs, not content).
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: config.title,
        description: config.description,
        hostname: config.hostname,
        base: config.base,
        head: config.head,
        cspNonce: config.cspNonce,
        lastUpdated: config.lastUpdated,
        locales: config.locales,
        themeConfig: config.themeConfig,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

// --- Islands bundle ----------------------------------------------------------

async function buildIslandsBundle(
  outDir: string,
  searchEnabled: boolean,
  base: string,
): Promise<string | null> {
  if (!searchEnabled) return null;
  const islandsSource = join(here, "islands.js");
  const searchOptions = JSON.stringify({
    indexUrl: `${base}search-index.json`,
    basePath: base === "/" ? "" : base.replace(/\/$/, ""),
  });
  const entrySource = `import{bootstrap}from${JSON.stringify(islandsSource)};bootstrap({search:{kind:"search",id:"search",searchOptions:${searchOptions}}});`;
  const tmpEntry = join(outDir, "_press_islands_entry.js");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(tmpEntry, entrySource, "utf8");
  try {
    const { build: esbuildBuild } = (await import(
      "esbuild"
    )) as typeof EsbuildType;
    const result = await esbuildBuild({
      entryPoints: { "press-islands": tmpEntry },
      bundle: true,
      splitting: false,
      format: "esm",
      outdir: join(outDir, "assets"),
      // Content-hashed file name: an immutable-cache deploy must never pin a
      // stale press-islands.js (the hash changes whenever the bundle does).
      entryNames: "[name]-[hash]",
      minify: true,
      sourcemap: false,
      target: "es2020",
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "error",
      metafile: true,
    });
    const output = Object.keys(result.metafile.outputs).find((file) =>
      /assets[/\\]press-islands-[^/\\]+\.js$/.test(file),
    );
    if (!output)
      throw new Error("esbuild did not emit a hashed press-islands bundle");
    const fileName = output.split(/[/\\]/).pop()!;
    // Drop stale hashed bundles from earlier incremental builds.
    const assetsDir = join(outDir, "assets");
    for (const existing of readdirSync(assetsDir)) {
      if (
        existing.startsWith("press-islands-") &&
        existing.endsWith(".js") &&
        existing !== fileName
      )
        rmSync(join(assetsDir, existing), { force: true });
    }
    return fileName;
  } finally {
    rmSync(tmpEntry, { force: true });
  }
}

// --- Sitemap -----------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toAbsUrl(hostname: string, route: string, basePrefix = ""): string {
  return escapeXml(
    route === "/"
      ? `${hostname}${basePrefix}/`
      : `${`${hostname}${basePrefix}${route}`.replace(/\/+$/, "")}/`,
  );
}

function buildSitemap(
  routes: string[],
  hostname: string,
  locales?: Record<string, import("./types.js").LocaleConfig>,
  basePrefix = "",
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
    const loc = toAbsUrl(hostname, route, basePrefix);

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
      ownPrefix === "/" ? route : `/${route.slice(ownPrefix.length)}`;

    // Build alternate links for each locale that has this page
    const alternates: string[] = [];
    for (const [prefix, locale] of localePairs) {
      const altRoute = prefix === "/" ? slug : prefix + slug.slice(1);
      if (!routeSet.has(altRoute)) continue;
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(locale.lang)}" href="${toAbsUrl(hostname, altRoute, basePrefix)}"/>`,
      );
    }

    // x-default points to the default locale's version
    const xDefaultRoute =
      defaultPrefix === "/" ? slug : defaultPrefix + slug.slice(1);
    if (routeSet.has(xDefaultRoute)) {
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${toAbsUrl(hostname, xDefaultRoute, basePrefix)}"/>`,
      );
    }

    if (alternates.length === 0) return `  <url><loc>${loc}</loc></url>`;
    return `  <url>\n    <loc>${loc}</loc>\n${alternates.join("\n")}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xmlns}>\n${urls.join("\n")}\n</urlset>`;
}

// --- HTML document -----------------------------------------------------------

export const RUNTIME_SCRIPT = `(function(){
try{var t=localStorage.getItem('dp-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(_){}
function closeSidebar(){document.documentElement.setAttribute('data-sidebar','');}
addEventListener('click',function(e){
  var el=e.target.closest&&e.target.closest('[data-theme-toggle]');
  if(el){var d=document.documentElement;var n=d.getAttribute('data-theme')==='dark'?'light':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('dp-theme',n);}catch(_){}return;}
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
function initTocSpy(){
  var toc=document.querySelector('nav.dp-toc');
  if(!toc)return;
  var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
  if(!links.length)return;
  var items=[];
  for(var i=0;i<links.length;i++){
    var a=links[i];
    var raw=a.getAttribute('href')||'';
    var id='';
    try{id=decodeURIComponent(raw.charAt(0)==='#'?raw.slice(1):raw);}catch(_){id=raw.charAt(0)==='#'?raw.slice(1):raw;}
    if(!id)continue;
    var heading=document.getElementById(id);
    if(heading)items.push({a:a,el:heading,id:id});
  }
  if(!items.length)return;
  function setActive(id){
    for(var j=0;j<links.length;j++)links[j].removeAttribute('aria-current');
    for(var k=0;k<items.length;k++){
      if(items[k].id===id){items[k].a.setAttribute('aria-current','true');break;}
    }
  }
  toc.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a||!toc.contains(a))return;
    var raw=a.getAttribute('href')||'';
    var id='';
    try{id=decodeURIComponent(raw.charAt(0)==='#'?raw.slice(1):raw);}catch(_){id=raw.charAt(0)==='#'?raw.slice(1):raw;}
    if(id)setActive(id);
  });
  var header=document.querySelector('header');
  var offset=(header&&header.offsetHeight)||56;
  function syncFromScroll(){
    var y=window.scrollY+offset+12;
    var current=items[0].id;
    for(var i=0;i<items.length;i++){
      var top=items[i].el.getBoundingClientRect().top+window.scrollY;
      if(top<=y)current=items[i].id;
    }
    setActive(current);
  }
  var ticking=false;
  function onScroll(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(function(){ticking=false;syncFromScroll();});
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  if(location.hash){
    var hid='';
    try{hid=decodeURIComponent(location.hash.slice(1));}catch(_){hid=location.hash.slice(1);}
    if(hid)setActive(hid);
  }else{
    syncFromScroll();
  }
}
addEventListener('DOMContentLoaded',function(){
  try{document.querySelectorAll('.dp-announcement[data-id]').forEach(function(b){if(localStorage.getItem('dp-dismiss-'+b.getAttribute('data-id')))b.remove();});}catch(_){}
  try{document.querySelectorAll('.dp-sidebar-group').forEach(function(gr){var tb=gr.querySelector('[data-sidebar-toggle]');if(!tb)return;var sp=tb.parentNode&&tb.parentNode.querySelector('span');var k=sp&&sp.textContent;if(!k)return;var v=localStorage.getItem('dp-sc-'+k);if(v==='1')gr.classList.add('collapsed');else if(v==='0')gr.classList.remove('collapsed');});}catch(_){}
  try{initTocSpy();}catch(_){}
});
})();`;

// Inline source of the SVG sanitizer embedded in the mermaid head script
// below — the script runs standalone in the browser and cannot import
// @domphy/core, so this mirrors core's sanitizeHTMLString (script elements,
// on* handler attributes, srcdoc documents, script-capable URL schemes after
// canonicalization). Defense in depth on top of mermaid's strict
// securityLevel, which the script pins at initialize time. Exported so tests
// can evaluate it directly and verify payload stripping.
export const mermaidSanitizeSource = `function sanitize(html){
html=html.replace(/<script[\\s/>][\\s\\S]*?<\\/script\\s*>/gi,'');
html=html.replace(/<script[\\s/>][^>]*>/gi,'');
html=html.replace(/<script[\\s/>][\\s\\S]*$/gi,'');
html=html.replace(/([\\s/])on[a-zA-Z][\\w-]*\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]*)/gi,'$1');
html=html.replace(/([\\s/])srcdoc\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]*)/gi,'$1');
html=html.replace(/((?:href|src|action|formaction|data)\\s*=\\s*)("([^"]*)"|'([^']*)'|([^\\s>]*))/gi,function(match,prefix,_raw,dq,sq,bare){
var canonical=(dq||sq||bare||'')
.replace(/&#(x?[0-9a-fA-F]+);/gi,function(_,code){var cp=code.charAt(0)==='x'||code.charAt(0)==='X'?parseInt(code.slice(1),16):parseInt(code,10);return cp>=0&&cp<=0x10ffff?String.fromCodePoint(cp):'';})
.replace(/&Tab;/gi,'\\t').replace(/&NewLine;/gi,'\\n')
.replace(/[\\x00-\\x20]+/g,'').toLowerCase();
if(canonical.indexOf('javascript:')===0||canonical.indexOf('vbscript:')===0||canonical.indexOf('data:text/html')===0||canonical.indexOf('data:application/xhtml+xml')===0)return prefix+'"#"';
return match;
});
return html;
}`;

function mermaidHeadScript(
  mermaid: boolean | { cdn?: string },
  nonceAttr: string,
): string {
  const cdn =
    typeof mermaid === "object" && mermaid.cdn
      ? mermaid.cdn
      : "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  return `<script type="module"${nonceAttr}>(async()=>{
const blocks=[...document.querySelectorAll('.dp-mermaid')];
if(!blocks.length)return;
${mermaidSanitizeSource}
let mermaid=null,index=0;
const rendered=[];
// mermaid.initialize() mutates the library's GLOBAL config, so every
// initialize+render pair is serialized through this queue — a theme-flip
// re-render must not interleave with an in-flight first render.
let queue=Promise.resolve();
const enqueue=(task)=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
const currentTheme=()=>document.documentElement.getAttribute('data-theme')==='dark'?'dark':'default';
const load=async()=>{if(mermaid)return;const mod=await import('${cdn}');mermaid=mod.default;};
const renderSource=async(source)=>{
await load();
// Pin strict: diagram source is author-supplied text and the rendered SVG is
// written via innerHTML, so mermaid's label sanitization must not rest on the
// library default never changing.
mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:currentTheme()});
const {svg}=await mermaid.render('dp-m-'+(index++),source);
return sanitize(svg);
};
const renderBlock=(el)=>enqueue(async()=>{
try{
const source=el.textContent||'';
const svg=await renderSource(source);
const wrapper=document.createElement('div');
wrapper.className='mermaid';
wrapper.innerHTML=svg;
el.replaceWith(wrapper);
rendered.push({el:wrapper,source});
}catch(_){}
});
const observer=new IntersectionObserver((entries)=>{for(const e of entries){if(!e.isIntersecting)continue;observer.unobserve(e.target);renderBlock(e.target);}},{rootMargin:'200px 0px'});
blocks.forEach((b)=>observer.observe(b));
// Follow [data-theme] flips: re-render already-rendered diagrams with the
// new theme.
new MutationObserver(()=>{
if(!mermaid||rendered.length===0)return;
for(const r of rendered)enqueue(async()=>{try{r.el.innerHTML=await renderSource(r.source);}catch(_){}});
}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
})();</script>`;
}

function htmlDocument(
  result: { html: string; css: string; head: string; status: number },
  config: SiteConfig,
  islandsScriptUrl: string | null,
  generatedCss: string,
  pageHead: string[],
  lang: string,
  nonceAttr: string,
): string {
  const islandsScript = islandsScriptUrl
    ? `\n<script type="module" src="${islandsScriptUrl}"${nonceAttr}></script>`
    : "";
  const mermaidScript = config.themeConfig.mermaid
    ? mermaidHeadScript(config.themeConfig.mermaid, nonceAttr)
    : "";
  return `<!DOCTYPE html>
<html lang="${lang}" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="strict-origin-when-cross-origin">
${result.head}
${config.head.join("\n")}
${pageHead.join("\n")}
${mermaidScript}
<style${nonceAttr}>${generatedCss}</style>
<style id="domphy-style"${nonceAttr}>${result.css}</style>
<script${nonceAttr}>${RUNTIME_SCRIPT}</script>
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
  incremental?: boolean;
}

export async function buildSite(options: BuildOptions): Promise<void> {
  const { config, srcDir, outDir, publicDir, incremental = false } = options;
  const searchEnabled = config.themeConfig.search !== false;
  const showLastUpdated = !!config.lastUpdated;
  const rawBase = config.base ?? "/";
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  // URL prefix for emitted absolute hrefs on non-root deployments ("/docs").
  const basePrefix = base === "/" ? "" : base.replace(/\/+$/, "");
  // CSP: stamp the configured nonce on every press-emitted inline <script>/
  // <style> below, and propagate it into @domphy/app SSR (its injected head
  // tags read getConfig().cspNonce at render time). Passing undefined clears
  // a nonce set by an earlier buildSite call in the same process.
  configure({ cspNonce: config.cspNonce });
  const nonceAttr = config.cspNonce
    ? ` nonce="${escapeXml(config.cspNonce)}"`
    : "";
  // Per-page failures from BOTH render stages, printed together at the end.
  const failures: Array<{ route: string; stage: string; error: string }> = [];

  // --- Load incremental cache ------------------------------------------------
  const cacheFile = join(outDir, ".press-cache.json");
  let cache: PressCache = { configHash: "", pages: {} };
  const configHash = hashConfig(config);

  if (incremental) {
    mkdirSync(outDir, { recursive: true });
    if (existsSync(cacheFile)) {
      try {
        const loaded = JSON.parse(
          readFileSync(cacheFile, "utf8"),
        ) as PressCache;
        if (loaded.configHash === configHash) cache = loaded;
        else console.log("Config changed — full rebuild.");
      } catch {
        /* corrupt cache */
      }
    }
  } else {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  }

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

  // 1. Render markdown → Domphy docs (skip unchanged pages in incremental mode)
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

  const cachedRoutes: string[] = [];
  const searchDocs: import("./types.js").SearchDocument[] = [];
  const updatedCache: PressCache["pages"] = {};
  let cachedCount = 0;

  for (const page of localePages) {
    let contentHash: string;
    let doc: Awaited<ReturnType<typeof renderDoc>>;
    try {
      const source = readFileSync(page.filePath, "utf8");
      contentHash = hashContent(source);
      const cached = cache.pages[page.filePath];

      if (
        incremental &&
        cached?.hash === contentHash &&
        existsSync(join(outDir, page.outFile))
      ) {
        searchDocs.push(cached.searchDoc);
        cachedRoutes.push(page.route);
        updatedCache[page.filePath] = cached;
        cachedCount++;
        continue;
      }

      doc = await renderDoc(source, {
        filePath: page.filePath,
        docsDir: srcDir,
        repoRoot: srcDir,
        highlight,
      });
    } catch (error) {
      failures.push({
        route: page.route,
        stage: "markdown",
        error: String((error as Error).message || error),
      });
      continue;
    }
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
    const searchDoc: import("./types.js").SearchDocument = {
      route: page.route,
      title: doc.title,
      text: textContent.slice(0, 20000),
      toc: doc.toc,
    };

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
    searchDocs.push(searchDoc);
    updatedCache[page.filePath] = {
      hash: contentHash,
      searchDoc,
      outFile: page.outFile,
    };
  }

  // Remove output from the previous build whose page is gone (deleted file)
  // or no longer emitted (newly marked draft, or failed render — those must
  // not leave a stale cached page behind either).
  if (incremental) {
    for (const [filePath, entry] of Object.entries(cache.pages)) {
      if (filePath in updatedCache || !entry.outFile) continue;
      const stalePath = join(outDir, entry.outFile);
      rmSync(stalePath, { force: true });
      // Clean up the route directory when it only held that page.
      try {
        rmdirSync(dirname(stalePath));
      } catch {
        /* not empty — fine */
      }
      console.log(`  ✗ ${entry.outFile} (stale, removed)`);
    }
  }

  if (incremental && cachedCount > 0)
    console.log(`  ${cachedCount} cached, ${built.length} to render.`);

  // Per-page metadata maps (route → head strings / lang code)
  const pageHeadMap = new Map<string, string[]>();
  const pageLangMap = new Map<string, string>();

  // 2. Define @domphy/app routes (only changed pages need SSR)
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
        typeof page.doc.frontmatter.layout === "string"
          ? page.doc.frontmatter.layout === "home"
          : page.route === "/" ||
            (page.localeKey !== "/" && page.route === page.localeKey);
      const description =
        typeof page.doc.frontmatter.description === "string"
          ? page.doc.frontmatter.description
          : firstParagraphText(page.doc.body) || config.description;
      const siteTitle = localeConfig?.title ?? config.title;
      const pageTitle =
        page.title === siteTitle ? siteTitle : `${page.title} | ${siteTitle}`;
      // Index routes already end in "/" — collapse before appending the
      // trailing slash or the canonical gets a double slash ("/docs//").
      const canonical = `${`${config.hostname}${basePrefix}${page.route}`.replace(/\/+$/, "")}/`;
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
            url: `${`${basePrefix}${page.route}`.replace(/\/+$/, "")}/`,
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

  // 3. Islands bundle — built BEFORE page SSR so the content-hashed file name
  // can be referenced from every page's <script> tag.
  const islandsFile = await buildIslandsBundle(outDir, searchEnabled, base);
  const islandsScriptUrl = islandsFile ? `${base}assets/${islandsFile}` : null;

  // 4. Render each changed route to static HTML
  let totalBytes = 0;
  for (const page of built) {
    try {
      const result = await app.renderToString(page.route);
      const pageHead = pageHeadMap.get(page.route) ?? [];
      const lang = pageLangMap.get(page.route) ?? "en";
      const html = htmlDocument(
        result,
        config,
        islandsScriptUrl,
        generatedCss,
        pageHead,
        lang,
        nonceAttr,
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
        stage: "ssr",
        error: String((error as Error).message || error),
      });
      // Do not cache a page whose HTML was never written — the next
      // incremental build must retry it.
      delete updatedCache[page.filePath];
    }
  }

  // 5. 404 page (themed shell — the dev/preview servers serve this file)
  try {
    const notFoundRoutes = defineRoutes([
      {
        path: "/404",
        metadata: { title: `Page not found | ${config.title}` },
        page: () =>
          pageShell({
            route: "/404",
            title: "Page not found",
            body: [
              { h1: "404" } as DomphyElement,
              {
                p: "The page you are looking for does not exist.",
              } as DomphyElement,
              { a: "Back to home", href: base } as DomphyElement,
            ],
            toc: [],
            frontmatter: { layout: "page" },
            config,
          }),
      },
    ]);
    const notFoundApp = createApp(notFoundRoutes);
    const notFoundResult = await notFoundApp.renderToString("/404");
    writeFileSync(
      join(outDir, "404.html"),
      htmlDocument(
        notFoundResult,
        config,
        islandsScriptUrl,
        generatedCss,
        [],
        "en",
        nonceAttr,
      ),
      "utf8",
    );
  } catch (error) {
    failures.push({
      route: "/404",
      stage: "ssr",
      error: String((error as Error).message || error),
    });
  }

  // 6. Search index (all docs: cached + newly rendered)
  writeFileSync(
    join(outDir, "search-index.json"),
    buildSearchIndex(searchDocs),
    "utf8",
  );

  // 7. Public dir
  if (publicDir && existsSync(publicDir))
    cpSync(publicDir, outDir, { recursive: true });

  // 8. Sitemap (all routes: cached + rendered)
  if (config.hostname) {
    writeFileSync(
      join(outDir, "sitemap.xml"),
      buildSitemap(
        [...cachedRoutes, ...built.map((p) => p.route)],
        config.hostname,
        config.locales,
        basePrefix,
      ),
      "utf8",
    );
  }

  // 9. Save incremental cache
  if (incremental) {
    writeFileSync(
      cacheFile,
      JSON.stringify({ configHash, pages: updatedCache } satisfies PressCache),
      "utf8",
    );
  }

  // 10. Failure policy: every per-page error was collected above; report them
  // all at once and fail the build unless the user opted out. A partial site
  // must never exit 0 — that is how silent broken deploys happen.
  if (failures.length > 0) {
    const report = [
      `${failures.length} page(s) failed:`,
      ...failures.map((f) => `  ✗ ${f.route} [${f.stage}]: ${f.error}`),
    ].join("\n");
    if (!config.continueOnError) {
      throw new Error(
        `${report}\nBuild failed. Set continueOnError: true in press.config to build past page errors.`,
      );
    }
    console.warn(`\n${report}\n(continueOnError: build completed anyway)`);
  }

  console.log(
    incremental
      ? `Rendered ${built.length} page(s) (${cachedCount} cached) → ${outDir}`
      : `Built ${built.length} pages (${(totalBytes / 1024).toFixed(0)} KB) → ${outDir}`,
  );
}
