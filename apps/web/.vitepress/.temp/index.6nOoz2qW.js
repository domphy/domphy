import { defineComponent, ref, onMounted, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs } from "vue/server-renderer";
import { A as AttributeList, B as BooleanAttributes, C as CamelAttributes, b as ElementList, E as ElementNode, H as HtmlTags, N as Notifier, P as PrefixCSS, S as State, h as hashString, m as merge, t as toState, c as contextColor, d as createDark, g as getTheme, s as setTheme, a as themeApply, e as themeCSS, f as themeColor, i as themeDensity, j as themeName, k as themeSize, l as themeSpacing, n as themeTokens, o as themeVars, p as creatFloating, q as icon, r as popoverArrow, u as spinner, v as tooltip, R as Render, T as Toolbar } from "./Render.ZCL35t0f.js";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import * as queryCore from "@tanstack/query-core";
import i18next from "i18next";
import page from "page";
import Sortable from "sortablejs";
import * as zod from "zod";
import { transform } from "sucrase";
const VoidTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr"
];
const domphyCore = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AttributeList,
  BooleanAttributes,
  CamelAttributes,
  ElementList,
  ElementNode,
  HtmlTags,
  Notifier,
  PrefixCSS,
  State,
  VoidTags,
  hashString,
  merge,
  toState
}, Symbol.toStringTag, { value: "Module" }));
const domphyTheme = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  contextColor,
  createDark,
  getTheme,
  setTheme,
  themeApply,
  themeCSS,
  themeColor,
  themeDensity,
  themeName,
  themeSize,
  themeSpacing,
  themeTokens,
  themeVars
}, Symbol.toStringTag, { value: "Module" }));
function Editor(code2) {
  return {
    div: [],
    _onMount: (node) => {
      new EditorView({
        doc: code2.get(),
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) code2.set(update.state.doc.toString());
          })
        ],
        parent: node.domElement
      });
    },
    style: {
      display: "flex",
      flex: 1,
      minHeight: 0,
      overflow: "auto"
    }
  };
}
function abbreviation(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "abbr") {
        console.warn(`"abbreviation" primitive patch must use abbr tag`);
      }
    },
    style: {
      color: (listener) => themeColor(listener, "shift-7", color),
      textDecorationLine: "underline",
      textDecorationStyle: "dotted",
      textDecorationColor: (listener) => themeColor(listener, "shift-4", color),
      textUnderlineOffset: themeSpacing(0.72),
      cursor: "help",
      "&:hover": {
        color: (listener) => themeColor(listener, "shift-8", accentColor),
        textDecorationColor: (listener) => themeColor(listener, "shift-6", accentColor)
      }
    }
  };
}
function card(props = {}) {
  const { color = "neutral" } = props;
  return {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gridTemplateAreas: '"image image" "title aside" "desc aside" "content content" "footer footer"',
      borderRadius: themeSpacing(2),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      color: (listener) => themeColor(listener, "shift-7", color),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      outlineOffset: "-1px",
      overflow: "hidden",
      "& > img": {
        gridArea: "image",
        width: "100%",
        height: "auto",
        display: "block"
      },
      "& > :is(h1,h2,h3,h4,h5,h6)": {
        gridArea: "title",
        paddingBlock: themeSpacing(2),
        paddingInline: themeSpacing(4),
        fontWeight: "600",
        margin: 0
      },
      "& > p": {
        gridArea: "desc",
        paddingInline: themeSpacing(4),
        color: (listener) => themeColor(listener, "shift-6", color),
        margin: 0
      },
      "& > aside": {
        gridArea: "aside",
        alignSelf: "center",
        padding: themeSpacing(2),
        height: "auto"
      },
      "& > div": {
        gridArea: "content",
        padding: themeSpacing(4),
        color: (listener) => themeColor(listener, "shift-7", color)
      },
      "& > footer": {
        gridArea: "footer",
        display: "flex",
        gap: themeSpacing(2),
        paddingBlock: themeSpacing(2),
        paddingInline: themeSpacing(4),
        borderTop: (listener) => `1px solid ${themeColor(listener, "shift-2", color)}`
      }
    }
  };
}
function splitter(props = {}) {
  const { direction = "horizontal", defaultSize = 50, min = 10, max = 90 } = props;
  return {
    _onSchedule: (node, element) => {
      merge(element, {
        _context: {
          splitter: {
            direction,
            size: toState(defaultSize),
            min,
            max
          }
        }
      });
    },
    style: {
      display: "flex",
      flexDirection: direction === "horizontal" ? "row" : "column",
      overflow: "hidden"
    }
  };
}
function splitterPanel() {
  return {
    _onMount: (node) => {
      const ctx = node.getContext("splitter");
      const el = node.domElement;
      const prop = ctx.direction === "horizontal" ? "width" : "height";
      el.style[prop] = `${ctx.size.get()}%`;
      el.style.flexShrink = "0";
      el.style.overflow = "auto";
      const release = ctx.size.onChange((size) => {
        el.style[prop] = `${size}%`;
      });
      node.addHook("Remove", release);
    }
  };
}
function splitterHandle() {
  return {
    _onMount: (node) => {
      const ctx = node.getContext("splitter");
      const handle = node.domElement;
      const isHorizontal = ctx.direction === "horizontal";
      handle.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      const onMousedown = (e) => {
        e.preventDefault();
        const container = handle.parentElement;
        const onMousemove = (e2) => {
          const rect = container.getBoundingClientRect();
          const raw = isHorizontal ? (e2.clientX - rect.left) / rect.width * 100 : (e2.clientY - rect.top) / rect.height * 100;
          ctx.size.set(Math.min(Math.max(raw, ctx.min), ctx.max));
        };
        const onMouseup = () => {
          document.removeEventListener("mousemove", onMousemove);
          document.removeEventListener("mouseup", onMouseup);
        };
        document.addEventListener("mousemove", onMousemove);
        document.addEventListener("mouseup", onMouseup);
      };
      handle.addEventListener("mousedown", onMousedown);
      node.addHook("Remove", () => handle.removeEventListener("mousedown", onMousedown));
    },
    style: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: (listener) => themeColor(listener, "shift-2"),
      "&:hover": {
        backgroundColor: (listener) => themeColor(listener, "shift-3")
      },
      "&::after": {
        content: '""',
        borderRadius: themeSpacing(999),
        backgroundColor: (listener) => themeColor(listener, "shift-4")
      }
    }
  };
}
function command() {
  return {
    _onSchedule: (node, element) => {
      merge(element, {
        _context: {
          command: {
            query: toState("")
          }
        }
      });
    },
    style: {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  };
}
function commandSearch(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"commandSearch" patch must use input tag`);
      }
    },
    _onMount: (node) => {
      const ctx = node.getContext("command");
      const input = node.domElement;
      const onInput = () => ctx.query.set(input.value);
      input.addEventListener("input", onInput);
      node.addHook("Remove", () => input.removeEventListener("input", onInput));
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingInline: themeSpacing(3),
      paddingBlock: themeSpacing(2),
      border: "none",
      borderBottom: (listener) => `1px solid ${themeColor(listener, "shift-2", color)}`,
      outline: "none",
      color: (listener) => themeColor(listener, "shift-7", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-4")
      },
      "&:focus-visible": {
        borderBottomColor: (listener) => themeColor(listener, "shift-5", accentColor)
      }
    }
  };
}
function commandItem(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    role: "option",
    _onMount: (node) => {
      var _a;
      const ctx = node.getContext("command");
      const el = node.domElement;
      const text = ((_a = el.textContent) == null ? void 0 : _a.toLowerCase()) ?? "";
      const release = ctx.query.onChange((q) => {
        el.hidden = q.length > 0 && !text.includes(q.toLowerCase());
      });
      node.addHook("Remove", release);
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      width: "100%",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(8),
      paddingInline: themeSpacing(3),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled])": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", color)
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`
      }
    }
  };
}
function toggle(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    role: "button",
    _onInsert: (node) => {
      var _a;
      if (node.tagName !== "button") {
        console.warn(`"toggle" patch must use button tag`);
      }
      const ctx = node.getContext("toggleGroup");
      const children = (_a = node.parent) == null ? void 0 : _a.children.items;
      let items = children.filter((n) => n.type === "ElementNode" && n.attributes.get("role") === "button");
      const key = String(items.findIndex((n) => n === node));
      node.attributes.set("ariaPressed", (listener) => {
        const val = ctx.value.get(listener);
        return Array.isArray(val) ? val.includes(key) : val === key;
      });
      node.addEvent("click", () => {
        const val = ctx.value.get();
        if (ctx.multiple) {
          const arr = Array.isArray(val) ? [...val] : [];
          ctx.value.set(arr.includes(key) ? arr.filter((v) => v !== key) : [...arr, key]);
        } else {
          ctx.value.set(val === key ? "" : key);
        }
      });
    },
    style: {
      cursor: "pointer",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(6),
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(2),
      border: "none",
      borderRadius: themeSpacing(1),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      transition: "background-color 300ms ease",
      "&:hover:not([disabled])": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", color)
      },
      "&[aria-pressed=true]": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", color)
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed"
      }
    }
  };
}
function toggleGroup(props = {}) {
  const { multiple = false, color = "neutral" } = props;
  return {
    role: "group",
    dataTone: "shift-1",
    _context: {
      toggleGroup: {
        value: toState(props.value ?? (multiple ? [] : "")),
        multiple
      }
    },
    style: {
      display: "flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-1", color)}`,
      outlineOffset: "-1px"
    }
  };
}
function inputOTP() {
  return {
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(2),
      "& > *": {
        minWidth: themeSpacing(8) + "!important"
      }
    },
    _onMount: (node) => {
      const container = node.domElement;
      const getInputs = () => Array.from(container.querySelectorAll("input"));
      const onInput = (e) => {
        const inputs = getInputs();
        const target = e.target;
        const idx = inputs.indexOf(target);
        if (target.value && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      };
      const onKeydown = (e) => {
        const inputs = getInputs();
        const target = e.target;
        const idx = inputs.indexOf(target);
        if (e.key === "Backspace" && !target.value && idx > 0) {
          inputs[idx - 1].focus();
        }
        if (e.key === "ArrowLeft" && idx > 0) inputs[idx - 1].focus();
        if (e.key === "ArrowRight" && idx < inputs.length - 1) inputs[idx + 1].focus();
      };
      const onPaste = (e) => {
        var _a, _b;
        e.preventDefault();
        const text = ((_a = e.clipboardData) == null ? void 0 : _a.getData("text")) ?? "";
        const inputs = getInputs();
        const startIdx = inputs.indexOf(e.target);
        [...text].forEach((char, i) => {
          if (inputs[startIdx + i]) inputs[startIdx + i].value = char;
        });
        const lastFilled = Math.min(startIdx + text.length - 1, inputs.length - 1);
        (_b = inputs[lastFilled]) == null ? void 0 : _b.focus();
      };
      container.addEventListener("input", onInput);
      container.addEventListener("keydown", onKeydown);
      container.addEventListener("paste", onPaste);
      node.addHook("Remove", () => {
        container.removeEventListener("input", onInput);
        container.removeEventListener("keydown", onKeydown);
        container.removeEventListener("paste", onPaste);
      });
    }
  };
}
function alert(props = {}) {
  const { color = "primary" } = props;
  return {
    role: "alert",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: themeSpacing(3),
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(4),
      boxShadow: (listener) => `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-5", color)}`,
      backgroundColor: (listener) => themeColor(listener, "shift-1", color),
      color: (listener) => themeColor(listener, "shift-7", color),
      fontSize: (listener) => themeSize(listener, "inherit")
    }
  };
}
function avatar(props = {}) {
  const { color = "primary" } = props;
  return {
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: "50%",
      flexShrink: 0,
      width: themeSpacing(8),
      height: themeSpacing(8),
      fontSize: (listener) => themeSize(listener, "inherit"),
      fontWeight: "600",
      userSelect: "none",
      backgroundColor: (listener) => themeColor(listener, "shift-3", color),
      color: (listener) => themeColor(listener, "shift-8", color),
      "& img": {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    }
  };
}
function badge(props = {}) {
  const { color = "danger", label: label2 = 999 } = props;
  let state = toState(label2);
  return {
    style: {
      position: "relative",
      "&::after": {
        content: (l) => `"${state.get(l)}"`,
        position: "absolute",
        top: 0,
        right: 0,
        transform: "translate(50%,-50%)",
        paddingInline: themeSpacing(1),
        minWidth: themeSpacing(6),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: (l) => themeSize(l, "decrease-1"),
        borderRadius: themeSpacing(999),
        backgroundColor: (l) => themeColor(l, "shift-6", color),
        color: (l) => themeColor(l, "shift-0", color)
      }
    }
  };
}
function breadcrumb(props = {}) {
  const { color = "neutral", separator = "/" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName !== "nav") console.warn('"breadcrumb" patch must use nav tag');
    },
    ariaLabel: "breadcrumb",
    style: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      fontSize: (listener) => themeSize(listener, "inherit"),
      gap: themeSpacing(1),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "& > *": {
        display: "inline-flex",
        alignItems: "center",
        color: (listener) => themeColor(listener, "shift-5", color)
      },
      "& > *:not(:last-child)::after": {
        content: `"${separator}"`,
        color: (listener) => themeColor(listener, "shift-3", color),
        paddingInlineStart: themeSpacing(1)
      },
      "& > [aria-current=page]": {
        color: (listener) => themeColor(listener, "shift-7", color),
        pointerEvents: "none"
      }
    }
  };
}
function breadcrumbEllipsis(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn('"breadcrumbEllipsis" patch must use button tag');
      }
    },
    ariaLabel: "More breadcrumb items",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingInline: themeSpacing(1),
      border: "none",
      background: "none",
      cursor: "pointer",
      color: (listener) => themeColor(listener, "shift-5", color),
      borderRadius: themeSpacing(1),
      "&:hover": {
        color: (listener) => themeColor(listener, "shift-7", color),
        backgroundColor: (listener) => themeColor(listener, "shift-1", color)
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", color)}`,
        outlineOffset: themeSpacing(0.5)
      }
    }
  };
}
const xSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.707 5.293l5.293 5.292l5.293 -5.292a1 1 0 0 1 1.414 1.414l-5.292 5.293l5.292 5.293a1 1 0 0 1 -1.414 1.414l-5.293 -5.292l-5.293 5.292a1 1 0 1 1 -1.414 -1.414l5.292 -5.293l-5.292 -5.293a1 1 0 0 1 1.414 -1.414" /></svg>`;
function tag(props = {}) {
  const { color = "neutral", removable = false } = props;
  return {
    dataTone: "shift-1",
    _onInit: (node) => {
      const removeBtn = {
        span: xSvg,
        onClick: (e) => {
          e.stopPropagation();
          node.remove();
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          borderRadius: themeSpacing(1),
          width: themeSpacing(4),
          height: themeSpacing(4),
          flexShrink: 0,
          "&:hover": {
            backgroundColor: (listener) => themeColor(listener, "shift-3", color)
          }
        }
      };
      removable && node.children.insert(removeBtn);
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      userSelect: "none",
      height: themeSpacing(6),
      paddingBlock: "0px",
      borderRadius: themeSpacing(1),
      paddingInlineStart: themeSpacing(2),
      paddingInlineEnd: removable ? themeSpacing(1) : themeSpacing(2),
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      color: (listener) => themeColor(listener, "shift-6", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`
    }
  };
}
function combobox(props) {
  const {
    options = [],
    placement = "bottom",
    color = "neutral",
    open = false,
    multiple = false
  } = props;
  const state = toState(props.value);
  let openState = toState(open);
  let { show, hide, anchorPartial } = creatFloating({ open: openState, placement, content: props.content, onPlacement: props.onPlacement });
  const popoverPartial = {
    onClick: () => !multiple && hide()
  };
  merge(props.content, popoverPartial);
  const inputStyle = {
    border: "none",
    outline: "none",
    padding: 0,
    margin: 0,
    flex: 1,
    height: themeSpacing(6),
    marginInlineStart: themeSpacing(2),
    fontSize: (listener) => themeSize(listener, "inherit"),
    color: (listener) => themeColor(listener, "shift-6", color),
    backgroundColor: (listener) => themeColor(listener, "inherit", color)
  };
  let inputElement;
  if (props.input) {
    merge(props.input, { onFocus: () => show(), style: inputStyle, _key: "combobox-input" });
    inputElement = props.input;
  } else {
    inputElement = {
      input: null,
      onFocus: () => show(),
      value: (listener) => {
        state.get(listener);
        return "";
      },
      style: inputStyle,
      _key: "combobox-input"
    };
  }
  const wrap = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      const opts = options.filter((opt) => vals.includes(opt.value));
      const items = opts.map((opt) => {
        return {
          span: opt.label,
          $: [tag({ color, removable: true })],
          _key: opt.value,
          _onRemove: (_node) => {
            const cur = state.get();
            const curVals = Array.isArray(cur) ? cur : [cur];
            const filter = curVals.filter((v) => v !== opt.value);
            multiple ? state.set(filter) : state.set(filter[0]);
          }
        };
      });
      items.push(inputElement);
      return items;
    },
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(1)
    }
  };
  let partial = {
    _onInsert: (node) => {
      if (node.tagName != "div") {
        console.warn(`"combobox" primitive patch must use div tag`);
      }
    },
    _onInit: (node) => node.children.insert(wrap),
    style: {
      minWidth: themeSpacing(32),
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color)
    }
  };
  merge(anchorPartial, partial);
  return anchorPartial;
}
function blockquote(props = {}) {
  const { color = "inherit" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "blockquote") {
        console.warn(`"blockquote" primitive patch must use blockquote tag`);
      }
    },
    dataTone: "shift-1",
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      boxShadow: (listener) => `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-3", color)}`,
      border: "none",
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(4),
      margin: 0
    }
  };
}
function button(props = {}) {
  const { color = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "button") {
        console.warn(`"button" primitive patch must use button tag`);
      }
    },
    style: {
      appearance: "none",
      fontSize: (listener) => themeSize(listener, "inherit"),
      // Single-line bounded control: block/radius = 1D, inline = 3D.
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
      width: "fit-content",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      userSelect: "none",
      fontFamily: "inherit",
      lineHeight: "inherit",
      border: "none",
      outlineOffset: "-1px",
      outlineWidth: "1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled]):not([aria-busy=true])": {
        color: (listener) => themeColor(listener, "shift-7", color),
        backgroundColor: (listener) => themeColor(listener, "shift-1", color)
      },
      "&:focus-visible": {
        boxShadow: (listener) => `inset 0 0 0 ${themeSpacing(0.5)} ${themeColor(listener, "shift-6", color)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
        color: (listener) => themeColor(listener, "shift-5", "neutral")
      },
      "&[aria-busy=true]": {
        opacity: 0.7,
        cursor: "wait",
        pointerEvents: "none"
      }
    }
  };
}
function inputCheckbox(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    type: "checkbox",
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputCheckbox" primitive patch must use input tag`);
      }
    },
    style: {
      appearance: "none",
      fontSize: (listener) => themeSize(listener, "inherit"),
      display: "inline-flex",
      position: "relative",
      width: themeSpacing(6),
      height: themeSpacing(6),
      justifyContent: "center",
      alignItems: "center",
      transition: "background-color 300ms, outline-color 300ms",
      margin: 0,
      padding: 0,
      "&::before": {
        content: `""`,
        display: "block",
        borderRadius: themeSpacing(1),
        lineHeight: 1,
        cursor: "pointer",
        border: "none",
        outlineOffset: "-1px",
        outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
        color: (listener) => themeColor(listener, "shift-6", color),
        width: themeSpacing(4),
        height: themeSpacing(4)
      },
      "&:hover::before": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", color)
      },
      "&:checked::before": {
        outline: (listener) => `1px solid ${themeColor(listener, "shift-5", accentColor)}`,
        backgroundColor: (listener) => themeColor(listener, "shift-5", accentColor)
      },
      "&:checked:hover:not([disabled])::before": {
        backgroundColor: (listener) => themeColor(listener, "shift-4", accentColor)
      },
      "&:checked::after": {
        content: `""`,
        display: "block",
        position: "absolute",
        top: "25%",
        insetInlineStart: "37%",
        width: "20%",
        height: "30%",
        border: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "inherit", accentColor)}`,
        borderTop: 0,
        borderInlineStart: 0,
        transform: "rotate(45deg)"
      },
      "&:indeterminate::before": {
        outline: (listener) => `1px solid ${themeColor(listener, "shift-4", accentColor)}`,
        backgroundColor: (listener) => themeColor(listener, "inherit", accentColor)
      },
      "&:indeterminate::after": {
        content: `""`,
        position: "absolute",
        inset: "30%",
        backgroundColor: (listener) => themeColor(listener, "shift-5", accentColor)
      },
      "&:indeterminate:hover:not([disabled])::after": {
        backgroundColor: (listener) => themeColor(listener, "shift-4", accentColor)
      },
      "&:focus-visible": {
        borderRadius: themeSpacing(1.5),
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        cursor: "not-allowed"
      },
      "&[disabled]::before, &[disabled]::after": {
        outline: "none",
        backgroundColor: (listener) => themeColor(listener, "shift-3", "neutral"),
        pointerEvents: "none"
      }
    }
  };
}
function code(props = {}) {
  const { color = "neutral" } = props;
  return {
    dataTone: "shift-2",
    _onInsert: (node) => {
      if (node.tagName != "code") {
        console.warn(`"code" primitive patch must use code tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      height: themeSpacing(6),
      paddingInline: themeSpacing(1.5),
      borderRadius: themeSpacing(1)
    }
  };
}
function details(props = {}) {
  const { color = "neutral", accentColor = "primary", duration = 240 } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "details") {
        console.warn(`"details" primitive patch must use details tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      overflow: "hidden",
      "& > summary": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", color),
        color: (listener) => themeColor(listener, "shift-7", color),
        fontSize: (listener) => themeSize(listener, "inherit"),
        listStyle: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: themeSpacing(2),
        cursor: "pointer",
        userSelect: "none",
        fontWeight: 500,
        paddingInline: themeSpacing(4),
        height: themeSpacing(10)
      },
      "& > summary::-webkit-details-marker": {
        display: "none"
      },
      "& > summary::marker": {
        content: `""`
      },
      "& > summary::after": {
        content: `""`,
        width: themeSpacing(2),
        height: themeSpacing(2),
        flexShrink: 0,
        marginTop: `-${themeSpacing(0.5)}`,
        borderInlineEnd: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", color)}`,
        borderBottom: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", color)}`,
        transform: "rotate(45deg)",
        transition: `transform ${duration}ms ease`
      },
      "&[open] > summary::after": {
        transform: "rotate(-135deg)"
      },
      "& > summary:hover": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", color)
      },
      "& > summary:focus-visible": {
        borderRadius: themeSpacing(2),
        outlineOffset: `-${themeSpacing(0.5)}`,
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "& > :not(summary)": {
        maxHeight: "0px",
        opacity: 0,
        overflow: "hidden",
        paddingInline: themeSpacing(3),
        paddingTop: 0,
        paddingBottom: 0,
        transition: `max-height ${duration}ms ease, opacity ${duration}ms ease, padding ${duration}ms ease`
      },
      "&[open] > :not(summary)": {
        maxHeight: themeSpacing(250),
        opacity: 1,
        paddingTop: themeSpacing(1),
        paddingBottom: themeSpacing(3)
      }
    }
  };
}
function descriptionList(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "dl") {
        console.warn(`"descriptionList" primitive patch must use dl tag`);
      }
    },
    style: {
      display: "grid",
      gridTemplateColumns: `minmax(${themeSpacing(24)}, max-content) 1fr`,
      columnGap: themeSpacing(4),
      margin: 0,
      "& dt": {
        margin: 0,
        fontWeight: 600,
        fontSize: (listener) => themeSize(listener, "inherit"),
        color: (listener) => themeColor(listener, "shift-7", color)
      },
      "& dd": {
        margin: 0,
        fontSize: (listener) => themeSize(listener, "inherit"),
        color: (listener) => themeColor(listener, "shift-6", color)
      }
    }
  };
}
function dialog(props = {}) {
  const { color = "neutral", open = false } = props;
  const state = toState(open);
  return {
    _onInsert: (node) => {
      if (node.tagName != "dialog") {
        console.warn(`"dialog" primitive patch must use dialog tag`);
      }
    },
    onClick: (e, node) => {
      if (e.target !== node.domElement) return;
      const r = node.domElement.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) state.set(false);
    },
    onTransitionEnd: (_e, node) => {
      const dlg = node.domElement;
      if (dlg.style.opacity === "0") {
        dlg.close();
        document.body.style.overflow = "";
      }
    },
    _onMount: (node) => {
      const dlg = node.domElement;
      const update = (val) => {
        if (val) {
          dlg.showModal();
          document.body.style.overflow = "hidden";
          requestAnimationFrame(() => {
            dlg.style.opacity = "1";
            const focusable = dlg.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            focusable == null ? void 0 : focusable.focus();
          });
        } else {
          dlg.style.opacity = "0";
        }
      };
      update(state.get());
      state.onChange(update);
    },
    style: {
      opacity: "0",
      transition: "opacity 200ms ease",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-7", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      padding: themeSpacing(3),
      boxShadow: (listener) => `0 ${themeSpacing(8)} ${themeSpacing(16)} ${themeColor(listener, "shift-3", "neutral")}`,
      "&::backdrop": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        opacity: 0.75
      }
    }
  };
}
function emphasis(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "em") {
        console.warn(`"emphasis" primitive patch must use em tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      fontStyle: "italic",
      color: (listener) => themeColor(listener, "shift-7", color)
    }
  };
}
function figure(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "figure") {
        console.warn(`"figure" primitive patch must use figure tag`);
      }
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      marginInline: 0,
      marginTop: themeSpacing(3),
      marginBottom: themeSpacing(3),
      color: (listener) => themeColor(listener, "shift-6", color),
      "& img, & svg, & video, & canvas": {
        display: "block",
        maxWidth: "100%",
        borderRadius: themeSpacing(2)
      },
      "& figcaption": {
        fontSize: (listener) => themeSize(listener, "decrease-1"),
        color: (listener) => themeColor(listener, "shift-5", color),
        lineHeight: 1.45
      }
    }
  };
}
function formGroup(props = {}) {
  const { color = "neutral", layout = "horizontal" } = props;
  const isVertical2 = layout === "vertical";
  return {
    _onInsert: (node) => {
      if (node.tagName != "fieldset") {
        console.warn(`"formGroup" patch must use fieldset tag`);
      }
    },
    style: {
      margin: 0,
      paddingInline: themeSpacing(3),
      paddingBlock: themeSpacing(3),
      border: "none",
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      display: "grid",
      gridTemplateColumns: isVertical2 ? `minmax(0, 1fr)` : `max-content minmax(0, 1fr)`,
      columnGap: themeSpacing(4),
      rowGap: themeSpacing(3),
      alignItems: "start",
      "& > legend": {
        gridColumn: "1 / -1",
        margin: 0,
        fontSize: (listener) => themeSize(listener, "inherit"),
        fontWeight: 600,
        paddingBlock: themeSpacing(1),
        borderRadius: themeSpacing(2),
        color: (listener) => themeColor(listener, "shift-6", color),
        backgroundColor: (listener) => themeColor(listener, "inherit", color)
      },
      "& > label": {
        gridColumn: "1",
        alignSelf: "start",
        margin: 0,
        paddingBlock: isVertical2 ? 0 : themeSpacing(1)
      },
      "& > label:has(+ :not(legend, label, p) + p)": {
        gridRow: isVertical2 ? "auto" : "span 2"
      },
      "& > :not(legend, label, p)": {
        gridColumn: isVertical2 ? "1" : "2",
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box"
      },
      "& > p": {
        gridColumn: isVertical2 ? "1" : "2",
        minWidth: 0,
        margin: 0,
        marginBlockStart: `calc(${themeSpacing(2)} * -1)`,
        fontSize: (listener) => themeSize(listener, "decrease-1"),
        color: (listener) => themeColor(listener, "shift-6", color)
      }
    }
  };
}
const Headinghift = {
  h6: "decrease-1",
  h5: "inherit",
  h4: "increase-1",
  h3: "increase-2",
  h2: "increase-3",
  h1: "increase-4"
};
function heading(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (!["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName)) {
        console.warn(`"heading" primitive patch must use heading tags [h1...h6]`);
      }
    },
    style: {
      color: (listener) => themeColor(listener, "shift-8", color),
      marginTop: 0,
      marginBottom: themeSpacing(2),
      fontSize: (listener) => {
        const offset = Headinghift[listener.elementNode.tagName] || "inherit";
        return themeSize(listener, offset);
      }
    }
  };
}
function horizontalRule(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "hr") {
        console.warn(`"horizontalRule" primitive patch must use hr tag`);
      }
    },
    style: {
      border: 0,
      height: "1px",
      marginInline: 0,
      marginTop: themeSpacing(3),
      marginBottom: themeSpacing(3),
      backgroundColor: (listener) => themeColor(listener, "shift-3", color)
    }
  };
}
function image(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "img") {
        console.warn(`"image" primitive patch must use img tag`);
      }
    },
    style: {
      display: "block",
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      objectFit: "cover",
      borderRadius: themeSpacing(2),
      backgroundColor: (listener) => themeColor(listener, "shift-1", color)
    }
  };
}
function inputColor(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    type: "color",
    _onSchedule: (node, element) => {
      if (node.tagName != "input") {
        console.warn(`"inputColor" primitive patch must use input tag`);
      }
      element.type = "color";
    },
    style: {
      appearance: "none",
      border: "none",
      cursor: "pointer",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      blockSize: themeSpacing(8),
      inlineSize: themeSpacing(8),
      backgroundColor: "transparent",
      "&::-webkit-color-swatch-wrapper": {
        margin: 0,
        padding: 0
      },
      "&::-webkit-color-swatch": {
        borderRadius: themeSpacing(1)
      },
      "&::-moz-color-swatch": {
        borderRadius: themeSpacing(1)
      },
      "&:hover:not([disabled]), &:focus-visible": {},
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`
      }
    }
  };
}
function inputDateTime(props = {}) {
  const { mode = "datetime-local", color = "neutral", accentColor = "primary" } = props;
  return {
    type: mode,
    _onSchedule: (node, element) => {
      if (node.tagName != "input") {
        console.warn(`"inputDateTime" primitive patch must use input tag`);
      }
      element.type = mode;
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      borderRadius: themeSpacing(2),
      paddingInline: themeSpacing(3),
      height: themeSpacing(8),
      "&::-webkit-calendar-picker-indicator": {
        cursor: "pointer",
        opacity: 0.85
      },
      "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral"),
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`
      },
      "&:invalid": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`
      }
    }
  };
}
function inputFile(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    type: "file",
    _onSchedule: (node, element) => {
      if (node.tagName != "input") {
        console.warn(`"inputFile" primitive patch must use input tag`);
      }
      element.type = "file";
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      borderRadius: themeSpacing(2),
      height: themeSpacing(8),
      paddingInline: themeSpacing(1),
      "&::file-selector-button": {
        marginBlock: "auto",
        fontFamily: "inherit",
        fontSize: "inherit",
        border: "none",
        borderRadius: themeSpacing(1),
        height: themeSpacing(6),
        paddingInline: themeSpacing(2),
        cursor: "pointer",
        color: (listener) => themeColor(listener, "shift-7", accentColor),
        backgroundColor: (listener) => themeColor(listener, "shift-2", accentColor)
      },
      "&::-webkit-file-upload-button": {
        marginTop: themeSpacing(1),
        fontFamily: "inherit",
        fontSize: "inherit",
        border: "none",
        borderRadius: themeSpacing(1),
        height: themeSpacing(6),
        paddingInline: themeSpacing(2),
        cursor: "pointer",
        color: (listener) => themeColor(listener, "shift-7", color),
        backgroundColor: (listener) => themeColor(listener, "shift-2", color)
      },
      "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral")
      },
      "&[disabled]::file-selector-button, &[disabled]::-webkit-file-upload-button": {
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral"),
        backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral")
      }
    }
  };
}
function inputSearch(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    type: "search",
    _onSchedule: (node, element) => {
      if (node.tagName != "input") {
        console.warn(`"inputSearch" primitive patch must use input tag`);
      }
      element.type = "search";
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      borderRadius: themeSpacing(2),
      minWidth: themeSpacing(32),
      paddingInline: themeSpacing(3),
      paddingBlock: themeSpacing(1),
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-4", color)
      },
      "&::-webkit-search-decoration": {
        display: "none"
      },
      "&::-webkit-search-cancel-button": {
        cursor: "pointer"
      },
      "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral"),
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`
      }
    }
  };
}
function inputText(props = {}) {
  let {
    color = "neutral",
    accentColor = "primary"
  } = props;
  return {
    type: "text",
    _onSchedule: (node, element) => {
      if (node.tagName != "input") {
        console.warn(`"inputText" primitive patch must use input tag and text type`);
      }
      element.type = "text";
    },
    style: {
      fontFamily: "inherit",
      lineHeight: "inherit",
      minWidth: themeSpacing(32),
      paddingInline: themeSpacing(3),
      paddingBlock: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-4")
      },
      "&:not(:placeholder-shown)": {
        color: (listener) => themeColor(listener, "shift-7")
      },
      "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
        color: (listener) => themeColor(listener, "shift-5", "neutral")
      },
      "&:invalid:not(:placeholder-shown)": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`
      },
      "&[data-status=error]": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`
      },
      "&[data-status=warning]": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "warning")}`
      }
    }
  };
}
function inputRange(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    type: "range",
    _onInsert: (node) => {
      if (node.tagName != "input") {
        console.warn(`"inputRange" primitive patch must use input tag`);
      }
    },
    style: {
      appearance: "none",
      width: "100%",
      margin: 0,
      padding: 0,
      height: themeSpacing(4),
      background: "transparent",
      cursor: "pointer",
      "&::-webkit-slider-runnable-track": {
        height: themeSpacing(1.5),
        borderRadius: themeSpacing(999),
        backgroundColor: (listener) => themeColor(listener, "shift-2", color)
      },
      "&::-moz-range-track": {
        height: themeSpacing(1.5),
        borderRadius: themeSpacing(999),
        backgroundColor: (listener) => themeColor(listener, "shift-2", color)
      },
      "&::-webkit-slider-thumb": {
        appearance: "none",
        width: themeSpacing(4),
        height: themeSpacing(4),
        borderRadius: themeSpacing(999),
        border: "none",
        marginTop: `calc((${themeSpacing(1.5)} - ${themeSpacing(4)}) / 2)`,
        backgroundColor: (listener) => themeColor(listener, "shift-6", accentColor)
      },
      "&::-moz-range-thumb": {
        width: themeSpacing(4),
        height: themeSpacing(4),
        borderRadius: themeSpacing(999),
        border: "none",
        backgroundColor: (listener) => themeColor(listener, "shift-6", accentColor)
      },
      "&:hover:not([disabled])::-webkit-slider-thumb": {
        backgroundColor: (listener) => themeColor(listener, "shift-7", accentColor)
      },
      "&:hover:not([disabled])::-moz-range-thumb": {
        backgroundColor: (listener) => themeColor(listener, "shift-7", accentColor)
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", accentColor)}`,
        outlineOffset: themeSpacing(1),
        borderRadius: themeSpacing(2)
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed"
      }
    }
  };
}
function inputNumber(props = {}) {
  const {
    color = "neutral",
    accentColor = "primary"
  } = props;
  return {
    type: "number",
    _onSchedule: (node, element) => {
      if (node.tagName != "input") {
        console.warn(`"inputNumber" primitive patch must use input tag`);
      }
      element.type = "number";
    },
    style: {
      fontFamily: "inherit",
      lineHeight: "inherit",
      minWidth: themeSpacing(32),
      paddingInline: themeSpacing(3),
      paddingBlock: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
        opacity: 1
      },
      "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
        color: (listener) => themeColor(listener, "shift-5", "neutral")
      }
    }
  };
}
function keyboard(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "kbd") {
        console.warn(`"keyboard" primitive patch must use kbd tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      paddingBlock: themeSpacing(0.5),
      paddingInline: themeSpacing(1.5),
      borderRadius: themeSpacing(1),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`
    }
  };
}
function label(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "label") {
        console.warn(`"label" primitive patch must use label tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      cursor: "pointer",
      "&:focus-within": {
        color: (listener) => themeColor(listener, "shift-7", accentColor)
      },
      "&[aria-disabled=true]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral")
      }
    }
  };
}
function link(props = {}) {
  let {
    color = "primary",
    accentColor = "secondary"
  } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "a") {
        console.warn(`"link" primitive patch must use a tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      textDecoration: "none",
      "&:visited": {
        color: (listener) => themeColor(listener, "shift-6", accentColor)
      },
      "&:hover:not([disabled])": {
        color: (listener) => themeColor(listener, "shift-7", color),
        textDecoration: "underline"
      },
      "&:focus-visible": {
        borderRadius: themeSpacing(1),
        outlineOffset: themeSpacing(1),
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral")
      }
    }
  };
}
function mark(props = {}) {
  const {
    accentColor = "highlight",
    tone = "shift-1"
  } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "mark") {
        console.warn(`"mark" primitive patch must use mark tag`);
      }
    },
    dataTone: tone,
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", accentColor),
      backgroundColor: (listener) => themeColor(listener, "inherit", accentColor),
      height: themeSpacing(6),
      borderRadius: themeSpacing(1),
      paddingInline: themeSpacing(1.5)
    }
  };
}
function paragraph(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "p") {
        console.warn(`"paragraph" primitive patch must use p tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      lineHeight: 1.5,
      marginTop: 0,
      marginBottom: 0
    }
  };
}
function preformated(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "pre") {
        console.warn(`"preformated" primitive patch must use pre tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "shift-1", color),
      border: "none",
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(3),
      borderRadius: themeSpacing(2)
    }
  };
}
function progress(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "progress") {
        console.warn(`"progress" primitive patch must use progress tag`);
      }
    },
    style: {
      appearance: "none",
      width: "100%",
      height: themeSpacing(2),
      border: 0,
      borderRadius: themeSpacing(999),
      overflow: "hidden",
      backgroundColor: (listener) => themeColor(listener, "shift-2", color),
      "&::-webkit-progress-bar": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", color),
        borderRadius: themeSpacing(999)
      },
      "&::-webkit-progress-value": {
        backgroundColor: (listener) => themeColor(listener, "shift-6", accentColor),
        borderRadius: themeSpacing(999),
        transition: "width 220ms ease"
      },
      "&::-moz-progress-bar": {
        backgroundColor: (listener) => themeColor(listener, "shift-6", accentColor),
        borderRadius: themeSpacing(999)
      }
    }
  };
}
function inputRadio(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    type: "radio",
    _onInsert: (node) => {
      if (node.tagName != "input") {
        console.warn(`"inputRadio" primitive patch must use input tag and radio type`);
        return;
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      appearance: "none",
      display: "inline-flex",
      position: "relative",
      width: themeSpacing(6),
      height: themeSpacing(6),
      justifyContent: "center",
      alignItems: "center",
      transition: "background-color 300ms, outline-color 300ms",
      margin: 0,
      padding: 0,
      "&::before": {
        content: `""`,
        display: "block",
        borderRadius: "50%",
        lineHeight: 1,
        cursor: "pointer",
        border: "none",
        outlineOffset: "-1px",
        outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
        color: (listener) => themeColor(listener, "shift-6", color),
        width: themeSpacing(4),
        height: themeSpacing(4)
      },
      "&:hover::before": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", color)
      },
      "&:checked::before": {
        outline: (listener) => `1px solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&:checked::after": {
        content: `""`,
        position: "absolute",
        inset: "30%",
        borderRadius: "50%",
        backgroundColor: (listener) => themeColor(listener, "shift-5", accentColor)
      },
      "&:checked:hover:not([disabled])::before": {
        backgroundColor: (listener) => themeColor(listener, "shift-4", accentColor)
      },
      "&:focus-visible": {
        borderRadius: "50%",
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&[disabled]": {
        cursor: "not-allowed"
      },
      "&[disabled]::before, &[disabled]::after": {
        outline: "none",
        backgroundColor: (listener) => themeColor(listener, "shift-3", "neutral"),
        pointerEvents: "none"
      }
    }
  };
}
function select(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "select") {
        console.warn(`"select" primitive patch must use select tag`);
      }
    },
    style: {
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      lineHeight: "inherit",
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      borderRadius: themeSpacing(2),
      paddingBlock: themeSpacing(1),
      paddingLeft: themeSpacing(3),
      paddingRight: themeSpacing(1),
      "&:not([multiple])": {
        height: themeSpacing(8)
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", accentColor)}`
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "& optgroup": {
        color: (listener) => themeColor(listener, "shift-8", color)
      },
      "& option[disabled]": {
        color: (listener) => themeColor(listener, "shift-4", "neutral")
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral")
      }
    }
  };
}
function skeleton(props = {}) {
  const { color = "neutral" } = props;
  const keyframes = {
    "0%,100%": { opacity: 1 },
    "50%": { opacity: 0.4 }
  };
  const animationName = hashString(JSON.stringify(keyframes));
  return {
    ariaHidden: "true",
    style: {
      height: themeSpacing(6),
      display: "block",
      borderRadius: themeSpacing(1),
      backgroundColor: (listener) => themeColor(listener, "shift-2", color),
      animation: `${animationName} 1.5s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes
    }
  };
}
function selectList(props = {}) {
  const { color = "neutral", multiple = false } = props;
  const state = toState(props.value ?? (multiple ? [] : null));
  const inputs = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      return vals.map((v) => ({ input: null, name: props.name, value: v || "" }));
    },
    hidden: true
  };
  let partial = {
    dataTone: "shift-11",
    _context: {
      select: {
        value: state,
        multiple
      }
    },
    _onInit: (node) => {
      if (node.tagName != "div") {
        console.warn(`"selectList" patch must use a div tag`);
      }
      node.children.insert(inputs);
    },
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color)
    }
  };
  return partial;
}
function selectItem(props = {}) {
  const {
    accentColor = "primary",
    color = "neutral",
    value = null
  } = props;
  let partial = {
    role: "option",
    _onInit: (node) => {
      if (node.tagName != "div") {
        console.warn(`"selectItem" patch must use div tag`);
      }
      let select2 = node.getContext("select");
      if (select2) {
        let state = select2.value;
        node.attributes.set("ariaSelected", (listener) => {
          let val = state.get(listener);
          return select2.multiple ? val.includes(value) : val == value;
        });
        node.addEvent("click", () => {
          let val = state.get();
          if (select2.multiple) {
            val.includes(value) ? state.set(val.filter((v) => v !== value)) : state.set(val.concat([value]));
          } else {
            val != value && state.set(value);
          }
        });
      }
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(8),
      paddingInline: themeSpacing(3),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled]):not([aria-selected=true])": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", color)
      },
      "&[aria-selected=true]": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", accentColor),
        color: (listener) => themeColor(listener, "shift-8")
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`
      }
    }
  };
  return partial;
}
function selectBox(props) {
  const {
    options = [],
    placement = "bottom",
    color = "neutral",
    open = false,
    multiple = false
  } = props;
  const state = toState(props.value);
  let openState = toState(open);
  let { show, hide, anchorPartial } = creatFloating({ open: openState, placement, content: props.content, onPlacement: props.onPlacement });
  const popoverPartial = {
    onClick: () => !multiple && hide()
  };
  merge(props.content, popoverPartial);
  const wrap = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      const opts = options.filter((opt) => vals.includes(opt.value));
      return opts.map((opt) => ({
        span: opt.label,
        $: [tag({ color, removable: multiple })],
        _key: opt.value,
        _onRemove: (_node) => {
          const cur = state.get();
          const curVals = Array.isArray(cur) ? cur : [cur];
          const filter = curVals.filter((v) => v !== opt.value);
          multiple ? state.set(filter) : state.set(filter[0]);
        }
      }));
    },
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(1),
      flex: 1
    }
  };
  let partial = {
    _onInsert: (node) => {
      if (node.tagName != "div") {
        console.warn(`"selectBox" patch must use div tag`);
      }
    },
    _onInit: (node) => node.children.insert(wrap),
    onClick: () => openState.get() ? hide() : show(),
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      minHeight: themeSpacing(8),
      minWidth: themeSpacing(32),
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      paddingInline: themeSpacing(2),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color)
    }
  };
  merge(anchorPartial, partial);
  return anchorPartial;
}
function inputSwitch(props = {}) {
  const { accentColor = "primary" } = props;
  return {
    dataTone: "increase-2",
    type: "checkbox",
    _onSchedule: (node) => {
      if (node.tagName != "input") {
        console.warn(`"inputSwitch" primitive patch must use input tag`);
        return;
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      appearance: "none",
      position: "relative",
      display: "inline-flex",
      width: themeSpacing(8),
      height: themeSpacing(6),
      cursor: "pointer",
      margin: `0`,
      paddingBlock: themeSpacing(1),
      "&:checked": {
        "&::before": {
          backgroundColor: (listener) => themeColor(listener, "increase-3", accentColor)
        },
        "&::after": {
          left: `calc(100% - ${themeSpacing(3.5)})`
        }
      },
      "&::after": {
        content: `""`,
        aspectRatio: `1/1`,
        position: "absolute",
        width: themeSpacing(3),
        height: themeSpacing(3),
        borderRadius: themeSpacing(999),
        left: themeSpacing(0.5),
        top: "50%",
        transform: "translateY(-50%)",
        transition: "left 0.3s",
        backgroundColor: (listener) => themeColor(listener, "decrease-3")
      },
      "&::before": {
        content: '""',
        width: "100%",
        borderRadius: themeSpacing(999),
        display: "inline-block",
        fontSize: (listener) => themeSize(listener, "inherit"),
        lineHeight: 1,
        backgroundColor: (listener) => themeColor(listener)
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed"
      }
    }
  };
}
function buttonSwitch(props = {}) {
  const {
    checked = false,
    accentColor = "primary",
    color = "neutral"
  } = props;
  const check = toState(checked);
  return {
    _onSchedule: (node) => {
      if (node.tagName != "button") {
        console.warn(`"buttonSwitch" primitive patch must use button tag`);
      }
    },
    role: "switch",
    ariaChecked: (listener) => check.get(listener),
    dataTone: "increase-2",
    onClick: () => check.set(!check.get()),
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener),
      border: "none",
      outlineWidth: "1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-2", color)}`,
      minWidth: themeSpacing(12),
      minHeight: themeSpacing(6),
      borderRadius: themeSpacing(999),
      paddingLeft: themeSpacing(7),
      paddingRight: themeSpacing(2),
      transition: "padding-left 0.3s, padding-right 0.3s",
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "& > :first-child": {
        content: '""',
        position: "absolute",
        display: "inline-flex",
        alignItems: "center",
        left: themeSpacing(0.5),
        top: "50%",
        transform: "translateY(-50%)",
        transition: "left 0.3s",
        width: themeSpacing(5),
        height: themeSpacing(5),
        borderRadius: themeSpacing(999),
        color: (listener) => themeColor(listener, "shift-6"),
        backgroundColor: (listener) => themeColor(listener, "decrease-2", color)
      },
      "&[aria-checked=true]": {
        backgroundColor: (listener) => themeColor(listener, "increase-3", accentColor),
        outline: "none",
        color: (listener) => themeColor(listener, "decrease-2"),
        paddingLeft: themeSpacing(2),
        paddingRight: themeSpacing(7)
      },
      "&[aria-checked=true] > :first-child": {
        left: `calc(100% - ${themeSpacing(5.5)})`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed"
      }
    }
  };
}
function small(props = {}) {
  const {
    color = "neutral"
  } = props;
  return {
    dataSize: "decrease-1",
    _onInsert: (node) => {
      if (node.tagName != "small") {
        console.warn(`"small" primitive patch must use small tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color)
    }
  };
}
function strong(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "strong") {
        console.warn(`"strong" primitive patch must use strong tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      fontWeight: 700,
      color: (listener) => themeColor(listener, "shift-8", color)
    }
  };
}
function subscript(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "sub") {
        console.warn(`"subscript" primitive patch must use sub tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      verticalAlign: "sub",
      lineHeight: 0,
      color: (listener) => themeColor(listener, "shift-6", color)
    }
  };
}
function superscript(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "sup") {
        console.warn(`"superscript" primitive patch must use sup tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      verticalAlign: "super",
      lineHeight: 0,
      color: (listener) => themeColor(listener, "shift-6", color)
    }
  };
}
function table(props = {}) {
  const {
    color = "neutral"
  } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "table") {
        console.warn(`"table" primitive patch must use table tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      width: "100%",
      borderCollapse: "collapse",
      "& caption": {
        captionSide: "bottom"
      },
      "& th, & thead td": {
        textAlign: "left",
        fontWeight: 500,
        paddingInline: themeSpacing(3),
        paddingBlock: themeSpacing(1),
        color: (listener) => themeColor(listener, "shift-7", color),
        backgroundColor: (listener) => themeColor(listener, "inherit")
      },
      "& td": {
        textAlign: "left",
        paddingInline: themeSpacing(3),
        paddingBlock: themeSpacing(1),
        color: (listener) => themeColor(listener, "shift-6", color),
        boxShadow: (listener) => `inset 0 1px 0 ${themeColor(listener, "shift-3", color)}`,
        fontSize: (listener) => themeSize(listener, "inherit")
      },
      "& tfoot th, & tfoot td": {
        textAlign: "left",
        fontWeight: 500,
        paddingInline: themeSpacing(3),
        paddingBlock: themeSpacing(1),
        color: (l) => themeColor(l, "shift-7", color),
        backgroundColor: (l) => themeColor(l, "inherit"),
        boxShadow: (l) => `inset 0 -1px 0 ${themeColor(l, "shift-3", color)}`
      },
      "& tr": {
        backgroundColor: (listener) => themeColor(listener, "inherit")
      },
      "& tbody tr:hover": {
        backgroundColor: (listener) => themeColor(listener, "shift-2") + "!important"
      }
    }
  };
}
function textarea(props = {}) {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "textarea") {
        console.warn(`"textarea" primitive patch must use textarea tag`);
      }
    },
    style: {
      fontFamily: "inherit",
      lineHeight: "inherit",
      resize: "vertical",
      paddingInline: themeSpacing(4),
      paddingBlock: themeSpacing(2),
      border: "none",
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-4")
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", accentColor)}`
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`
      },
      "&:invalid": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", "error")}`
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-5", "neutral"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral")
      }
    }
  };
}
function unorderedList(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "ul") {
        console.warn(`"unorderedList" primitive patch must use ul tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      marginTop: 0,
      marginBottom: 0,
      paddingLeft: themeSpacing(3),
      listStyleType: "disc",
      listStylePosition: "outside"
    }
  };
}
function orderedList(props = {}) {
  const { color = "neutral" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName != "ol") {
        console.warn(`"orderedList" primitive patch must use ol tag`);
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-6", color),
      marginTop: 0,
      marginBottom: 0,
      paddingLeft: themeSpacing(3),
      listStyleType: "decimal",
      listStylePosition: "outside"
    }
  };
}
function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
function pagination(props) {
  const { total, color = "neutral", accentColor = "primary" } = props;
  const state = toState(props.value ?? 1);
  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: themeSpacing(8),
    height: themeSpacing(8),
    paddingInline: themeSpacing(2),
    borderRadius: themeSpacing(2),
    border: "none",
    cursor: "pointer",
    fontSize: (listener) => themeSize(listener, "inherit"),
    backgroundColor: "transparent",
    color: (listener) => themeColor(listener, "shift-6", color),
    "&:hover:not([disabled])": {
      backgroundColor: (listener) => themeColor(listener, "shift-1", color)
    },
    "&[disabled]": {
      opacity: 0.4,
      cursor: "not-allowed"
    }
  };
  const activeStyle = {
    ...btnBase,
    backgroundColor: (listener) => themeColor(listener, "shift-2", accentColor),
    color: (listener) => themeColor(listener, "shift-8", accentColor),
    fontWeight: "600",
    cursor: "default",
    "&:hover:not([disabled])": {
      backgroundColor: (listener) => themeColor(listener, "shift-2", accentColor)
    }
  };
  return {
    _onInsert: (node) => {
      if (node.tagName !== "div") console.warn('"pagination" patch must use div tag');
    },
    _onInit: (node) => {
      const content = {
        div: (listener) => {
          const page2 = state.get(listener);
          const items = [];
          items.push({
            button: "‹",
            type: "button",
            ariaLabel: "Previous page",
            disabled: page2 <= 1,
            onClick: () => page2 > 1 && state.set(page2 - 1),
            style: btnBase
          });
          for (const p of getPages(page2, total)) {
            if (p === "...") {
              items.push({ span: "…", style: { display: "inline-flex", alignItems: "center", paddingInline: themeSpacing(2), color: (listener2) => themeColor(listener2, "shift-4", color) } });
            } else {
              const isActive = p === page2;
              items.push({
                button: String(p),
                type: "button",
                ariaLabel: `Page ${p}`,
                ariaCurrent: isActive ? "page" : void 0,
                disabled: isActive,
                onClick: () => state.set(p),
                style: isActive ? activeStyle : btnBase
              });
            }
          }
          items.push({
            button: "›",
            type: "button",
            ariaLabel: "Next page",
            disabled: page2 >= total,
            onClick: () => page2 < total && state.set(page2 + 1),
            style: btnBase
          });
          return items;
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(1)
        }
      };
      node.children.insert(content);
    },
    style: {
      display: "inline-flex"
    }
  };
}
function divider(props = {}) {
  const {
    color = "neutral"
  } = props;
  return {
    role: "separator",
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"divider" patch should be used with <div>`);
      }
    },
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "baseline",
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      minHeight: "1lh",
      "&::before": {
        content: `""`,
        flex: 1,
        borderColor: (listener) => themeColor(listener, "shift-3", color),
        borderWidth: "1px",
        borderBottomStyle: "solid"
      },
      "&::after": {
        content: `""`,
        flex: 1,
        borderColor: (listener) => themeColor(listener, "shift-3", color),
        borderWidth: "1px",
        borderBottomStyle: "solid"
      }
    }
  };
}
const translateOut = {
  left: "translateX(-100%)",
  right: "translateX(100%)",
  top: "translateY(-100%)",
  bottom: "translateY(100%)"
};
const marginMap = {
  left: "0 auto 0 0",
  right: "0 0 0 auto",
  top: "0 0 auto 0",
  bottom: "auto 0 0 0"
};
const isVertical = (p) => p === "left" || p === "right";
function drawer(props = {}) {
  const { color = "neutral", open = false, placement = "right", size } = props;
  const state = toState(open);
  const defaultSize = isVertical(placement) ? themeSpacing(80) : themeSpacing(64);
  const drawerSize = size ?? defaultSize;
  return {
    _onInsert: (node) => {
      if (node.tagName !== "dialog") {
        console.warn(`"drawer" patch must use dialog tag`);
      }
    },
    onClick: (e, node) => {
      if (e.target !== node.domElement) return;
      state.set(false);
    },
    onTransitionEnd: (_e, node) => {
      const dlg = node.domElement;
      if (!state.get()) {
        dlg.close();
        document.body.style.overflow = "";
      }
    },
    _onMount: (node) => {
      const dlg = node.domElement;
      const update = (val) => {
        if (val) {
          dlg.showModal();
          document.body.style.overflow = "hidden";
          requestAnimationFrame(() => {
            dlg.style.transform = "translate(0, 0)";
          });
        } else {
          dlg.style.transform = translateOut[placement];
        }
      };
      update(state.get());
      state.onChange(update);
    },
    style: {
      transform: translateOut[placement],
      transition: "transform 0.25s ease",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-7", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      padding: themeSpacing(3),
      margin: marginMap[placement],
      width: isVertical(placement) ? drawerSize : "100dvw",
      height: isVertical(placement) ? "100dvh" : drawerSize,
      maxWidth: "100dvw",
      maxHeight: "100dvh",
      boxShadow: (listener) => `0 ${themeSpacing(4)} ${themeSpacing(12)} ${themeColor(listener, "shift-3", "neutral")}`,
      "&::backdrop": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
        opacity: 0.75
      }
    }
  };
}
function popover(props) {
  const {
    open = false,
    placement = "bottom",
    openOn = "click"
  } = props;
  let popoverId = null;
  const openState = toState(open);
  let { show, hide, anchorPartial } = creatFloating({ open: openState, placement, content: props.content, onPlacement: props.onPlacement });
  const popoverPartial = {
    role: "dialog",
    dataTone: "shift-6",
    onMouseEnter: () => openOn === "hover" && show(),
    onMouseLeave: () => openOn === "hover" && hide(),
    _onInsert: (node) => {
      let id = node.attributes.get("id");
      popoverId = id || node.nodeId;
      !id && node.attributes.set("id", popoverId);
    }
  };
  merge(props.content, popoverPartial);
  const triggerPartial = {
    ariaHaspopup: "dialog",
    ariaExpanded: (listener) => openState.get(listener),
    onMouseEnter: () => openOn === "hover" && show(),
    onMouseLeave: () => openOn === "hover" && hide(),
    onClick: () => openOn === "click" && (openState.get() ? hide() : show()),
    onFocus: () => show(),
    onBlur: () => hide(),
    _onMount: (node) => popoverId && node.attributes.set("ariaControls", popoverId)
  };
  merge(anchorPartial, triggerPartial);
  return anchorPartial;
}
function toast(props = {}) {
  const { position = "top-center", color = "neutral" } = props;
  const state = toState(false);
  const isTop = position.startsWith("top");
  const isCenter = position.endsWith("center");
  const isRight = position.endsWith("right");
  const overlayEle = {
    div: [],
    id: `domphy-toast-${position}`,
    style: {
      position: "fixed",
      display: "flex",
      flexDirection: isTop ? "column" : "column-reverse",
      alignItems: isCenter ? "center" : isRight ? "end" : "start",
      inset: 0,
      gap: themeSpacing(4),
      zIndex: 30,
      padding: themeSpacing(6),
      pointerEvents: "none"
    }
  };
  return {
    _portal: (rootNode) => {
      let overlay = rootNode.domElement.querySelector(`#domphy-toast-${position}`);
      if (!overlay) {
        const overlayNode = rootNode.children.insert(overlayEle);
        overlay = overlayNode.domElement;
      }
      return overlay;
    },
    role: "status",
    ariaAtomic: "true",
    style: {
      minWidth: themeSpacing(32),
      pointerEvents: "auto",
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(4),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-1", color),
      backgroundColor: (listener) => themeColor(listener, "shift-9", color),
      boxShadow: (listener) => `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(listener, "shift-3", "neutral")}`,
      opacity: (listener) => Number(state.get(listener)),
      transform: (listener) => state.get(listener) ? "translateY(0)" : isTop ? "translateY(-100%)" : "translateY(100%)",
      transition: "opacity 300ms ease, transform 300ms ease"
    },
    _onMount: () => requestAnimationFrame(() => state.set(true)),
    _onBeforeRemove: (node, done) => {
      const onEnd = (e) => {
        if (e.propertyName === "transform") {
          node.domElement.removeEventListener("transitionend", onEnd);
          done();
        }
      };
      node.domElement.addEventListener("transitionend", onEnd);
      state.set(false);
    }
  };
}
function getItemId(node, index) {
  if (node.key !== void 0 && node.key !== null) {
    return String(node.key);
  }
  return `index-${index}`;
}
function transitionGroup(props = {}) {
  const {
    duration = 300,
    delay = 0
  } = props;
  let previousRects = /* @__PURE__ */ new Map();
  return {
    _onBeforeUpdate: (node) => {
      previousRects = /* @__PURE__ */ new Map();
      node.children.items.forEach((item, index) => {
        if (!(item instanceof ElementNode)) return;
        const dom = item.domElement;
        if (!dom) return;
        previousRects.set(getItemId(item, index), dom.getBoundingClientRect());
      });
    },
    _onUpdate: (node) => {
      node.children.items.forEach((item, index) => {
        if (!(item instanceof ElementNode)) return;
        const dom = item.domElement;
        if (!dom) return;
        const key = getItemId(item, index);
        const prev = previousRects.get(key);
        if (!prev) return;
        const next = dom.getBoundingClientRect();
        const deltaX = prev.left - next.left;
        const deltaY = prev.top - next.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;
        const previousTransition = dom.style.transition;
        const previousTransform = dom.style.transform;
        dom.style.transition = "none";
        dom.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        dom.getBoundingClientRect();
        requestAnimationFrame(() => {
          dom.style.transition = `transform ${duration}ms ease ${delay}ms`;
          dom.style.transform = "translate(0px, 0px)";
        });
        const cleanup = () => {
          dom.style.transition = previousTransition;
          dom.style.transform = previousTransform;
          dom.removeEventListener("transitionend", onEnd);
        };
        const onEnd = (event) => {
          const transitionEvent = event;
          if (transitionEvent.propertyName === "transform") {
            cleanup();
          }
        };
        dom.addEventListener("transitionend", onEnd);
        setTimeout(cleanup, duration + delay + 34);
      });
      previousRects.clear();
    }
  };
}
function tabs(props = {}) {
  let partial = {
    role: "tablist",
    _onSchedule: (node, element) => {
      let partial2 = {
        _context: {
          tabs: {
            activeKey: toState(props.activeKey || 0)
          }
        }
      };
      merge(element, partial2);
    }
  };
  return partial;
}
function tab(props = {}) {
  const {
    accentColor = "primary",
    color = "neutral"
  } = props;
  let partial = {
    role: "tab",
    _onInsert: (node) => {
      var _a;
      if (node.tagName != "button") {
        console.warn(`"tab" patch must use button tag`);
      }
      let context = node.getContext("tabs");
      let children = (_a = node.parent) == null ? void 0 : _a.children.items;
      children = children.filter((n) => n.type == "ElementNode" && n.attributes.get("role") == "tab");
      let key = node.key || children.findIndex((n) => n == node);
      let part = {
        id: "tab" + node.parent.nodeId + key,
        "ariaControls": "tabpanel" + node.parent.nodeId + key,
        "ariaSelected": (listener) => context.activeKey.get(listener) == key,
        onClick: () => context.activeKey.set(key),
        onKeyDown: (e) => {
          var _a2, _b;
          const k = e.key;
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) return;
          e.preventDefault();
          const tabs2 = (((_a2 = node.parent) == null ? void 0 : _a2.children.items) ?? []).filter(
            (n) => n.type === "ElementNode" && n.attributes.get("role") === "tab"
          );
          const idx = tabs2.findIndex((n) => n === node);
          let next = idx;
          if (k === "ArrowRight") next = (idx + 1) % tabs2.length;
          else if (k === "ArrowLeft") next = (idx - 1 + tabs2.length) % tabs2.length;
          else if (k === "Home") next = 0;
          else if (k === "End") next = tabs2.length - 1;
          const target = tabs2[next];
          context.activeKey.set(target.key ?? next);
          (_b = target.domElement) == null ? void 0 : _b.focus();
        }
      };
      node.merge(part);
    },
    style: {
      cursor: "pointer",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(8),
      paddingInline: themeSpacing(4),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-6"),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-2", color)}`,
      "&:hover:not([disabled])": {
        boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-3", color)}`
      },
      "&[aria-selected=true]:not([disabled])": {
        boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-4", accentColor)}`
      },
      "&:focus-visible": {
        boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-6", accentColor)}`
      }
    }
  };
  return partial;
}
function tabPanel() {
  let partial = {
    role: "tabpanel",
    style: {
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(2)
    },
    _onInsert: (node) => {
      var _a;
      let context = node.getContext("tabs");
      let children = (_a = node.parent) == null ? void 0 : _a.children.items;
      children = children.filter((n) => n.type == "ElementNode" && n.attributes.get("role") == "tabpanel");
      let key = node.key || children.findIndex((n) => n == node);
      let part = {
        id: "tabpanel" + node.parent.nodeId + key,
        "ariaLabelledby": "tab" + node.parent.nodeId + key,
        "hidden": (listener) => context.activeKey.get(listener) != key
      };
      node.merge(part);
    }
  };
  return partial;
}
function menu(props = {}) {
  const { color = "neutral" } = props;
  let partial = {
    role: "menu",
    dataTone: "shift-11",
    _onSchedule: (node, element) => {
      let partial2 = {
        _context: {
          menu: {
            activeKey: toState(props.activeKey || 0)
          }
        }
      };
      merge(element, partial2);
    },
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color)
    }
  };
  return partial;
}
function menuItem(props = {}) {
  const {
    accentColor = "primary",
    color = "neutral"
  } = props;
  let partial = {
    role: "menuitem",
    _onInsert: (node) => {
      var _a;
      if (node.tagName != "button") {
        console.warn(`"menuItem" patch must use button tag`);
      }
      let context = node.getContext("menu");
      let children = (_a = node.parent) == null ? void 0 : _a.children.items;
      children = children.filter((n) => n.type == "ElementNode" && n.attributes.get("role") == "menuitem");
      let key = node.key || children.findIndex((n) => n == node);
      node.attributes.set("ariaCurrent", (listener) => context.activeKey.get(listener) == key || void 0);
      node.addEvent("click", () => context.activeKey.set(key));
    },
    onKeyDown: (e, node) => {
      var _a, _b;
      const k = e.key;
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(k)) return;
      e.preventDefault();
      const items = (((_a = node.parent) == null ? void 0 : _a.children.items) ?? []).filter(
        (n) => n.type === "ElementNode" && n.attributes.get("role") === "menuitem"
      );
      const idx = items.findIndex((n) => n === node);
      let next = idx;
      if (k === "ArrowDown") next = (idx + 1) % items.length;
      else if (k === "ArrowUp") next = (idx - 1 + items.length) % items.length;
      else if (k === "Home") next = 0;
      else if (k === "End") next = items.length - 1;
      (_b = items[next].domElement) == null ? void 0 : _b.focus();
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      width: "100%",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(8),
      paddingInline: themeSpacing(3),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-6"),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      "&:hover:not([disabled]):not([aria-current=true])": {
        backgroundColor: (listener) => themeColor(listener, "shift-1")
      },
      "&[aria-current=true]": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", accentColor),
        color: (listener) => themeColor(listener, "shift-7")
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`
      }
    }
  };
  return partial;
}
function form(state) {
  return {
    _onSchedule: (node, element) => {
      merge(element, { _context: { form: state } });
    }
  };
}
function field(path, validator) {
  return {
    _onInsert: (node) => {
      const state = node.getContext("form");
      const f = state.setField(path, void 0, validator);
      const tag2 = node.tagName;
      const type = node.attributes.get("type");
      if (!["input", "select", "textarea"].includes(tag2)) {
        console.warn(`"field" patch must use input, select, or textarea tag`);
      }
      const part = {
        onBlur: () => f.setTouched(),
        ariaInvalid: (listener) => !!f.message("error", listener) || void 0,
        dataStatus: (listener) => f.status(listener)
      };
      if (tag2 === "input" && type === "checkbox") {
        part.checked = f.value();
        part.onChange = (e) => f.setValue(e.target.checked);
      } else if (tag2 === "input" && type === "radio") {
        part.onChange = (e) => f.setValue(e.target.value);
      } else if (tag2 === "select") {
        part.value = f.value();
        part.onChange = (e) => f.setValue(e.target.value);
      } else if (tag2 === "textarea") {
        part.value = f.value();
        part.onInput = (e) => f.setValue(e.target.value);
      } else {
        part.value = f.value();
        part.onInput = (e) => f.setValue(e.target.value);
      }
      node.merge(part);
    }
  };
}
function isPromiseLike(value) {
  return !!value && typeof value.then === "function";
}
class FieldState {
  constructor(initValue, validator) {
    this._notifier = new Notifier();
    this._messages = {};
    this._touched = false;
    this._pending = false;
    this._validationToken = 0;
    this._value = initValue;
    this._initValue = initValue;
    this._validator = validator;
    if (validator) this.validate();
  }
  value(listener) {
    if (listener) this._notifier.addListener("value", listener);
    return this._value;
  }
  setValue(val) {
    this._value = val;
    this._notifier.notify("value", val);
    this._notifier.notify("dirty", val !== this._initValue);
    this.validate();
  }
  dirty(listener) {
    if (listener) this._notifier.addListener("dirty", listener);
    return this._value !== this._initValue;
  }
  touched(listener) {
    if (listener) this._notifier.addListener("touched", listener);
    return this._touched;
  }
  setTouched() {
    if (!this._touched) {
      this._touched = true;
      this._notifier.notify("touched", true);
    }
  }
  configure(initValue, validator) {
    let shouldValidate = false;
    if (initValue !== void 0 && this._value === void 0 && this._initValue === void 0) {
      this._value = initValue;
      this._initValue = initValue;
      this._notifier.notify("value", initValue);
      this._notifier.notify("dirty", false);
      shouldValidate = true;
    }
    if (validator !== void 0 && validator !== this._validator) {
      this._validator = validator;
      shouldValidate = true;
    }
    if (shouldValidate) this.validate();
  }
  message(type, listener) {
    if (listener) this._notifier.addListener(type, listener);
    return this._messages[type];
  }
  status(listener) {
    if (listener) this._notifier.addListener("status", listener);
    return resolveStatus(this._messages);
  }
  setMessages(next) {
    const prev = this._messages;
    this._messages = next;
    for (const type of ["error", "warning", "success"]) {
      if (prev[type] !== next[type]) this._notifier.notify(type, next[type]);
    }
    if (resolveStatus(prev) !== resolveStatus(next)) {
      this._notifier.notify("status", resolveStatus(next));
    }
  }
  reset() {
    this._value = this._initValue;
    this._touched = false;
    this._notifier.notify("value", this._value);
    this._notifier.notify("dirty", false);
    this._notifier.notify("touched", false);
    this.setMessages({});
    this.validate();
  }
  validate() {
    const token = ++this._validationToken;
    if (!this._validator) {
      this._pending = false;
      this.setMessages({});
      return;
    }
    try {
      const result = this._validator(this._value);
      if (isPromiseLike(result)) {
        this._pending = true;
        Promise.resolve(result).then((msg) => {
          if (token !== this._validationToken) return;
          this._pending = false;
          this.setMessages(msg ?? {});
        }).catch((error) => {
          if (token !== this._validationToken) return;
          this._pending = false;
          console.error(error);
        });
      } else {
        this._pending = false;
        this.setMessages(result ?? {});
      }
    } catch (error) {
      if (token === this._validationToken) {
        this._pending = false;
      }
      console.error(error);
    }
  }
  _dispose() {
    this._validationToken += 1;
    this._pending = false;
    this._notifier._dispose();
  }
}
function resolveStatus(m) {
  if (m.error) return "error";
  if (m.warning) return "warning";
  if (m.success) return "success";
  return void 0;
}
class FormState {
  constructor() {
    this.fields = /* @__PURE__ */ new Map();
  }
  setField(path, initValue, validator) {
    let field2 = this.fields.get(path);
    if (!field2) {
      field2 = new FieldState(initValue, validator);
      this.fields.set(path, field2);
    } else {
      field2.configure(initValue, validator);
    }
    return field2;
  }
  getField(path) {
    return this.setField(path);
  }
  removeField(path) {
    var _a;
    (_a = this.fields.get(path)) == null ? void 0 : _a._dispose();
    this.fields.delete(path);
  }
  get valid() {
    for (const f of this.fields.values()) {
      if (f._pending || f._messages.error) return false;
    }
    return true;
  }
  reset() {
    for (const f of this.fields.values()) f.reset();
  }
  snapshot() {
    const result = {};
    for (const [path, f] of this.fields) setByPath(result, path, f._value);
    return result;
  }
  _dispose() {
    for (const f of this.fields.values()) f._dispose();
    this.fields.clear();
  }
}
function setByPath(obj, path, value) {
  const segments = path.split(".");
  let cur = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (cur[key] == null) cur[key] = isNaN(Number(segments[i + 1])) ? {} : [];
    cur = cur[key];
  }
  cur[segments[segments.length - 1]] = value;
}
const domphyUI = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  FieldState,
  FormState,
  abbreviation,
  alert,
  avatar,
  badge,
  blockquote,
  breadcrumb,
  breadcrumbEllipsis,
  button,
  buttonSwitch,
  card,
  code,
  combobox,
  command,
  commandItem,
  commandSearch,
  descriptionList,
  details,
  dialog,
  divider,
  drawer,
  emphasis,
  field,
  figure,
  form,
  formGroup,
  heading,
  horizontalRule,
  icon,
  image,
  inputCheckbox,
  inputColor,
  inputDateTime,
  inputFile,
  inputNumber,
  inputOTP,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  keyboard,
  label,
  link,
  mark,
  menu,
  menuItem,
  orderedList,
  pagination,
  paragraph,
  popover,
  popoverArrow,
  preformated,
  progress,
  select,
  selectBox,
  selectItem,
  selectList,
  skeleton,
  small,
  spinner,
  splitter,
  splitterHandle,
  splitterPanel,
  strong,
  subscript,
  superscript,
  tab,
  tabPanel,
  table,
  tabs,
  tag,
  textarea,
  toast,
  toggle,
  toggleGroup,
  tooltip,
  transitionGroup,
  unorderedList
}, Symbol.toStringTag, { value: "Module" }));
const moduleMap = {
  "@domphy/core": domphyCore,
  "@domphy/ui": domphyUI,
  "@domphy/theme": domphyTheme,
  "@tanstack/query-core": queryCore,
  i18next,
  page,
  sortablejs: Sortable,
  zod
};
function transformCode(code2) {
  let result = transform(code2, {
    transforms: ["typescript"]
  }).code;
  result = result.replace(/import\s+type\s+.*from\s+['"][^'"]+['"]\n?/g, "");
  result = result.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    (_, imports, pkg) => `const {${imports}} = __modules__['${pkg}']`
  );
  result = result.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    (_, name, pkg) => `const ${name} = __modules__['${pkg}'].default ?? __modules__['${pkg}']`
  );
  result = result.replace(/export\s+default\s+/, "return ");
  return result;
}
function Preview(code2, isDark, hasGrid, error) {
  return {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement;
      const shadow = dom.attachShadow({ mode: "open" });
      const container = document.createElement("div");
      container.style.flex = "1";
      const themeTag = document.createElement("style");
      themeTag.id = "domphy-themes";
      shadow.append(themeTag, container);
      themeApply(themeTag);
      let newNode = null;
      const update = (val) => {
        container.textContent = "";
        try {
          if (newNode) newNode.remove();
          const fn = new Function("__modules__", transformCode(val));
          const el = fn(moduleMap);
          if (!el) return;
          newNode = new ElementNode(Render(el, isDark, hasGrid));
          newNode.render(container);
        } catch (e) {
          error.set(e.message);
        }
      };
      update(code2.get());
      code2.onChange(update);
    },
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "auto"
    }
  };
}
function ErrorOverlay(error) {
  return {
    div: (listener) => `⚠ ${error.get(listener)}`,
    style: {
      display: (listener) => error.get(listener) ? "block" : "none",
      position: "absolute",
      top: "8px",
      left: "8px",
      right: "8px",
      zIndex: "10",
      color: "#ff6b6b",
      fontSize: "12px",
      fontFamily: "monospace",
      background: "rgba(0,0,0,0.75)",
      padding: "6px 10px",
      borderRadius: "4px",
      whiteSpace: "pre-wrap"
    }
  };
}
const TipBar = {
  div: [
    { span: "💡 Tip: " },
    {
      code: "console.log(domphyElement)",
      style: { color: "#0081c6", fontSize: "12px" }
    },
    { span: " prints the full expanded patch object (all merges resolved) — paste it to AI for debugging." }
  ],
  style: {
    borderTop: "1px solid var(--vp-c-divider)",
    color: "#6f6f6f",
    fontSize: "12px",
    fontFamily: "monospace",
    padding: "5px 10px",
    letterSpacing: "0.02em"
  }
};
function ConsoleLog(log, i) {
  return {
    div: [
      { span: "›", style: { flexShrink: "0", color: "#555", userSelect: "none" } },
      { span: log, style: { whiteSpace: "pre-wrap", wordBreak: "break-all" } }
    ],
    _key: i,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "6px",
      padding: "3px 10px",
      color: "#9cdcfe",
      borderBottom: "1px solid #1e1e1e"
    }
  };
}
function ConsoleHeader(logs, copied) {
  return {
    div: [
      { span: "Console" },
      {
        button: (listener) => copied.get(listener) ? "✓ Copied" : "Copy",
        onClick: () => {
          navigator.clipboard.writeText(logs.get().join("\n")).then(() => {
            copied.set(true);
            setTimeout(() => copied.set(false), 2e3);
          });
        },
        style: {
          cursor: "pointer",
          background: "#2a2a2a",
          border: "1px solid #3a3a3a",
          color: "#888",
          fontFamily: "monospace",
          fontSize: "10px",
          letterSpacing: "0.05em",
          padding: "2px 8px",
          borderRadius: "3px",
          textTransform: "uppercase"
        }
      }
    ],
    style: {
      position: "sticky",
      top: "0",
      zIndex: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "4px 10px",
      background: "#1a1a1a",
      borderBottom: "1px solid #2a2a2a",
      color: "#555",
      fontSize: "11px",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  };
}
function Console(logs, copied) {
  return {
    div: (listener) => {
      const currentLogs = logs.get(listener);
      if (!currentLogs.length) return [];
      return [ConsoleHeader(logs, copied), ...currentLogs.map(ConsoleLog)];
    },
    style: {
      borderTop: "1px solid var(--vp-c-divider)",
      background: "#141414",
      fontFamily: "monospace",
      fontSize: "12px",
      maxHeight: "500px",
      overflowY: "auto",
      position: "relative"
    }
  };
}
function stringify(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  if (typeof value === "function") {
    const lines = value.toString().split("\n");
    return lines.map((line, i) => i === 0 ? line : pad + line.trimStart()).join("\n");
  }
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => `${inner}${stringify(v, indent + 1)}`).join(",\n");
    return `[
${items}
${pad}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    const items = keys.map((k) => {
      const v = stringify(value[k], indent + 1);
      return `${inner}"${k}": ${v}`;
    }).join(",\n");
    return `{
${items}
${pad}}`;
  }
  return String(value);
}
function Container(initialCode, storageKey) {
  const savedCode = storageKey ? localStorage.getItem(storageKey) ?? initialCode : initialCode;
  const code2 = toState(savedCode);
  const error = toState("");
  const logs = toState([]);
  const copied = toState(false);
  const isDark = toState(false);
  const isFull = toState(false);
  const hasGrid = toState(true);
  const update = (val) => {
    error.set("");
    logs.set([]);
    const originalLog = console.log;
    console.log = (...args) => {
      logs.set([...logs.get(), args.map((a) => stringify(a)).join(" ")]);
      originalLog(...args);
    };
    try {
      const fn = new Function("__modules__", transformCode(val));
      const el = fn(moduleMap);
      if (!el) throw new Error("Code must have export default");
    } catch (e) {
      error.set(e.message);
    } finally {
      console.log = originalLog;
    }
  };
  update(savedCode);
  code2.onChange((val) => {
    if (storageKey) localStorage.setItem(storageKey, val);
    update(val);
  });
  const workspace = {
    div: [
      {
        div: [
          Editor(code2),
          {
            div: [
              Toolbar({ isDark, isFull, hasGrid }),
              Preview(code2, isDark, hasGrid, error),
              ErrorOverlay(error)
            ],
            style: {
              position: "relative",
              display: "flex",
              flexDirection: "column"
            }
          }
        ],
        style: {
          display: "grid",
          gridTemplateColumns: "55% 45%",
          flex: 1,
          minHeight: 0
        }
      }
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      border: "1px solid var(--vp-c-divider)",
      overflow: "hidden",
      position: (listener) => isFull.get(listener) ? "fixed" : "relative",
      inset: 0,
      height: (listener) => isFull.get(listener) ? "100vh" : "600px",
      zIndex: 10,
      backgroundColor: `var(--vp-c-bg)`
    }
  };
  return {
    div: [workspace, TipBar, Console(logs, copied)],
    style: {
      display: "flex",
      flexDirection: "column"
    }
  };
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  props: {
    code: {},
    storageKey: {}
  },
  setup(__props) {
    const props = __props;
    const mountEl = ref();
    onMounted(() => {
      themeApply();
      new ElementNode(Container(props.code, props.storageKey)).render(mountEl.value);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("docs/editor/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as _
};
