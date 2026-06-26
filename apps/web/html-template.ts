// Pure HTML document template — no module-level side effects, fully testable.

export interface PageIslandSpec {
  kind: "search" | "preview" | "editor";
  id: string;
  source?: string;
  code?: string;
  storageKey?: string;
}

export interface RenderResult {
  html: string;
  css: string;
  head: string;
  status: number;
}

// Inline runtime: restores data-theme from localStorage on first paint;
// handles theme-toggle and sidebar-toggle clicks.
export const RUNTIME_SCRIPT = `
(function(){
  try{var t=localStorage.getItem('dp-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
  addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('[data-theme-toggle]');
    if(el){var d=document.documentElement;var n=d.getAttribute('data-theme')==='dark'?'':'dark';d.setAttribute('data-theme',n);try{localStorage.setItem('dp-theme',n);}catch(_){}return;}
    var m=e.target.closest&&e.target.closest('[data-menu-toggle]');
    if(m){var d2=document.documentElement;d2.setAttribute('data-sidebar',d2.getAttribute('data-sidebar')==='open'?'':'open');}
  });
})();`;

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
