import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"docs/snippets/formulas.md","filePath":"docs/snippets/formulas.md"}');
const _sfc_main = { name: "docs/snippets/formulas.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p><strong>Unit</strong> — <code>U = fontSize / 4</code> — use <code>themeSpacing(n)</code>.</p><p><strong>Size</strong> — <code>n</code> = lines or children, <code>w</code> = wrapping level (0–3):</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>height        = (n×6 + 2w) × U</span></span>
<span class="line"><span>paddingBlock  = w × U</span></span>
<span class="line"><span>paddingInline = ⌈3/w⌉ × w × U</span></span>
<span class="line"><span>radius        = (w+1) × U</span></span></code></pre></div><table tabindex="0"><thead><tr><th>U</th><th>w=0</th><th>w=1</th><th>w=2</th><th>w=3</th></tr></thead><tbody><tr><td>height (n=1)</td><td>6</td><td>8</td><td>10</td><td>12</td></tr><tr><td>paddingBlock</td><td>0</td><td>1</td><td>2</td><td>3</td></tr><tr><td>paddingInline</td><td>2</td><td>3</td><td>4</td><td>3</td></tr><tr><td>radius</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table><p><strong>Tone</strong> — <code>K = N / 2</code> (N = palette steps, must be even). For N=12: <code>K=6</code>, <code>K/2=3</code>, <code>K/3=2</code>.</p><table tabindex="0"><thead><tr><th>Role</th><th>Shift</th><th>n=0</th></tr></thead><tbody><tr><td>Background</td><td>parent ± n</td><td>0</td></tr><tr><td>Text</td><td>bg + K</td><td>6</td></tr><tr><td>Border</td><td>bg + K/2</td><td>3</td></tr><tr><td>Hover</td><td>bg + 2K/3</td><td>4</td></tr><tr><td>Selected / Focus</td><td>above ± K/3</td><td>2–4</td></tr></tbody></table><p>State shift range: <code>K/3 ≤ Δ ≤ 2K/3</code> (2–4 steps for K=6).</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/snippets/formulas.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const formulas = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  formulas as default
};
