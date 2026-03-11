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
const Menubar = 'import { type DomphyElement } from "@domphy/core"\r\nimport { button, menu, menuItem, popover } from "@domphy/ui"\r\n\r\nconst fileMenu: DomphyElement<"div"> = {\r\n    div: [\r\n        { button: "New File",   $: [menuItem()] },\r\n        { button: "Open...",    $: [menuItem()] },\r\n        { button: "Save",       $: [menuItem()] },\r\n        { button: "Save As...", $: [menuItem()] },\r\n    ],\r\n    $: [menu()],\r\n}\r\n\r\nconst editMenu: DomphyElement<"div"> = {\r\n    div: [\r\n        { button: "Undo",  $: [menuItem()] },\r\n        { button: "Redo",  $: [menuItem()] },\r\n        { button: "Cut",   $: [menuItem()] },\r\n        { button: "Copy",  $: [menuItem()] },\r\n        { button: "Paste", $: [menuItem()] },\r\n    ],\r\n    $: [menu()],\r\n}\r\n\r\nconst viewMenu: DomphyElement<"div"> = {\r\n    div: [\r\n        { button: "Zoom In",  $: [menuItem()] },\r\n        { button: "Zoom Out", $: [menuItem()] },\r\n        { button: "Reset",    $: [menuItem()] },\r\n    ],\r\n    $: [menu()],\r\n}\r\n\r\nconst App: DomphyElement<"nav"> = {\r\n    nav: [\r\n        { button: "File", $: [button(), popover({ openOn: "hover", content: fileMenu })] },\r\n        { button: "Edit", $: [button(), popover({ openOn: "hover", content: editMenu })] },\r\n        { button: "View", $: [button(), popover({ openOn: "hover", content: viewMenu })] },\r\n    ],\r\n    style: { display: "flex", gap: "0" },\r\n}\r\n\r\nexport default App\r\n';
const __pageData = JSON.parse('{"title":"Menubar","description":"","frontmatter":{},"headers":[],"relativePath":"docs/ui/recipes/menuBar.md","filePath":"docs/ui/recipes/menuBar.md"}');
const __default__ = { name: "docs/ui/recipes/menuBar.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="menubar" tabindex="-1">Menubar <a class="header-anchor" href="#menubar" aria-label="Permalink to &quot;Menubar&quot;">​</a></h1><p>A horizontal menu bar with hover-triggered dropdowns — composed from <code>button</code>, <code>popover</code>, <code>menu</code>, and <code>menuItem</code>. No new patch needed.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(Menubar) }, null, _parent));
      _push(`<h2 id="how-it-works" tabindex="-1">How it works <a class="header-anchor" href="#how-it-works" aria-label="Permalink to &quot;How it works&quot;">​</a></h2><p>Each top-level item is a <code>button</code> with a <code>popover({ openOn: &quot;hover&quot; })</code> patch. The popover <code>content</code> is a <code>menu</code> with <code>menuItem</code> children. The nav container uses <code>display: flex</code> to lay items out horizontally.</p><table tabindex="0"><thead><tr><th>Pattern</th><th>Usage</th></tr></thead><tbody><tr><td><code>popover({ openOn: &quot;hover&quot; })</code></td><td>Opens dropdown on hover</td></tr><tr><td><code>menu</code> + <code>menuItem</code></td><td>Styled dropdown list</td></tr><tr><td><code>display: flex</code> on container</td><td>Horizontal layout</td></tr></tbody></table></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/recipes/menuBar.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
