import { defineComponent, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _sfc_main$1 } from "./index.C-nzggKj.js";
import "./Render.C3bu4sjL.js";
import "codemirror";
import "@codemirror/lang-javascript";
import "@codemirror/theme-one-dark";
import "@tanstack/query-core";
import "i18next";
import "page";
import "sortablejs";
import "zod";
import "sucrase";
const AlertDialog = 'import { type DomphyElement, toState } from "@domphy/core"\r\nimport { button, dialog, heading } from "@domphy/ui"\r\n\r\nconst open = toState(false)\r\n\r\nconst alertDialog: DomphyElement<"dialog"> = {\r\n    dialog: [\r\n        { h3: "Delete item?",                  $: [heading()] },\r\n        { p: "This action cannot be undone." },\r\n        {\r\n            div: [\r\n                { button: "Cancel",  $: [button()],                   onClick: () => open.set(false) },\r\n                { button: "Delete",  $: [button({ color: "error" })],  onClick: () => open.set(false) },\r\n            ],\r\n            style: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" },\r\n        },\r\n    ],\r\n    $: [dialog({ open })],\r\n}\r\n\r\nconst App: DomphyElement<"div"> = {\r\n    div: [\r\n        { button: "Delete item", $: [button({ color: "error" })], onClick: () => open.set(true) },\r\n        alertDialog,\r\n    ],\r\n    style: { display: "flex", flexDirection: "column", gap: "1rem" },\r\n}\r\n\r\nexport default App\r\n';
const __pageData = JSON.parse('{"title":"Alert Dialog","description":"","frontmatter":{},"headers":[],"relativePath":"docs/ui/recipes/alertDialog.md","filePath":"docs/ui/recipes/alertDialog.md"}');
const __default__ = { name: "docs/ui/recipes/alertDialog.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="alert-dialog" tabindex="-1">Alert Dialog <a class="header-anchor" href="#alert-dialog" aria-label="Permalink to &quot;Alert Dialog&quot;">​</a></h1><p>A confirmation dialog with explicit confirm/cancel actions — composed from <code>dialog</code>, <code>button</code>, and <code>heading</code>. No new patch needed.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(AlertDialog) }, null, _parent));
      _push(`<h2 id="how-it-works" tabindex="-1">How it works <a class="header-anchor" href="#how-it-works" aria-label="Permalink to &quot;How it works&quot;">​</a></h2><p>The <code>dialog</code> patch handles open/close state, backdrop, and scroll lock. The confirm/cancel buttons are plain <code>button</code> elements inside the dialog content. The pattern is identical to a regular dialog — the only difference is the content: a description of the destructive action and two explicit action buttons.</p><table tabindex="0"><thead><tr><th>Pattern</th><th>Usage</th></tr></thead><tbody><tr><td><code>dialog({ open })</code></td><td>Modal with state-controlled visibility</td></tr><tr><td><code>button({ color: &quot;error&quot; })</code></td><td>Destructive action styled in error color</td></tr><tr><td>Declare in tree + hide</td><td>Dialog always in tree, <code>open</code> state controls visibility</td></tr></tbody></table></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/recipes/alertDialog.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
