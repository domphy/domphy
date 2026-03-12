import { defineComponent, ref, onMounted, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs } from "vue/server-renderer";
import { T as Toolbar, t as toState, a as themeApply, E as ElementNode, R as Render } from "./Render.ZCL35t0f.js";
function Container(element) {
  const isDark = toState(false);
  const hasGrid = toState(false);
  const isFull = toState(false);
  const preview = {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement;
      const shadow = dom.attachShadow({ mode: "open" });
      const themeTag = document.createElement("style");
      const container = document.createElement("div");
      container.style.flex = "1";
      shadow.append(themeTag, container);
      themeApply(themeTag);
      new ElementNode(Render(element, isDark, hasGrid)).render(container);
    },
    style: {
      flex: "1",
      display: "flex",
      flexDirection: "column"
    }
  };
  return {
    div: [
      Toolbar({ isDark, isFull, hasGrid }),
      preview
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      border: "1px solid var(--vp-c-divider)",
      overflow: "hidden",
      position: (listener) => isFull.get(listener) ? "fixed" : "relative",
      inset: 0,
      height: (listener) => isFull.get(listener) ? "100vh" : "280px",
      zIndex: 10,
      backgroundColor: "var(--vp-c-bg)"
    }
  };
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  props: {
    element: {}
  },
  setup(__props) {
    const props = __props;
    const mountEl = ref();
    onMounted(() => {
      themeApply();
      new ElementNode(Container(props.element)).render(mountEl.value);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "mountEl",
        ref: mountEl
      }, _attrs))}></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/preview/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const count = toState(0);
const text = {
  // Reactive values can be reactive functions.
  // Reading state with `count.get(listener)` also add listener to state. 
  // State change => call listener => re render property
  p: (listener) => `Count: ${count.get(listener)}`
};
const button = {
  button: "Increment",
  onClick: () => count.set(count.get() + 1),
  // Standard Nested CSS nesting
  style: {
    padding: "4px 16px",
    backgroundColor: "#0f62fe",
    borderRadius: "6px",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#4589ff"
    }
  }
};
const App = {
  div: [text, button]
};
export {
  App as A,
  _sfc_main as _
};
