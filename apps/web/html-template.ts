// Pure HTML document template — no module-level side effects, fully testable.

import { RUNTIME_SCRIPT } from "@domphy/press";

export interface PageIslandSpec {
  kind: "search" | "preview" | "editor";
  id: string;
  source?: string;
  code?: string;
  storageKey?: string;
  /** For "preview": mount the element directly (no toolbar/box chrome). */
  bare?: boolean;
}

export interface RenderResult {
  html: string;
  css: string;
  head: string;
  status: number;
}

export function htmlDocument(
  result: RenderResult,
  generatedCss: string,
  islandSpecs: PageIslandSpec[],
  extraHead: string[],
): string {
  const specsJson = JSON.stringify(islandSpecs).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="strict-origin-when-cross-origin">
${result.head}
${extraHead.join("\n")}
<style>${generatedCss}</style>
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
