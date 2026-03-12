import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"apps/web","description":"","frontmatter":{},"headers":[],"relativePath":"README.md","filePath":"README.md"}');
const _sfc_main = { name: "README.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="apps-web" tabindex="-1">apps/web <a class="header-anchor" href="#apps-web" aria-label="Permalink to &quot;apps/web&quot;">​</a></h1><p>This app is the Domphy documentation website, built with VitePress.</p><p>It contains two main parts:</p><ul><li>docs pages in <code>apps/web/docs</code></li><li>live demos and preview/editor helpers used by those docs</li></ul><p>The docs are not static text only. Many pages render real <code>@domphy/core</code>, <code>@domphy/theme</code>, and <code>@domphy/ui</code> examples directly inside the site, so documentation and manual testing happen in the same place.</p><p>In practice:</p><ul><li>guide pages explain the model and API</li><li>demo files under <code>apps/web/docs/demos</code> provide runnable examples</li><li>preview and editor components load those examples into interactive docs pages</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("README.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const README = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  README as default
};
