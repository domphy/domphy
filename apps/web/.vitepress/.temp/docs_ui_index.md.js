import { defineComponent, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
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
const Overview = 'import { type DomphyElement } from "@domphy/core"\nimport { button, tooltip } from "@domphy/ui"\n\nconst App: DomphyElement<"div"> = {\n  div: [\n    {\n      button: "Submit",\n      $: [\n        button({ color: "primary" }),\n        tooltip({ content: "Submit the form" }),\n      ],\n    },\n  ],\n  dataTheme: "light",\n}\n\nexport default App\n';
const __pageData = JSON.parse('{"title":"UI","description":"","frontmatter":{},"headers":[],"relativePath":"docs/ui/index.md","filePath":"docs/ui/index.md"}');
const __default__ = { name: "docs/ui/index.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="ui" tabindex="-1">UI <a class="header-anchor" href="#ui" aria-label="Permalink to &quot;UI&quot;">​</a></h1><p><code>@domphy/ui</code> is the official patch library for Domphy.</p><p>It provides ready-made patches for common native elements such as buttons, dialogs, menus, tabs, inputs, and typography primitives.</p><p>A patch does not create a new element. It merges styles, attributes, hooks, and behavior into an existing element.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(Overview) }, null, _parent));
      _push(`<div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">import</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> { button, tooltip } </span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">from</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &quot;@domphy/ui&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">const</span><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}"> submitButton</span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}"> =</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  button: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;Submit&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">,</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  $: [</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">    button</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">({ color: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;primary&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> }),</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">    tooltip</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">({ content: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;Submit the form&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> }),</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  ],</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">}</span></span></code></pre></div><h2 id="what-ui-adds" tabindex="-1">What UI Adds <a class="header-anchor" href="#what-ui-adds" aria-label="Permalink to &quot;What UI Adds&quot;">​</a></h2><p><code>@domphy/ui</code> sits on top of <code>@domphy/core</code> and <code>@domphy/theme</code>.</p><ul><li><code>@domphy/core</code> provides the object model, rendering, and lifecycle</li><li><code>@domphy/theme</code> provides tone, size, and spacing helpers</li><li><code>@domphy/ui</code> packages those pieces into reusable patches</li></ul><p>Most patches are:</p><ul><li>native-element first</li><li>context-aware with <code>dataTone</code> and <code>dataSize</code></li><li>small in prop surface</li><li>customizable without rewriting the whole patch</li></ul><h2 id="read-next" tabindex="-1">Read Next <a class="header-anchor" href="#read-next" aria-label="Permalink to &quot;Read Next&quot;">​</a></h2><ol><li><a href="./dimension.html">Dimension</a> for sizing rules and patch size families</li><li><a href="./customization.html">Customization</a> for how to override and adapt existing patches</li><li><a href="./creation.html">Creation</a> for writing new patches correctly</li><li><a href="./patches/button.html">Patches</a> when you want the catalog</li></ol><p>If you already know the system and just want a component, jump straight to the <code>Patches</code> group in the sidebar.</p></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
