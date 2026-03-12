import { defineComponent, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _sfc_main$1 } from "./index.6nOoz2qW.js";
import "./Render.ZCL35t0f.js";
import "codemirror";
import "@codemirror/lang-javascript";
import "@codemirror/theme-one-dark";
import "@tanstack/query-core";
import "i18next";
import "page";
import "sortablejs";
import "zod";
import "sucrase";
const Collapsible = 'import { type DomphyElement, toState } from "@domphy/core"\r\nimport { button, details } from "@domphy/ui"\r\n\r\nconst open = toState(false)\r\n\r\nconst App: DomphyElement<"div"> = {\r\n    div: [\r\n        { button: "Toggle section", $: [button()], onClick: () => open.set(!open.get()) },\r\n        {\r\n            details: [\r\n                { summary: "Section Title" },\r\n                { p: "This content is controlled programmatically via state — no click on summary needed." },\r\n            ],\r\n            $: [details()],\r\n            open: (listener) => open.get(listener),\r\n        },\r\n    ],\r\n    style: { display: "flex", flexDirection: "column", gap: "1rem" },\r\n}\r\n\r\nexport default App\r\n';
const __pageData = JSON.parse('{"title":"Collapsible","description":"","frontmatter":{},"headers":[],"relativePath":"docs/ui/recipes/collapsible.md","filePath":"docs/ui/recipes/collapsible.md"}');
const __default__ = { name: "docs/ui/recipes/collapsible.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="collapsible" tabindex="-1">Collapsible <a class="header-anchor" href="#collapsible" aria-label="Permalink to &quot;Collapsible&quot;">​</a></h1><p>A programmatically controlled expand/collapse section — composed from <code>details</code> and <code>button</code>. No new patch needed.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(Collapsible) }, null, _parent));
      _push(`<h2 id="how-it-works" tabindex="-1">How it works <a class="header-anchor" href="#how-it-works" aria-label="Permalink to &quot;How it works&quot;">​</a></h2><p>The HTML <code>&lt;details&gt;</code> element handles open/close natively. The <code>details</code> patch adds animation and styling. To control it programmatically (without clicking the summary), bind the <code>open</code> attribute reactively to a <code>toState</code> value. Clicking any external button toggles the state.</p><table tabindex="0"><thead><tr><th>Pattern</th><th>Usage</th></tr></thead><tbody><tr><td><code>details</code> patch</td><td>Animated expand/collapse with styling</td></tr><tr><td>Reactive attribute</td><td><code>open: (listener) =&gt; state.get(listener)</code></td></tr><tr><td>External trigger</td><td>Any button can toggle <code>open</code> state</td></tr></tbody></table></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/recipes/collapsible.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
