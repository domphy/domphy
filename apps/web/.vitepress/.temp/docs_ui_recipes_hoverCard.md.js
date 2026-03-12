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
const HoverCard = 'import { type DomphyElement } from "@domphy/core"\r\nimport { avatar, card, heading, link, paragraph, popover } from "@domphy/ui"\r\n\r\nconst profileCard: DomphyElement<"div"> = {\r\n    div: [\r\n        { img: null, src: "https://avatars.githubusercontent.com/u/1?v=4", $: [avatar()] },\r\n        { h4: "@domphy",         $: [heading()] },\r\n        { p: "Building the web, declaratively.", $: [paragraph()] },\r\n        { p: "42 followers · 18 following" },\r\n    ],\r\n    $: [card()],\r\n    style: { display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "16rem" },\r\n}\r\n\r\nconst App: DomphyElement<"a"> = {\r\n    a: "@domphy",\r\n    href: "#",\r\n    $: [link(), popover({ openOn: "hover", placement: "bottom-start", content: profileCard })],\r\n}\r\n\r\nexport default App\r\n';
const __pageData = JSON.parse('{"title":"Hover Card","description":"","frontmatter":{},"headers":[],"relativePath":"docs/ui/recipes/hoverCard.md","filePath":"docs/ui/recipes/hoverCard.md"}');
const __default__ = { name: "docs/ui/recipes/hoverCard.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="hover-card" tabindex="-1">Hover Card <a class="header-anchor" href="#hover-card" aria-label="Permalink to &quot;Hover Card&quot;">​</a></h1><p>A rich content card that appears on hover — composed from <code>popover</code> and <code>card</code>. No new patch needed.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(HoverCard) }, null, _parent));
      _push(`<h2 id="how-it-works" tabindex="-1">How it works <a class="header-anchor" href="#how-it-works" aria-label="Permalink to &quot;How it works&quot;">​</a></h2><p><code>popover({ openOn: &quot;hover&quot; })</code> already handles hover show/hide and floating positioning. The <code>content</code> prop receives any <code>DomphyElement</code> — here a <code>card</code> with profile info. The trigger is a <code>link</code> element.</p><table tabindex="0"><thead><tr><th>Pattern</th><th>Usage</th></tr></thead><tbody><tr><td><code>popover({ openOn: &quot;hover&quot; })</code></td><td>Hover trigger + floating position</td></tr><tr><td><code>card</code></td><td>Styled content container</td></tr></tbody></table></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/recipes/hoverCard.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
