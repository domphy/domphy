import { defineComponent, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
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
const Icon = `import { DomphyElement } from '@domphy/core'\r
import { icon } from "@domphy/ui"\r
\r
const App: DomphyElement<"span"> = {\r
    span: "💡",\r
    $: [icon()],\r
}\r
\r
export default App\r
`;
const __pageData = JSON.parse('{"title":"Icon","description":"","frontmatter":{"aside":false},"headers":[],"relativePath":"docs/ui/patches/icon.md","filePath":"docs/ui/patches/icon.md"}');
const __default__ = { name: "docs/ui/patches/icon.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="icon" tabindex="-1">Icon <a class="header-anchor" href="#icon" aria-label="Permalink to &quot;Icon&quot;">​</a></h1><p>Use the icon patch to customize this component.</p>`);
      _push(ssrRenderComponent(_sfc_main$1, { code: unref(Icon) }, null, _parent));
      _push(`<details class="details custom-block"><summary>Customization</summary><p>Must see the source of patch at the bottom of each patch page to understand the structure then code it still code as html native element.</p><p>There are four levels of customization, in increasing order of effort:</p><ol><li><strong>Patch props.</strong> Each patch exposes a small, stable set of props—typically fewer than five. Lowest friction.</li><li><strong>Context attributes.</strong> Use <code>dataTone</code> and <code>dataSize</code> on a container to shift tone or scale for an entire subtree without touching individual elements.</li><li><strong>Inline override.</strong> Native-wins merge strategy: any property set directly on the element overrides the patch value.</li><li><strong>Create a variant.</strong> Clone a similar patch and edit it. Use this only when you need a reusable custom version.</li></ol></details><h2 id="appearance" tabindex="-1">Appearance <a class="header-anchor" href="#appearance" aria-label="Permalink to &quot;Appearance&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Name</th><th>tone</th><th>size</th><th>NLines</th><th>Wrapping Level</th><th>Height</th><th>Padding Block</th><th>Padding Inline</th><th>Radius</th></tr></thead><tbody><tr><td>icon</td><td>inherit</td><td>inherit</td><td>1</td><td>0</td><td>6</td><td>0</td><td>0</td><td>0</td></tr></tbody></table><details class="details custom-block"><summary>Formulas</summary><p><strong>Unit</strong> — <code>U = fontSize / 4</code> — use <code>themeSpacing(n)</code>.</p><p><strong>Size</strong> — <code>n</code> = lines or children, <code>w</code> = wrapping level (0–3):</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>height        = (n×6 + 2w) × U</span></span>
<span class="line"><span>paddingBlock  = w × U</span></span>
<span class="line"><span>paddingInline = ⌈3/w⌉ × w × U</span></span>
<span class="line"><span>radius        = (w+1) × U</span></span></code></pre></div><table tabindex="0"><thead><tr><th>U</th><th>w=0</th><th>w=1</th><th>w=2</th><th>w=3</th></tr></thead><tbody><tr><td>height (n=1)</td><td>6</td><td>8</td><td>10</td><td>12</td></tr><tr><td>paddingBlock</td><td>0</td><td>1</td><td>2</td><td>3</td></tr><tr><td>paddingInline</td><td>2</td><td>3</td><td>4</td><td>3</td></tr><tr><td>radius</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table><p><strong>Tone</strong> — <code>K = N / 2</code> (N = palette steps, must be even). For N=12: <code>K=6</code>, <code>K/2=3</code>, <code>K/3=2</code>.</p><table tabindex="0"><thead><tr><th>Role</th><th>Shift</th><th>n=0</th></tr></thead><tbody><tr><td>Background</td><td>parent ± n</td><td>0</td></tr><tr><td>Text</td><td>bg + K</td><td>6</td></tr><tr><td>Border</td><td>bg + K/2</td><td>3</td></tr><tr><td>Hover</td><td>bg + 2K/3</td><td>4</td></tr><tr><td>Selected / Focus</td><td>above ± K/3</td><td>2–4</td></tr></tbody></table><p>State shift range: <code>K/3 ≤ Δ ≤ 2K/3</code> (2–4 steps for K=6).</p></details><div class="vp-code-group vp-adaptive-theme"><div class="tabs"><input type="radio" name="group-vyDEE" id="tab-lJg30xd" checked><label data-title="icon" for="tab-lJg30xd">icon</label></div><div class="blocks"><div class="language-ts vp-adaptive-theme active"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">import</span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}"> type</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> { PartialElement } </span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">from</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &quot;@domphy/core&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">import</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> { themeSpacing } </span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">from</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &quot;@domphy/theme&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">;</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">function</span><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}"> icon</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">()</span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">:</span><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}"> PartialElement</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">    return</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">        _onInsert</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">: (</span><span style="${ssrRenderStyle({ "--shiki-light": "#E36209", "--shiki-dark": "#FFAB70" })}">node</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">) </span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">=&gt;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">            if</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> (node.tagName </span><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">!=</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &quot;span&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">                console.</span><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">warn</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">(</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">\`&quot;icon&quot; primitive patch should use span tag\`</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">            }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">        },</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">        style: {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">            display: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;inline-flex&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">,</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">            alignItems: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;center&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">,</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">            verticalAlign: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;middle&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">,</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">            width: </span><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">themeSpacing</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">(</span><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">6</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">),</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">            height: </span><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">themeSpacing</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">(</span><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">6</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">),</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">        },</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">    };</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">}</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#D73A49", "--shiki-dark": "#F97583" })}">export</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}"> { icon };</span></span></code></pre></div></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/ui/patches/icon.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
