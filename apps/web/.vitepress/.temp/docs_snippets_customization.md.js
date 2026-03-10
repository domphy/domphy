import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"docs/snippets/customization.md","filePath":"docs/snippets/customization.md"}');
const _sfc_main = { name: "docs/snippets/customization.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p>Must see the source of patch at the bottom of each patch page to understand the structure then code it still code as html native element.</p><p>There are four levels of customization, in increasing order of effort:</p><ol><li><strong>Patch props.</strong> Each patch exposes a small, stable set of props—typically fewer than five. Lowest friction.</li><li><strong>Context attributes.</strong> Use <code>dataTone</code> and <code>dataSize</code> on a container to shift tone or scale for an entire subtree without touching individual elements.</li><li><strong>Inline override.</strong> Native-wins merge strategy: any property set directly on the element overrides the patch value.</li><li><strong>Create a variant.</strong> Clone a similar patch and edit it. Use this only when you need a reusable custom version.</li></ol></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/snippets/customization.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const customization = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  customization as default
};
