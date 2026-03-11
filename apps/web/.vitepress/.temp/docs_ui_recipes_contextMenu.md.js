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
const ContextMenu = 'import { type DomphyElement, toState } from "@domphy/core"\r\nimport { menu, menuItem } from "@domphy/ui"\r\n\r\nconst open = toState(false)\r\nconst x = toState(0)\r\nconst y = toState(0)\r\n\r\nconst contextMenu: DomphyElement<"div"> = {\r\n    div: [\r\n        { button: "Cut",   $: [menuItem()], onClick: () => open.set(false) },\r\n        { button: "Copy",  $: [menuItem()], onClick: () => open.set(false) },\r\n        { button: "Paste", $: [menuItem()], onClick: () => open.set(false) },\r\n    ],\r\n    $: [menu()],\r\n    style: {\r\n        position: "fixed",\r\n        left: (listener) => `${x.get(listener)}px`,\r\n        top: (listener) => `${y.get(listener)}px`,\r\n        zIndex: 50,\r\n        minWidth: "10rem",\r\n        display: (listener) => open.get(listener) ? "flex" : "none",\r\n        pointerEvents: (listener) => open.get(listener) ? "auto" : "none",\r\n    },\r\n    _onMount: (node) => {\r\n        const close = (e: MouseEvent) => {\r\n            if (!node.domElement!.contains(e.target as Node)) open.set(false)\r\n        }\r\n        document.addEventListener("click", close)\r\n        node.addHook("Remove", () => document.removeEventListener("click", close))\r\n    },\r\n}\r\n\r\nconst App: DomphyElement<"div"> = {\r\n    div: [\r\n        { p: "Right-click anywhere in this area" },\r\n        contextMenu,\r\n    ],\r\n    style: {\r\n        padding: "2rem",\r\n        userSelect: "none",\r\n        minHeight: "8rem",\r\n        border: "2px dashed currentColor",\r\n        borderRadius: "0.5rem",\r\n        cursor: "context-menu",\r\n    },\r\n    onContextMenu: (e: MouseEvent) => {\r\n        e.preventDefault()\r\n        x.set((e as MouseEvent).clientX)\r\n        y.set((e as MouseEvent).clientY)\r\n        open.set(true)\r\n    },\r\n}\r\n\r\nexport default App\r\n';
const __pageData = JSON.parse('{"title":"Context Menu","description":"","frontmatter":{},"headers":[],"relativePath":"docs/ui/recipes/contextMenu.md","filePath":"docs/ui/recipes/contextMenu.md"}');
const __default__ = { name: "docs/ui/recipes/contextMenu.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="context-menu" tabindex="-1">Context Menu <a class="header-anchor" href="#context-menu" aria-label="Permalink to &quot;Context Menu&quot;">​</a></h1><p>A context menu is not a patch — it is a composition of existing patches and Domphy patterns. No new behavior is introduced; the recipe shows how to combine <code>menu</code>, <code>menuItem</code>, and state to produce a right-click menu positioned at the cursor.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(ContextMenu) }, null, _parent));
      _push(`<h2 id="how-it-works" tabindex="-1">How it works <a class="header-anchor" href="#how-it-works" aria-label="Permalink to &quot;How it works&quot;">​</a></h2><p><strong>State:</strong></p><ul><li><code>open</code> — controls visibility</li><li><code>x</code>, <code>y</code> — cursor position captured from the <code>contextmenu</code> event</li></ul><p><strong>Menu element</strong> is declared in the tree alongside the trigger area. <code>position: fixed</code> with reactive <code>left</code>/<code>top</code> places it at the cursor. <code>display: none</code> when closed keeps it out of pointer events.</p><p><strong>Close on outside click</strong> is registered imperatively in <code>_onMount</code> via <code>document.addEventListener(&quot;click&quot;, ...)</code> and cleaned up with <code>addHook(&quot;Remove&quot;, ...)</code>.</p><p><strong>Trigger</strong> uses <code>onContextMenu</code> to capture cursor position, then sets <code>open</code> to <code>true</code>.</p><h2 id="key-patterns-used" tabindex="-1">Key patterns used <a class="header-anchor" href="#key-patterns-used" aria-label="Permalink to &quot;Key patterns used&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Pattern</th><th>Usage</th></tr></thead><tbody><tr><td>Declare in tree + hide</td><td><code>open</code> state controls <code>display</code> and <code>pointerEvents</code></td></tr><tr><td>Reactive style</td><td><code>left</code>/<code>top</code> update without re-render</td></tr><tr><td><code>_onMount</code> + <code>addHook</code></td><td>Register and clean up document click listener</td></tr><tr><td><code>menu</code> + <code>menuItem</code></td><td>Styled menu list out of the box</td></tr></tbody></table></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/recipes/contextMenu.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
