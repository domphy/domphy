// Template file contents for the "spa" starter (Vite + TypeScript + Domphy).
// `__DOMPHY_VERSION__` is replaced at scaffold time with the lockstep version
// of this CLI (which always matches the published @domphy/* packages).

export interface TemplateFile {
  // Path relative to the target project directory (POSIX separators).
  path: string;
  contents: string;
}

const packageJson = `{
  "name": "__PROJECT_NAME__",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@domphy/core": "__DOMPHY_VERSION__",
    "@domphy/theme": "__DOMPHY_VERSION__",
    "@domphy/ui": "__DOMPHY_VERSION__"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vite": "^6.0.0"
  }
}
`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>__PROJECT_NAME__</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

const mainTs = `import { ElementNode, type DomphyElement, toState } from "@domphy/core";
import { themeApply } from "@domphy/theme";
import { button, card, heading, paragraph } from "@domphy/ui";

// Apply the Domphy design tokens to the document once at startup.
themeApply();

// Reactive state: read it with \`count.get(listener)\` inside a reactive
// function to auto-subscribe; write it with \`count.set(...)\` in event handlers.
const count = toState(0);

const App: DomphyElement<"div"> = {
  div: [
    { h1: "Welcome to Domphy", $: [heading()] },
    {
      p: "Edit src/main.ts and save to see live updates.",
      $: [paragraph()],
    },
    {
      div: [
        { h3: (listener) => \`Count: \${count.get(listener)}\`, $: [heading()] },
        {
          div: [
            {
              button: "Increment",
              onClick: () => count.set(count.get() + 1),
              $: [button({ color: "primary" })],
            },
            {
              button: "Reset",
              onClick: () => count.set(0),
              $: [button()],
            },
          ],
          style: { display: "flex", gap: "8px", marginTop: "12px" },
        },
      ],
      $: [card()],
    },
  ],
  style: {
    maxWidth: "560px",
    margin: "48px auto",
    padding: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
};

const root = document.getElementById("app");
if (root) {
  new ElementNode(App).render(root);
}
`;

const tsconfigJson = `{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
`;

const viteConfigTs = `import { defineConfig } from "vite";

export default defineConfig({
  // Domphy is a plain runtime with no build plugin required.
  // Vite serves and bundles the TypeScript entry directly.
});
`;

const gitignore = `node_modules
dist
*.local
.DS_Store
`;

const readme = `# __PROJECT_NAME__

A starter project built with [Domphy](https://domphy.com) — the AI-friendly UI framework.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open the printed local URL in your browser.

## Scripts

- \`npm run dev\` — start the Vite dev server with hot reload.
- \`npm run build\` — type-check and produce a production build in \`dist/\`.
- \`npm run preview\` — preview the production build locally.

## How it works

UI is described with plain objects keyed by HTML tag. Styling and behavior come
from **patches** applied through the \`$\` array. Reactivity is listener-based via
\`toState\`. See \`src/main.ts\` for a working counter, then read
[the docs](https://domphy.com/docs/) and \`AGENTS.md\` in this project for the
full grammar.
`;

// Condensed agent guide so AI tools working inside the generated project
// produce idiomatic Domphy code. Mirrors the canonical repo AGENTS.md.
const agentsMd = `# AGENTS.md — Domphy project

Instructions for AI agents (and humans) writing/editing UI code in this project.
This is a [Domphy](https://domphy.com) app. Full machine context lives at
https://domphy.com/llms.txt and https://domphy.com/llms-full.txt.

## What Domphy is

A patch-based, framework-agnostic UI runtime. No JSX, no virtual DOM. UIs are
**plain objects keyed by HTML tag**; behavior/style is added by **patches**
applied via the \`$\` array. Reactivity is listener-based (\`toState\`).

\`\`\`ts
import { toState } from "@domphy/core";
import { button } from "@domphy/ui";

const count = toState(0);
const App = {
  div: [
    { p: (listener) => \`Count: \${count.get(listener)}\` },
    {
      button: "Add",
      $: [button({ color: "primary" })],
      onClick: () => count.set(count.get() + 1),
    },
  ],
};
\`\`\`

## Core rules

- **Plain objects keyed by tag.** First key = HTML tag; value = content
  (string | number | array | \`(listener) => value\` | \`null\` for void tags).
- **Patches via \`$\`**, never wrapper components. Compose multiple:
  \`$: [button(), tooltip({ content: "..." })]\`. The native element always wins
  over patch defaults.
- **Reactivity:** read with \`(listener) => state.get(listener)\`; write in events
  with \`state.set(...)\`. One-way data flow. Prefer \`RecordState\` for per-key
  reactivity. A controlled input
  (\`value: (listener) => state.get(listener)\` + \`onInput: (event) => state.set(event.target.value)\`)
  is safe.
- **Never inline typography styles** (fontSize, color, margin, lineHeight…). Use
  typography patches: \`small()\`, \`paragraph()\`, \`heading()\`, \`link()\`,
  \`strong()\`, \`emphasis()\`, \`code()\`, \`keyboard()\`.
- **Theme, not hard-coded values:** \`themeColor()\`, \`themeSpacing()\`,
  \`themeSize()\`, \`themeDensity()\`; tones are \`inherit\`/\`base\`/\`shift-N\`.
- **\`_key\`** on dynamic/reordered child lists (identity for reconcile).
- **Lifecycle hooks** (\`_onMount\`, \`_onBeforeRemove(node, done)\` — must call
  \`done()\`, \`_onRemove\`) for imperative/3rd-party integration; events stay flat
  (\`onClick\`, \`onInput\`).
- **Comments in code: English only.** Names: descriptive, no abbreviations
  (\`index\` not \`i\` except loops; listener \`l\`, event \`e\`, node \`node\`).

## Packages

- \`@domphy/core\` — runtime: element/reactivity/lifecycle/SSR/CSS-in-JS
  (\`toState\`, \`RecordState\`, \`ElementNode\`, \`computed\`/\`effect\`/\`batch\`).
- \`@domphy/theme\` — design tokens (\`themeColor\`/\`themeSpacing\`/\`themeApply\`).
- \`@domphy/ui\` — patches (\`button\`, \`card\`, \`dialog\`, \`select\`, \`motion\`, …).
  Installing \`@domphy/ui\` brings \`@domphy/core\` and \`@domphy/theme\` with it.

## Mounting

\`\`\`ts
import { ElementNode } from "@domphy/core";
import { themeApply } from "@domphy/theme";

themeApply();
new ElementNode(App).render(document.getElementById("app")!);
\`\`\`
`;

export function templateFiles(projectName: string, domphyVersion: string): TemplateFile[] {
  const replace = (contents: string): string =>
    contents
      .replaceAll("__PROJECT_NAME__", projectName)
      .replaceAll("__DOMPHY_VERSION__", domphyVersion);

  return [
    { path: "package.json", contents: replace(packageJson) },
    { path: "index.html", contents: replace(indexHtml) },
    { path: "src/main.ts", contents: replace(mainTs) },
    { path: "tsconfig.json", contents: replace(tsconfigJson) },
    { path: "vite.config.ts", contents: replace(viteConfigTs) },
    { path: ".gitignore", contents: replace(gitignore) },
    { path: "README.md", contents: replace(readme) },
    { path: "AGENTS.md", contents: replace(agentsMd) },
  ];
}
