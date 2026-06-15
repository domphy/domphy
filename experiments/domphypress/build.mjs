// DomphyPress POC — static documentation site generator built on @domphy/app.
//
// Pipeline per page:
//   read markdown -> strip VitePress-only syntax -> markdown-it -> HTML string
//   -> wrap as a single-root Domphy inline-HTML node -> a route in defineRoutes
//   -> createApp(...).renderToString(url) -> write a full standalone .html file.
//
// Run: node build.mjs   (from experiments/domphypress)

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, defineRoutes, navLink } from "@domphy/app";
import { heading, link, paragraph } from "@domphy/ui";
import MarkdownIt from "markdown-it";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = join(here, "..", "..", "apps", "web", "docs");
const outDir = join(here, "dist-poc");

// --- The docs we render. slug -> source markdown path + sidebar title. ---
const pages = [
  { slug: "quickstart", title: "Quickstart", file: "quickstart.md" },
  { slug: "syntax", title: "Syntax", file: "core/syntax.md" },
  { slug: "button", title: "Button", file: "ui/patches/button.md" },
];

// --- Strip VitePress-only Markdown extensions so plain markdown-it can parse. ---
// These are authoring conveniences VitePress understands but standard markdown
// (and a real DomphyPress) would handle with its own plugins; for the POC we
// drop them and keep the prose + code that carries the documentation value.
function stripVitePress(source) {
  let text = source;

  // Frontmatter (--- ... --- at the very top).
  text = text.replace(/^---\n[\s\S]*?\n---\n/, "");

  // <script setup> ... </script> blocks (component imports).
  text = text.replace(/<script[\s\S]*?<\/script>/g, "");

  // Vue component tags used inline for live previews / editors.
  text = text.replace(/<DomphyPreview[^>]*\/?>/g, "");
  text = text.replace(/<CodeEditor[^>]*\/?>/g, "");

  // `<<< @/path` and `<<< ../path [label]` source-include directives.
  text = text.replace(/^<<<.*$/gm, "");

  // `!!!include(path)!!!` partial includes.
  text = text.replace(/!!!include\([^)]*\)!!!/g, "");

  // Container fences: opening `::: name [args]` and closing `:::`.
  // We unwrap them (keep the inner content) by removing the marker lines only.
  text = text.replace(/^:::.*$/gm, "");

  // Code-fence info-string labels VitePress adds, e.g. ```bash [NPM] -> ```bash
  text = text.replace(/^(```[a-z0-9]*)\s+\[[^\]]*\]\s*$/gim, "$1");

  return text.trim();
}

const md = new MarkdownIt({ html: true, linkify: true });

function markdownToHtml(source) {
  const cleaned = stripVitePress(source);
  const html = md.render(cleaned);
  // @domphy/core inline-HTML content keeps only ONE root node (template.firstChild),
  // so wrap the whole rendered document in a single <div> root.
  return `<div class="markdown-body">${html}</div>`;
}

// --- Shared docs layout: sidebar nav + content area, built in Domphy. ---
function docsLayout(children) {
  return {
    div: [
      {
        header: [
          {
            h1: "DomphyPress",
            $: [heading()],
            style: { fontSize: "20px", margin: "0" },
          },
          {
            span: "  ·  @domphy/app SSG proof of concept",
            style: { opacity: "0.6" },
          },
        ],
        style: {
          padding: "16px 24px",
          borderBottom: "1px solid #e2e2e2",
          display: "flex",
          alignItems: "baseline",
          gap: "8px",
        },
      },
      {
        div: [
          // Sidebar
          {
            nav: pages.map((page) => ({
              div: {
                a: page.title,
                href: `/${page.slug}`,
                $: [navLink({ href: `/${page.slug}` }), link()],
              },
              style: { padding: "6px 0" },
            })),
            style: {
              flex: "0 0 200px",
              padding: "24px",
              borderRight: "1px solid #e2e2e2",
            },
          },
          // Content
          {
            main: [children],
            style: {
              flex: "1 1 auto",
              padding: "24px 40px",
              maxWidth: "820px",
              lineHeight: "1.6",
            },
          },
        ],
        style: { display: "flex", alignItems: "stretch", minHeight: "80vh" },
      },
      {
        footer: {
          p: "Generated statically by @domphy/app — no client framework, no build step.",
          $: [paragraph({ color: "neutral" })],
          style: { margin: "0", fontSize: "13px" },
        },
        style: {
          padding: "16px 24px",
          borderTop: "1px solid #e2e2e2",
          opacity: "0.6",
        },
      },
    ],
  };
}

// --- Build the route tree: one child route per docs page. ---
const routes = defineRoutes([
  {
    path: "/",
    layout: (children) => docsLayout(children),
    page: () => ({
      div: markdownToHtml(
        "# DomphyPress\n\nA documentation site rendered to static HTML by **@domphy/app**.\n\nPick a page from the sidebar.",
      ),
    }),
    metadata: {
      title: { default: "DomphyPress", template: "%s · DomphyPress" },
    },
    children: pages.map((page) => {
      const source = readFileSync(join(docsDir, page.file), "utf8");
      const contentHtml = markdownToHtml(source);
      return {
        path: page.slug,
        metadata: { title: page.title },
        page: () => ({ div: contentHtml }),
      };
    }),
  },
]);

const app = createApp(routes);

// --- Assemble a full HTML document from an SSR result. ---
function htmlDocument(result) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${result.head}
<style id="domphy-style">${result.css}</style>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; }
  .markdown-body pre { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; overflow-x: auto; }
  .markdown-body code { background: #f0f0f0; padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }
  .markdown-body pre code { background: none; padding: 0; }
  .markdown-body h1, .markdown-body h2, .markdown-body h3 { line-height: 1.25; }
  .markdown-body table { border-collapse: collapse; }
  .markdown-body th, .markdown-body td { border: 1px solid #ddd; padding: 6px 10px; }
</style>
</head>
<body>
<div id="domphy-app">${result.html}</div>
${result.bootstrapScript}
</body>
</html>`;
}

// --- Render every route to a static file. ---
async function run() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const urls = [
    { url: "/", out: "index.html" },
    ...pages.map((page) => ({
      url: `/${page.slug}`,
      out: `${page.slug}.html`,
    })),
  ];

  const summary = [];
  for (const { url, out } of urls) {
    const result = await app.renderToString(url);
    const doc = htmlDocument(result);
    writeFileSync(join(outDir, out), doc, "utf8");
    summary.push({
      url,
      out,
      status: result.status,
      htmlBytes: result.html.length,
      cssBytes: result.css.length,
      headBytes: result.head.length,
    });
  }

  // Also exercise a 404 to confirm status handling.
  const missing = await app.renderToString("/does-not-exist");
  writeFileSync(join(outDir, "404.html"), htmlDocument(missing), "utf8");
  summary.push({
    url: "/does-not-exist",
    out: "404.html",
    status: missing.status,
    htmlBytes: missing.html.length,
    cssBytes: missing.css.length,
    headBytes: missing.head.length,
  });

  console.table(summary);
  console.log(`\nWrote ${summary.length} files to ${outDir}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
