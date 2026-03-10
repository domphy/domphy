import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _sfc_main$1 } from "./index.C-nzggKj.js";
import { useSSRContext } from "vue";
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
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"sidebar":false,"aside":false,"layout":"page"},"headers":[],"relativePath":"docs/playground.md","filePath":"docs/playground.md"}');
const __default__ = { name: "docs/playground.md" };
const _sfc_main = /* @__PURE__ */ Object.assign(__default__, {
  __ssrInlineRender: true,
  setup(__props) {
    const code = `
import { type DomphyElement,type PartialElement  } from '@domphy/core'
import { themeSpacing, themeColor, themeSize} from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: ["Playground"],
    style:{
    
    }
}
export default App
`;
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}>`);
      _push(ssrRenderComponent(_sfc_main$1, {
        code,
        storageKey: "domphy-playground"
      }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/playground.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  __pageData,
  _sfc_main as default
};
