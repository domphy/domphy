const EventProperties = [
  "onAbort",
  "onAuxClick",
  "onBeforeMatch",
  "onBeforeToggle",
  "onBlur",
  "onCancel",
  "onCanPlay",
  "onCanPlayThrough",
  "onChange",
  "onClick",
  "onClose",
  "onContextLost",
  "onContextMenu",
  "onContextRestored",
  "onCopy",
  "onCueChange",
  "onCut",
  "onDblClick",
  "onDrag",
  "onDragEnd",
  "onDragEnter",
  "onDragLeave",
  "onDragOver",
  "onDragStart",
  "onDrop",
  "onDurationChange",
  "onEmptied",
  "onEnded",
  "onError",
  "onFocus",
  "onFormData",
  "onInput",
  "onInvalid",
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onLoad",
  "onLoadedData",
  "onLoadedMetadata",
  "onLoadStart",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onPaste",
  "onPause",
  "onPlay",
  "onPlaying",
  "onProgress",
  "onRateChange",
  "onReset",
  "onResize",
  "onScroll",
  "onScrollEnd",
  "onSecurityPolicyViolation",
  "onSeeked",
  "onSeeking",
  "onSelect",
  "onSlotChange",
  "onStalled",
  "onSubmit",
  "onSuspend",
  "onTimeUpdate",
  "onToggle",
  "onVolumeChange",
  "onWaiting",
  "onWheel",
  "onTouchStart",
  "onTouchMove",
  "onTouchEnd",
  "onTouchCancel",
  "onPointerDown",
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerOver",
  "onPointerOut",
  "onGotPointerCapture",
  "onLostPointerCapture",
  "onCompositionStart",
  "onCompositionUpdate",
  "onCompositionEnd",
  "onTransitionEnd",
  "onTransitionStart",
  "onAnimationStart",
  "onAnimationEnd",
  "onAnimationIteration",
  "onFullscreenChange",
  "onFullscreenError",
  "onFocusIn",
  "onFocusOut"
];
const eventNameMap = EventProperties.reduce((acc, ev) => {
  const key = ev.slice(2).toLowerCase();
  acc[key] = ev;
  return acc;
}, {});
const HtmlTags = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "blockquote",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "map",
  "mark",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "bdi",
  "bdo",
  "math",
  "menu",
  "search",
  "area",
  "embed",
  "hr",
  "animate",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "cursor",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "prefetch",
  "radialGradient",
  "rect",
  "set",
  "solidColor",
  "stop",
  "svg",
  "switch",
  "symbol",
  "tbreak",
  "text",
  "textPath",
  "tspan",
  "use",
  "view"
];
class Notifier {
  constructor() {
    this._listeners = {};
  }
  _dispose() {
    if (this._listeners) {
      for (const event in this._listeners) {
        this._listeners[event].clear();
      }
    }
    this._listeners = null;
  }
  addListener(event, listener) {
    if (!this._listeners) return () => {
    };
    if (typeof event !== "string" || typeof listener !== "function") {
      throw new Error("Event name must be a string, listener must be a function");
    }
    if (!this._listeners[event]) {
      this._listeners[event] = /* @__PURE__ */ new Set();
    }
    const release = () => this.removeListener(event, listener);
    if (!this._listeners[event].has(listener)) {
      this._listeners[event].add(listener);
      if (typeof listener.onSubscribe === "function") {
        listener.onSubscribe(release);
      }
    }
    return release;
  }
  removeListener(event, listener) {
    if (!this._listeners) return;
    const listeners = this._listeners[event];
    if (listeners && listeners.has(listener)) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        delete this._listeners[event];
      }
    }
  }
  notify(event, ...args) {
    if (!this._listeners) return;
    const listeners = this._listeners[event];
    if (listeners) {
      for (const listener of [...listeners]) {
        try {
          listener(...args);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}
class State {
  constructor(initialValue) {
    this._notifier = new Notifier();
    this.initialValue = initialValue;
    this._value = initialValue;
  }
  get(listener) {
    if (listener) this.onChange(listener);
    return this._value;
  }
  set(newValue) {
    if (!this._notifier) return;
    this._value = newValue;
    this._notifier.notify("change", newValue);
  }
  reset() {
    this.set(this.initialValue);
  }
  onChange(listener) {
    if (!this._notifier) return () => {
    };
    return this._notifier.addListener("change", listener);
  }
  _dispose() {
    if (this._notifier) {
      this._notifier._dispose();
      this._notifier = null;
    }
  }
}
function merge(source = {}, target = {}) {
  const comma = ["animation", "transition", "boxShadow", "textShadow", "background", "fontFamily"];
  const space = ["class", "rel", "transform", "acceptCharset", "sandbox"];
  const adjacent = ["content"];
  if (Object.prototype.toString.call(target) === "[object Object]" && Object.getPrototypeOf(target) === Object.prototype) {
    target = deepClone(target);
  }
  for (const key in target) {
    const value = target[key];
    if (value === void 0 || value === null || value === "") continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      if (typeof source[key] === "object") {
        source[key] = merge(source[key], value);
      } else {
        source[key] = value;
      }
    } else {
      if (comma.includes(key)) {
        if (typeof source[key] === "function" || typeof value === "function") {
          let old = source[key];
          source[key] = (listener) => {
            let val1 = typeof old === "function" ? old(listener) : old;
            let val2 = typeof value === "function" ? value(listener) : value;
            return [val1, val2].filter((e) => e).join(", ");
          };
        } else {
          source[key] = [source[key], value].filter((e) => e).join(", ");
        }
      } else if (adjacent.includes(key)) {
        if (typeof source[key] === "function" || typeof value === "function") {
          let old = source[key];
          source[key] = (listener) => {
            let val1 = typeof old === "function" ? old(listener) : old;
            let val2 = typeof value === "function" ? value(listener) : value;
            return [val1, val2].filter((e) => e).join("");
          };
        } else {
          source[key] = [source[key], value].filter((e) => e).join("");
        }
      } else if (space.includes(key)) {
        if (typeof source[key] === "function" || typeof value === "function") {
          let old = source[key];
          source[key] = (listener) => {
            let val1 = typeof old === "function" ? old(listener) : old;
            let val2 = typeof value === "function" ? value(listener) : value;
            return [val1, val2].filter((e) => e).join(" ");
          };
        } else {
          source[key] = [source[key], value].filter((e) => e).join(" ");
        }
      } else if (key.startsWith("on")) {
        let name = key.replace("on", "").toLowerCase();
        addEvent(source, name, value);
      } else if (key.startsWith("_on")) {
        let name = key.replace("_on", "");
        addHook(source, name, value);
      } else {
        source[key] = value;
      }
    }
  }
  return source;
}
function toState(val) {
  return val instanceof State ? val : new State(val);
}
function hashString(str = "") {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = hash * 16777619 >>> 0;
  }
  return String.fromCharCode(97 + hash % 26) + hash.toString(16);
}
function addHook(partial, hookName, handler) {
  const hookProperty = `_on${hookName}`;
  let current = partial[hookProperty];
  if (typeof current === "function") {
    partial[hookProperty] = (...args) => {
      current(...args);
      handler(...args);
    };
  } else {
    partial[hookProperty] = handler;
  }
}
function addEvent(attributes, eventName, handler) {
  const eventProperty = eventNameMap[eventName];
  if (!eventProperty) {
    throw Error(`invalid event name "${eventName}"`);
  }
  const current = attributes[eventProperty];
  if (typeof current == "function") {
    attributes[eventProperty] = (event, node) => {
      current(event, node);
      handler(event, node);
    };
  } else {
    attributes[eventProperty] = handler;
  }
}
function deepClone(value, seen = /* @__PURE__ */ new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (typeof value === "function") return value;
  if (seen.has(value)) return seen.get(value);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && !Array.isArray(value)) return value;
  let clone;
  if (Array.isArray(value)) {
    clone = [];
    seen.set(value, clone);
    for (const v of value) clone.push(deepClone(v, seen));
    return clone;
  }
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value);
  if (value instanceof Map) {
    clone = /* @__PURE__ */ new Map();
    seen.set(value, clone);
    for (const [k, v] of value) clone.set(deepClone(k, seen), deepClone(v, seen));
    return clone;
  }
  if (value instanceof Set) {
    clone = /* @__PURE__ */ new Set();
    seen.set(value, clone);
    for (const v of value) clone.add(deepClone(v, seen));
    return clone;
  }
  if (ArrayBuffer.isView(value)) {
    return new value.constructor(value);
  }
  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }
  clone = Object.create(proto);
  seen.set(value, clone);
  for (const key of Reflect.ownKeys(value)) {
    clone[key] = deepClone(value[key], seen);
  }
  return clone;
}
function validate(element, asPartial = false) {
  if (Object.prototype.toString.call(element) !== "[object Object]") {
    throw Error(`typeof ${element} is invalid DomphyElement`);
  }
  let keys = Object.keys(element);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let val = element[key];
    if (i == 0 && !HtmlTags.includes(key) && !key.includes("-") && !asPartial) {
      throw Error(`key ${key} is not valid HTML tag name`);
    } else if (key == "style" && val && Object.prototype.toString.call(val) !== "[object Object]") {
      throw Error(`"style" must be a object`);
    } else if (key == "$") {
      element.$.forEach((v) => validate(v, true));
    } else if (key.startsWith("_on") && typeof val != "function") {
      throw Error(`hook ${key} value "${val}" must be a function `);
    } else if (key.startsWith("on") && typeof val != "function") {
      throw Error(`event ${key} value "${val}" must be a function `);
    } else if (key == "_portal" && typeof val !== "function") {
      throw Error(`"_portal" must be a function return HTMLElement`);
    } else if (key == "_context" && Object.prototype.toString.call(val) !== "[object Object]") {
      throw Error(`"_context" must be a object`);
    } else if (key == "_metadata" && Object.prototype.toString.call(val) !== "[object Object]") {
      throw Error(`"_metadata" must be a object`);
    } else if (key == "_key" && (typeof val !== "string" && typeof val !== "number")) {
      throw Error(`"_key" must be a string or number`);
    }
  }
  return true;
}
function isHTML(str) {
  return /<([a-z][\w-]*)(\s[^>]*)?>.*<\/\1>|<([a-z][\w-]*)(\s[^>]*)?\/>/i.test(str.trim());
}
function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function getTagName(element) {
  return Object.keys(element).find((e) => HtmlTags.includes(e));
}
function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
function selectorSplitter(selectors) {
  if (selectors.indexOf("@") === 0) {
    return [selectors];
  }
  var splitted = [];
  var parens = 0;
  var angulars = 0;
  var soFar = "";
  for (var i = 0, len = selectors.length; i < len; i++) {
    var char = selectors[i];
    if (char === "(") {
      parens += 1;
    } else if (char === ")") {
      parens -= 1;
    } else if (char === "[") {
      angulars += 1;
    } else if (char === "]") {
      angulars -= 1;
    } else if (char === ",") {
      if (!parens && !angulars) {
        splitted.push(soFar.trim());
        soFar = "";
        continue;
      }
    }
    soFar += char;
  }
  splitted.push(soFar.trim());
  return splitted;
}
function ensureDomStyle(styleParent) {
  var _a;
  let domStyle = styleParent.querySelector("#domphy-style");
  if (!domStyle) {
    domStyle = document.createElement("style");
    domStyle.id = "domphy-style";
    styleParent.appendChild(domStyle);
  }
  if (domStyle.dataset.domphyBase !== "true") {
    (_a = domStyle.sheet) == null ? void 0 : _a.insertRule("[hidden] { display: none !important; }", 0);
    domStyle.dataset.domphyBase = "true";
  }
  return domStyle;
}
const mergePartial = (partial) => {
  if (Array.isArray(partial.$)) {
    let part = {};
    partial.$.forEach((p) => merge(part, mergePartial(p)));
    delete partial.$;
    merge(part, partial);
    return part;
  } else {
    return partial;
  }
};
const BooleanAttributes = [
  "allowFullScreen",
  "async",
  "autoFocus",
  "autoPlay",
  "checked",
  "compact",
  "contentEditable",
  "controls",
  "declare",
  "default",
  "defer",
  "disabled",
  "formNoValidate",
  "hidden",
  "isMap",
  "itemScope",
  "loop",
  "multiple",
  "muted",
  "noHref",
  "noShade",
  "noValidate",
  "open",
  "playsInline",
  "readonly",
  "required",
  "reversed",
  "scoped",
  "selected",
  "sortable",
  "trueSpeed",
  "typeMustMatch",
  "wmode",
  "autoCapitalize",
  "translate",
  "spellCheck",
  "inert",
  "download",
  "noModule",
  "paused",
  "autoPictureInPicture"
];
const PrefixCSS = {
  transform: ["webkit", "ms"],
  transition: ["webkit", "ms"],
  animation: ["webkit"],
  userSelect: ["webkit", "ms"],
  flexDirection: ["webkit", "ms"],
  flexWrap: ["webkit", "ms"],
  justifyContent: ["webkit", "ms"],
  alignItems: ["webkit", "ms"],
  alignSelf: ["webkit", "ms"],
  order: ["webkit", "ms"],
  flexGrow: ["webkit", "ms"],
  flexShrink: ["webkit", "ms"],
  flexBasis: ["webkit", "ms"],
  columns: ["webkit"],
  columnCount: ["webkit"],
  columnGap: ["webkit"],
  columnRule: ["webkit"],
  columnWidth: ["webkit"],
  boxSizing: ["webkit"],
  appearance: ["webkit", "moz"],
  filter: ["webkit"],
  backdropFilter: ["webkit"],
  clipPath: ["webkit"],
  mask: ["webkit"],
  maskImage: ["webkit"],
  textSizeAdjust: ["webkit", "ms"],
  hyphens: ["webkit", "ms"],
  writingMode: ["webkit", "ms"],
  gridTemplateColumns: ["ms"],
  gridTemplateRows: ["ms"],
  gridAutoColumns: ["ms"],
  gridAutoRows: ["ms"],
  gridColumn: ["ms"],
  gridRow: ["ms"],
  marginInlineStart: ["webkit"],
  marginInlineEnd: ["webkit"],
  paddingInlineStart: ["webkit"],
  paddingInlineEnd: ["webkit"],
  minInlineSize: ["webkit"],
  maxInlineSize: ["webkit"],
  minBlockSize: ["webkit"],
  maxBlockSize: ["webkit"],
  inlineSize: ["webkit"],
  blockSize: ["webkit"],
  tabSize: ["moz"],
  overscrollBehavior: ["webkit", "ms"],
  touchAction: ["ms"],
  resize: ["webkit"],
  printColorAdjust: ["webkit"],
  backgroundClip: ["webkit"],
  boxDecorationBreak: ["webkit"],
  overflowScrolling: ["webkit"]
};
const CamelAttributes = [
  "viewBox",
  "preserveAspectRatio",
  "gradientTransform",
  "gradientUnits",
  "spreadMethod",
  "markerStart",
  "markerMid",
  "markerEnd",
  "markerHeight",
  "markerWidth",
  "markerUnits",
  "refX",
  "refY",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "filterUnits",
  "primitiveUnits",
  "kernelUnitLength",
  "clipPathUnits",
  "maskContentUnits",
  "maskUnits"
];
class ElementAttribute {
  constructor(name, value, parent) {
    this.parent = parent;
    this.isBoolean = BooleanAttributes.includes(name);
    if (CamelAttributes.includes(name)) {
      this.name = name;
    } else {
      this.name = camelToKebab(name);
    }
    this.value = void 0;
    this.set(value);
  }
  render() {
    if (!this.parent || !this.parent.domElement) return;
    const domElement = this.parent.domElement;
    const mutateAttrs = ["value"];
    if (this.isBoolean) {
      if (this.value === false || this.value == null) {
        domElement.removeAttribute(this.name);
      } else {
        domElement.setAttribute(this.name, this.value === true ? "" : this.value);
      }
    } else if (this.value == null) {
      domElement.removeAttribute(this.name);
    } else if (mutateAttrs.includes(this.name)) {
      domElement[this.name] = this.value;
    } else {
      domElement.setAttribute(this.name, this.value);
    }
  }
  set(value) {
    if (value == null) {
      this.value = null;
      this.render();
      return;
    }
    if (typeof value === "string" && /<\/?[a-z][\s\S]*>/i.test(value)) {
      this.value = escapeHTML(value);
    } else if (typeof value == "function") {
      let listener = () => {
        if (!listener) return;
        this.value = this.isBoolean ? Boolean(value()) : value();
        this.render();
      };
      listener.elementNode = this.parent;
      listener.onSubscribe = (release) => {
        if (this.parent) {
          this.parent.addHook("BeforeRemove", () => {
            release();
            listener = null;
          });
        }
      };
      this.value = this.isBoolean ? Boolean(value(listener)) : value(listener);
    } else {
      this.value = this.isBoolean ? Boolean(value) : value;
    }
    this.render();
  }
  remove() {
    if (this.parent && this.parent.attributes) {
      this.parent.attributes.remove(this.name);
    }
    this._dispose();
  }
  _dispose() {
    this.value = null;
    this.parent = null;
  }
  generateHTML() {
    const { name, value } = this;
    if (this.isBoolean) {
      return value ? `${name}` : "";
    } else {
      const val = Array.isArray(value) ? JSON.stringify(value) : value;
      return `${name}="${escapeHTML(String(val))}"`;
    }
  }
}
class AttributeList {
  constructor(parent) {
    this._notifier = new Notifier();
    this.items = {};
    this.parent = parent;
  }
  generateHTML() {
    if (!this.items) return "";
    const str = Object.values(this.items).map((attr) => attr.generateHTML()).join(" ");
    return str ? ` ${str}` : "";
  }
  get(name) {
    var _a;
    if (!this.items) return void 0;
    return (_a = this.items[name]) == null ? void 0 : _a.value;
  }
  set(name, value) {
    if (!this.items || !this.parent) return;
    if (this.items[name]) {
      this.items[name].set(value);
      this.parent.domElement && this._notifier.notify(name, this.items[name].value);
    } else {
      this.items[name] = new ElementAttribute(name, value, this.parent);
    }
  }
  onChange(name, callback) {
    var _a;
    if (this.has(name) && ((_a = this.parent) == null ? void 0 : _a.domElement)) {
      const handler = callback;
      handler.onSubscribe = (release) => {
        var _a2;
        return (_a2 = this.parent) == null ? void 0 : _a2.addHook("BeforeRemove", release);
      };
      this._notifier.addListener(name, handler);
    }
  }
  has(name) {
    if (!this.items) return false;
    return Object.prototype.hasOwnProperty.call(this.items, name);
  }
  remove(name) {
    if (!this.items) return;
    if (this.items[name]) {
      this.items[name]._dispose();
      delete this.items[name];
    }
    if (this.parent && this.parent.domElement && this.parent.domElement instanceof Element) {
      this.parent.domElement.removeAttribute(name);
    }
  }
  _dispose() {
    if (this.items) {
      for (const key in this.items) {
        this.items[key]._dispose();
      }
    }
    this._notifier._dispose();
    this.items = null;
    this.parent = null;
  }
  toggle(name, force) {
    if (!BooleanAttributes.includes(name)) {
      throw Error(`${name} is not a boolean attribute`);
    }
    if (force === true) {
      this.set(name, true);
    } else if (force === false) {
      this.remove(name);
    } else {
      this.has(name) ? this.remove(name) : this.set(name, true);
    }
  }
  addClass(className) {
    if (!className || typeof className !== "string") return;
    const add = (classes, newClass) => {
      const list = (classes || "").split(" ").filter((e) => e);
      !list.includes(newClass) && list.push(className);
      return list.join(" ");
    };
    let current = this.get("class");
    if (typeof current === "function") {
      this.set("class", () => add(current(), className));
    } else {
      this.set("class", add(current, className));
    }
  }
  hasClass(className) {
    if (!className || typeof className !== "string") return false;
    const current = this.get("class") || "";
    const list = current.split(" ").filter((e) => e);
    return list.includes(className);
  }
  toggleClass(className) {
    if (!className || typeof className !== "string") return;
    this.hasClass(className) ? this.removeClass(className) : this.addClass(className);
  }
  removeClass(className) {
    if (!className || typeof className !== "string") return;
    const current = this.get("class") || "";
    const list = current.split(" ").filter((e) => e);
    const updated = list.filter((cls) => cls !== className);
    updated.length > 0 ? this.set("class", updated.join(" ")) : this.remove("class");
  }
  replaceClass(oldClass, newClass) {
    if (!oldClass || !newClass || typeof oldClass !== "string" || typeof newClass !== "string")
      return;
    if (this.hasClass(oldClass)) {
      this.removeClass(oldClass);
      this.addClass(newClass);
    }
  }
}
class TextNode {
  constructor(textContent, parent) {
    this.type = "TextNode";
    this.parent = parent;
    this.text = textContent === "" ? "​" : String(textContent);
  }
  _createDOMNode() {
    let newNode;
    if (isHTML(this.text)) {
      const tpl = document.createElement("template");
      tpl.innerHTML = this.text.trim();
      newNode = tpl.content.firstChild || document.createTextNode("");
    } else {
      newNode = document.createTextNode(this.text);
    }
    this.domText = newNode;
    return newNode;
  }
  _dispose() {
    this.domText = void 0;
    this.text = "";
  }
  generateHTML() {
    return this.text === "​" ? "&#8203;" : this.text;
  }
  render(domText) {
    const newNode = this._createDOMNode();
    domText.appendChild(newNode);
  }
}
class ElementList {
  constructor(parent) {
    this.items = [];
    this.owner = parent;
  }
  _createNode(element, index = 0) {
    return typeof element === "object" && element !== null ? new ElementNode(element, this.owner, index) : new TextNode(element == null ? "" : String(element), this.owner);
  }
  _moveDomElement(node, index) {
    if (!this.owner || !this.owner.domElement) return;
    const dom = this.owner.domElement;
    const el = node instanceof ElementNode ? node.domElement : node.domText;
    if (el) {
      const currentRef = dom.childNodes[index] || null;
      if (el !== currentRef) {
        dom.insertBefore(el, currentRef);
      }
    }
  }
  _swapDomElement(aNode, bNode) {
    if (!this.owner || !this.owner.domElement) return;
    const parent = this.owner.domElement;
    const a = aNode instanceof ElementNode ? aNode.domElement : aNode.domText;
    const b = bNode instanceof ElementNode ? bNode.domElement : bNode.domText;
    if (!a || !b) return;
    const aNext = a.nextSibling;
    const bNext = b.nextSibling;
    parent.insertBefore(a, bNext);
    parent.insertBefore(b, aNext);
  }
  update(inputs, updateDom = true, silent = false) {
    var _a, _b, _c, _d;
    const oldItems = this.items.slice();
    const keyed = /* @__PURE__ */ new Map();
    for (const item of oldItems) {
      if (item instanceof ElementNode && item.key !== null && item.key !== void 0) {
        keyed.set(item.key, item);
      }
    }
    if (!silent && this.owner.domElement) (_b = (_a = this.owner._hooks) == null ? void 0 : _a.BeforeUpdate) == null ? void 0 : _b.call(_a, this.owner, inputs);
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const key = typeof input === "object" && input !== null ? input._key : void 0;
      if (key !== void 0) {
        const reused = keyed.get(key);
        if (reused) {
          keyed.delete(key);
          const cur = this.items.indexOf(reused);
          if (cur !== i && cur >= 0) {
            const isPortal = reused instanceof ElementNode && !!reused._portal;
            this.move(cur, i, isPortal ? false : updateDom, true);
          }
          reused.parent = this.owner;
          continue;
        }
      }
      this.insert(input, i, updateDom, true);
    }
    while (this.items.length > inputs.length) {
      this.remove(this.items[this.items.length - 1], updateDom, true);
    }
    keyed.forEach((node) => this.remove(node, updateDom, true));
    if (!silent) (_d = (_c = this.owner._hooks) == null ? void 0 : _c.Update) == null ? void 0 : _d.call(_c, this.owner);
  }
  insert(input, index, updateDom = true, silent = false) {
    let length = this.items.length;
    const finalIndex = typeof index !== "number" || isNaN(index) || index < 0 || index > length ? length : index;
    const item = this._createNode(input, finalIndex);
    this.items.splice(finalIndex, 0, item);
    if (item instanceof ElementNode) {
      item._hooks.Insert && item._hooks.Insert(item);
      let domElement = this.owner.domElement;
      if (updateDom && domElement) {
        if (item._portal) {
          let domElement2 = item._portal(this.owner.getRoot());
          domElement2 && item.render(domElement2);
        } else {
          let domNode = item._createDOMNode();
          const ref = domElement.childNodes[finalIndex] ?? null;
          domElement.insertBefore(domNode, ref);
          let root = domElement.getRootNode();
          const styleParent = root instanceof ShadowRoot ? root : document.head;
          let domStyle = ensureDomStyle(styleParent);
          item.styles.render(domStyle);
          item._hooks.Mount && item._hooks.Mount(item);
          item.children.items.forEach((child) => {
            if (child instanceof ElementNode && child._portal) {
              let dom = child._portal(child.getRoot());
              dom && child.render(dom);
            } else {
              child.render(domNode);
            }
          });
        }
      }
    } else {
      let domElement = this.owner.domElement;
      if (updateDom && domElement) {
        let domNode = item._createDOMNode();
        const ref = domElement.childNodes[finalIndex] ?? null;
        domElement.insertBefore(domNode, ref);
      }
    }
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
    return item;
  }
  remove(item, updateDom = true, silent = false) {
    const index = this.items.indexOf(item);
    if (index < 0) return;
    if (item instanceof ElementNode) {
      const done = () => {
        var _a, _b;
        const el = item.domElement;
        this.items.splice(index, 1);
        updateDom && el && el.remove();
        (_b = (_a = item._hooks) == null ? void 0 : _a.Remove) == null ? void 0 : _b.call(_a, item);
        item._dispose();
      };
      if (item._hooks && item._hooks.BeforeRemove && item.domElement) {
        item._hooks.BeforeRemove(item, done);
      } else {
        done();
      }
    } else {
      const el = item.domText;
      this.items.splice(index, 1);
      updateDom && el && el.remove();
      item._dispose();
    }
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
  }
  clear(updateDom = true, silent = false) {
    if (this.items.length === 0) return;
    const snapshot = this.items.slice();
    for (const item of snapshot) {
      this.remove(item, updateDom, true);
    }
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
  }
  _dispose() {
    this.items = [];
  }
  swap(aIndex, bIndex, updateDom = true, silent = false) {
    if (aIndex < 0 || bIndex < 0 || aIndex >= this.items.length || bIndex >= this.items.length || aIndex === bIndex) return;
    const itemA = this.items[aIndex];
    const itemB = this.items[bIndex];
    this.items[aIndex] = itemB;
    this.items[bIndex] = itemA;
    if (updateDom) this._swapDomElement(itemA, itemB);
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
  }
  move(fromIndex, toIndex, updateDom = true, silent = false) {
    if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length || fromIndex === toIndex) return;
    const item = this.items[fromIndex];
    this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);
    if (updateDom) this._moveDomElement(item, toIndex);
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
  }
  generateHTML() {
    let html = "";
    for (const item of this.items) html += item.generateHTML();
    return html;
  }
}
class StyleProperty {
  constructor(name, value, parentRule) {
    this.value = "";
    this.name = name;
    this.cssName = camelToKebab(name);
    this.parentRule = parentRule;
    this.set(value);
  }
  _domUpdate() {
    if (!this.parentRule) return;
    const domRule = this.parentRule.domRule;
    if (domRule && domRule.style) {
      let style = domRule.style;
      style.setProperty(this.cssName, String(this.value));
      if (PrefixCSS[this.name]) {
        PrefixCSS[this.name].forEach((prefix) => {
          style.setProperty(`-${prefix}-${this.cssName}`, String(this.value));
        });
      }
    }
  }
  _dispose() {
    this.value = "";
    this.parentRule = null;
  }
  set(value) {
    if (typeof value === "function") {
      let Listener = () => {
        if (!Listener) return;
        this.value = value(Listener);
        this._domUpdate();
      };
      Listener.onSubscribe = (release) => {
        var _a;
        (_a = this.parentRule.parentNode) == null ? void 0 : _a.addHook("BeforeRemove", () => {
          release();
          Listener = null;
        });
      };
      Listener.elementNode = this.parentRule.root;
      this.value = value(Listener);
    } else {
      this.value = value;
    }
    this._domUpdate();
  }
  remove() {
    if (!this.parentRule) return;
    if (this.parentRule.domRule instanceof CSSStyleRule) {
      const domStyle = this.parentRule.domRule.style;
      domStyle.removeProperty(this.cssName);
      if (PrefixCSS[this.name]) {
        PrefixCSS[this.name].forEach((prefix) => {
          domStyle.removeProperty(`-${prefix}-${this.cssName}`);
        });
      }
    }
    delete this.parentRule.styleBlock[this.name];
    this._dispose();
  }
  cssText() {
    let str = `${this.cssName}: ${this.value}`;
    if (PrefixCSS[this.name]) {
      PrefixCSS[this.name].forEach((prefix) => {
        str += `; -${prefix}-${this.cssName}: ${this.value}`;
      });
    }
    return str;
  }
}
class StyleRule {
  constructor(selectorText, parent) {
    this.domRule = null;
    this.styleBlock = {};
    this.selectorText = selectorText;
    this.styleList = new StyleList(this);
    this.parent = parent;
  }
  _dispose() {
    if (this.styleBlock) {
      for (const prop of Object.values(this.styleBlock)) {
        prop._dispose();
      }
    }
    if (this.styleList) {
      this.styleList._dispose();
    }
    this.styleBlock = null;
    this.styleList = null;
    this.domRule = null;
    this.parent = null;
  }
  get root() {
    let node = this.parent;
    while (node instanceof StyleRule) {
      node = node.parent;
    }
    return node;
  }
  get parentNode() {
    let root = this.parent;
    while (root && root instanceof StyleRule) {
      root = root.parent;
    }
    return root;
  }
  insertStyle(name, val) {
    if (!this.styleBlock) return;
    if (this.styleBlock[name]) {
      this.styleBlock[name].set(val);
    } else {
      this.styleBlock[name] = new StyleProperty(name, val, this);
    }
  }
  removeStyle(name) {
    if (!this.styleBlock) return;
    if (this.styleBlock[name]) {
      this.styleBlock[name].remove();
    }
  }
  cssText() {
    if (!this.styleBlock || !this.styleList) return "";
    const styleStr = Object.values(this.styleBlock).map((decl) => decl.cssText()).join(";");
    const nested = this.styleList.cssText();
    return `${this.selectorText} { ${styleStr} ${nested} } `;
  }
  mount(domRule) {
    if (!domRule || !this.styleList) return;
    this.domRule = domRule;
    if ("cssRules" in domRule) {
      this.styleList.mount(domRule.cssRules);
    }
  }
  remove() {
    if (this.domRule && this.domRule.parentStyleSheet) {
      const sheet = this.domRule.parentStyleSheet;
      const rules = sheet.cssRules;
      for (let i = 0; i < rules.length; i++) {
        if (rules[i] === this.domRule) {
          sheet.deleteRule(i);
          break;
        }
      }
    }
    this._dispose();
  }
  render(domSheet) {
    if (!this.styleBlock || !this.styleList) return;
    const styleStr = Object.values(this.styleBlock).map((decl) => decl.cssText()).join(";");
    try {
      if (!this.selectorText.startsWith("@")) {
        const css = `${this.selectorText} { ${styleStr} }`;
        const index = domSheet.insertRule(css, domSheet.cssRules.length);
        const domRule = domSheet.cssRules[index];
        if (domRule && "selectorText" in domRule) {
          this.mount(domRule);
        }
      } else if (/^@(media|supports|container|layer)\b/.test(this.selectorText)) {
        const index = domSheet.insertRule(`${this.selectorText} {}`, domSheet.cssRules.length);
        const domRule = domSheet.cssRules[index];
        if ("cssRules" in domRule) {
          this.mount(domRule);
          this.styleList.render(domRule);
        }
      } else if (this.selectorText.startsWith("@keyframes") || this.selectorText.startsWith("@font-face")) {
        const css = this.cssText();
        const index = domSheet.insertRule(css, domSheet.cssRules.length);
        const domRule = domSheet.cssRules[index];
        this.mount(domRule);
      }
    } catch (err) {
      console.warn("Failed to insert rule:", this.selectorText, err);
    }
  }
}
class StyleList {
  constructor(parent) {
    this.items = [];
    this.domStyle = null;
    this.parent = parent;
  }
  get parentNode() {
    let root = this.parent;
    while (root && root instanceof StyleRule) {
      root = root.parent;
    }
    return root;
  }
  addCSS(obj, parentSelector = "") {
    if (!this.items || !this.parent) return;
    const basic = {};
    function getSelector(selector, prev) {
      return selector.startsWith("&") ? `${prev}${selector.slice(1)}` : `${prev} ${selector}`;
    }
    for (const selector in obj) {
      const value = obj[selector];
      let splitKeys = selectorSplitter(selector);
      for (let key of splitKeys) {
        const currentSelector = getSelector(key, parentSelector);
        if (/^@(container|layer|supports|media)\b/.test(key)) {
          if (typeof value === "object" && value != null) {
            const rule = new StyleRule(key, this.parent);
            rule.styleList.addCSS(value, parentSelector);
            this.items.push(rule);
          }
        } else if (key.startsWith("@keyframes")) {
          const rule = new StyleRule(key, this.parent);
          rule.styleList.addCSS(value, "");
          this.items.push(rule);
        } else if (key.startsWith("@font-face")) {
          const rule = new StyleRule(key, this.parent);
          for (const k in value) rule.insertStyle(k, value[k]);
          this.items.push(rule);
        } else if (typeof value === "object" && value != null) {
          const rule = new StyleRule(currentSelector, this.parent);
          this.items.push(rule);
          for (const [k, v] of Object.entries(value)) {
            if (typeof v === "object" && v != null) {
              let newSelector = getSelector(k, currentSelector);
              if (k.startsWith("&")) {
                this.addCSS(v, newSelector);
              } else {
                const r = rule.styleList.insertRule(newSelector);
                r.styleList.addCSS(v, newSelector);
              }
            } else {
              rule.insertStyle(k, v);
            }
          }
        } else {
          basic[key] = value;
        }
      }
    }
    if (Object.keys(basic).length) {
      const rule = new StyleRule(parentSelector, this.parent);
      for (const key in basic) rule.insertStyle(key, basic[key]);
      this.items.push(rule);
    }
  }
  cssText() {
    if (!this.items) return "";
    return this.items.map((rule) => rule.cssText()).join("");
  }
  insertRule(selector) {
    if (!this.items || !this.parent) return null;
    let rule = this.items.find((rule2) => rule2.selectorText === selector);
    if (!rule) {
      rule = new StyleRule(selector, this.parent);
      this.items.push(rule);
    }
    return rule;
  }
  mount(domRuleList) {
    if (!this.items) return;
    if (!domRuleList) throw Error("Require domRuleList argument");
    let wrongCount = 0;
    const fixOddEven = (css) => css.replace("(odd)", "(2n+1)").replace("(even)", "(2n)");
    this.items.forEach((rule, i) => {
      const index = i - wrongCount;
      const domRule = domRuleList[index];
      if (!domRule) return;
      if (rule.selectorText.startsWith("@") && domRule instanceof CSSKeyframesRule) {
        rule.mount(domRule);
      } else if ("keyText" in domRule) {
        rule.mount(domRule);
      } else if ("selectorText" in domRule) {
        if (domRule.selectorText !== fixOddEven(rule.selectorText)) {
          wrongCount += 1;
        } else {
          rule.mount(domRule);
        }
      } else if ("cssRules" in domRule) {
        rule.mount(domRule);
      }
    });
  }
  render(dom) {
    if (dom instanceof HTMLStyleElement) {
      this.domStyle = dom;
      this.items.forEach((rule) => rule.render(dom.sheet));
    } else if (dom instanceof CSSGroupingRule) {
      this.items.forEach((rule) => rule.render(dom));
    }
  }
  _dispose() {
    if (this.items) {
      for (let i = 0; i < this.items.length; i++) {
        this.items[i]._dispose();
      }
    }
    this.items = [];
    this.parent = null;
    this.domStyle = null;
  }
}
class ElementNode {
  constructor(domphyElement, _parent = null, index = 0) {
    var _a;
    this.type = "ElementNode";
    this.parent = null;
    this.children = new ElementList(this);
    this.styles = new StyleList(this);
    this.attributes = new AttributeList(this);
    this.domElement = null;
    this._hooks = {};
    this._events = null;
    this._context = {};
    this._metadata = {};
    this.key = null;
    domphyElement = deepClone(domphyElement);
    validate(domphyElement);
    domphyElement.style = domphyElement.style || {};
    this.parent = _parent;
    this.tagName = getTagName(domphyElement);
    domphyElement = mergePartial(domphyElement);
    this.key = domphyElement._key ?? null;
    this._context = domphyElement._context || {};
    this._metadata = domphyElement._metadata || {};
    let tempPath = `${(_a = this.parent) == null ? void 0 : _a.getPath()}.${index}`;
    const str = JSON.stringify(domphyElement.style || {}, (k, v) => typeof v === "function" ? tempPath : v);
    this.nodeId = hashString(tempPath + str);
    this.attributes.addClass(`${this.tagName}_${this.nodeId}`);
    if (domphyElement._onSchedule) domphyElement._onSchedule(this, domphyElement);
    this.merge(domphyElement);
    const children = domphyElement[this.tagName];
    if (children != null && children != void 0) {
      if (typeof children === "function") {
        let listener = () => {
          let input = children(listener);
          this.children.update(Array.isArray(input) ? input : [input]);
        };
        listener.elementNode = this;
        listener.onSubscribe = (release) => this.addHook("BeforeRemove", () => {
          release();
          listener = null;
        });
        listener && listener();
      } else {
        this.children.update(Array.isArray(children) ? children : [children]);
      }
    }
    this._hooks.Init && this._hooks.Init(this);
  }
  _createDOMNode() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svgTags = [
      "svg",
      "circle",
      "path",
      "rect",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "g",
      "defs",
      "use",
      "symbol",
      "linearGradient",
      "radialGradient",
      "stop",
      "clipPath",
      "mask",
      "filter",
      "text",
      "tspan",
      "textPath",
      "image",
      "pattern",
      "marker",
      "animate",
      "animateTransform",
      "animateMotion",
      "feGaussianBlur",
      "feComposite",
      "feColorMatrix",
      "feMerge",
      "feMergeNode",
      "feOffset",
      "feFlood",
      "feBlend",
      "foreignObject"
    ];
    let node = svgTags.includes(this.tagName) ? document.createElementNS(svgNamespace, this.tagName) : document.createElement(this.tagName);
    this.domElement = node;
    if (this._events) {
      for (const key in this._events) {
        const eventName = key;
        const handler = this._events[eventName];
        let fn = (event) => handler(event, this);
        node.addEventListener(eventName, fn);
        this.addHook("BeforeRemove", (n) => {
          n.domElement.removeEventListener(eventName, fn);
          fn = null;
        });
      }
    }
    if (this.attributes) {
      Object.values(this.attributes.items).forEach((attr) => attr.render());
    }
    return node;
  }
  _dispose() {
    if (this.children) {
      this.children._dispose();
    }
    if (this.styles) {
      this.styles.items.forEach((rule) => rule.remove());
      this.styles._dispose();
    }
    if (this.attributes) {
      this.attributes._dispose();
    }
    this.domElement = null;
    this._hooks = {};
    this._events = null;
    this._context = {};
    this._metadata = {};
    this.parent = null;
  }
  get pathId() {
    return hashString(this.getPath());
  }
  merge(part) {
    merge(this._context, part._context);
    merge(this._metadata, part._metadata);
    const keys = Object.keys(part);
    for (let i = 0; i < keys.length; i++) {
      const originalKey = keys[i];
      const value = part[originalKey];
      if (["$", "_onSchedule", "_key", "_context", "_metadata", "style", this.tagName].includes(originalKey)) {
        continue;
      } else if (["_onInit", "_onInsert", "_onMount", "_onBeforeUpdate", "_onUpdate", "_onBeforeRemove", "_onRemove"].includes(originalKey)) {
        this.addHook(originalKey.substring(3), value);
      } else if (originalKey.startsWith("on")) {
        this.addEvent(originalKey.substring(2).toLowerCase(), value);
      } else if (originalKey == "_portal") {
        this._portal = value;
      } else if (originalKey == "class" && typeof value === "string") {
        this.attributes.addClass(value);
      } else {
        this.attributes.set(originalKey, value);
      }
    }
    if (part.style) {
      this.styles.addCSS(part.style || {}, `.${`${this.tagName}_${this.nodeId}`}`);
    }
  }
  getPath() {
    let path = [];
    let node = this;
    while (node && node.parent) {
      const parent = node.parent;
      const index = parent.children.items.indexOf(node);
      path.push(index);
      node = parent;
    }
    return path.reverse().join(".");
  }
  addEvent(name, callback) {
    this._events = this._events || {};
    let current = this._events[name];
    if (typeof current == "function") {
      this._events[name] = (event, node) => {
        current(event, node);
        callback(event, node);
      };
    } else {
      this._events[name] = callback;
    }
  }
  addHook(name, callback) {
    const current = this._hooks[name];
    if (typeof current === "function") {
      this._hooks[name] = (...args) => {
        current(...args);
        callback(...args);
      };
    } else {
      this._hooks[name] = callback;
    }
  }
  getRoot() {
    let root = this;
    while (root && root instanceof ElementNode && root.parent) {
      root = root.parent;
    }
    return root;
  }
  getContext(name) {
    let node = this;
    while (node && (!node._context || !Object.prototype.hasOwnProperty.call(node._context, name))) {
      node = node.parent;
    }
    return node && node._context ? node._context[name] : void 0;
  }
  setContext(name, value) {
    this._context = this._context || {};
    this._context[name] = value;
  }
  getMetadata(name) {
    return this._metadata ? this._metadata[name] : void 0;
  }
  setMetadata(key, value) {
    this._metadata = this._metadata || {};
    this._metadata[key] = value;
  }
  generateCSS() {
    if (!this.styles || !this.children) return "";
    let css = this.styles.cssText();
    css += this.children.items.map((child) => child instanceof ElementNode ? child.generateCSS() : "").join("");
    return css;
  }
  generateHTML() {
    if (!this.children || !this.attributes) return "";
    let content = this.children.generateHTML();
    const attributes = this.attributes.generateHTML();
    return `<${this.tagName}${attributes}>${content}</${this.tagName}>`;
  }
  mount(domElement, domStyle) {
    if (!domElement) throw new Error("Missing dom node on bind");
    this.domElement = domElement;
    if (this._events) {
      for (const key in this._events) {
        const eventName = key;
        const handler = this._events[eventName];
        let fn = (event) => handler(event, this);
        domElement.addEventListener(eventName, fn);
        this.addHook("BeforeRemove", (n) => {
          n.domElement.removeEventListener(eventName, fn);
          fn = null;
        });
      }
    }
    if (this.children) {
      this.children.items.forEach((child, i) => {
        const childNode = domElement.childNodes[i];
        if (childNode instanceof Node && child instanceof ElementNode) {
          child.mount(childNode, domStyle);
        }
      });
    }
    this._hooks.Mount && this._hooks.Mount(this);
  }
  render(domElement, domStyle = null) {
    const newNode = this._createDOMNode();
    domElement.appendChild(newNode);
    this._hooks.Mount && this._hooks.Mount(this);
    domStyle || (domStyle = this.getRoot().styles.domStyle);
    let root = domElement.getRootNode();
    const styleParent = root instanceof ShadowRoot ? root : document.head;
    domStyle || (domStyle = ensureDomStyle(styleParent));
    this.styles.render(domStyle);
    this.children.items.forEach((child) => {
      if (child instanceof ElementNode && child._portal) {
        let dom = child._portal(this.getRoot());
        dom && child.render(dom);
      } else {
        child.render(newNode);
      }
    });
    return newNode;
  }
  remove() {
    var _a;
    if (this.parent) {
      this.parent.children.remove(this);
    } else {
      (_a = this.domElement) == null ? void 0 : _a.remove();
      this._dispose();
    }
  }
}
let light$1 = {
  direction: "darken",
  colors: {
    highlight: ["#ffffff", "#fcf4d6", "#fddc69", "#f1c21b", "#d2a106", "#b28600", "#8e6a00", "#684e00", "#483700", "#302400", "#1c1500", "#000000"],
    warning: ["#ffffff", "#fff2e8", "#ffd9be", "#ffb784", "#ff832b", "#eb6200", "#ba4e00", "#8a3800", "#5e2900", "#3e1a00", "#231000", "#000000"],
    error: ["#ffffff", "#fff1f1", "#ffd7d9", "#ffb3b8", "#ff8389", "#fa4d56", "#da1e28", "#a2191f", "#750e13", "#520408", "#2d0709", "#000000"],
    danger: ["#ffffff", "#fff1f1", "#ffd7d9", "#ffb3b8", "#ff8389", "#fa4d56", "#da1e28", "#a2191f", "#750e13", "#520408", "#2d0709", "#000000"],
    secondary: ["#ffffff", "#fff0f7", "#ffd6e8", "#ffafd2", "#ff7eb6", "#ee5396", "#d02670", "#9f1853", "#740937", "#510224", "#2a0a18", "#000000"],
    primary: ["#ffffff", "#edf5ff", "#d0e2ff", "#a6c8ff", "#78a9ff", "#4589ff", "#0f62fe", "#0043ce", "#002d9c", "#001d6c", "#001141", "#000000"],
    info: ["#ffffff", "#e5f6ff", "#bae6ff", "#82cfff", "#33b1ff", "#1192e8", "#0072c3", "#00539a", "#003a6d", "#012749", "#061727", "#000000"],
    success: ["#ffffff", "#defbe6", "#a7f0ba", "#6fdc8c", "#42be65", "#24a148", "#198038", "#0e6027", "#044317", "#022d0d", "#071908", "#000000"],
    neutral: ["#ffffff", "#f4f4f4", "#e0e0e0", "#c6c6c6", "#a8a8a8", "#8d8d8d", "#6f6f6f", "#525252", "#393939", "#262626", "#161616", "#000000"]
  },
  baseTones: {
    highlight: 3,
    warning: 4,
    error: 5,
    secondary: 5,
    primary: 6,
    info: 5,
    success: 5,
    neutral: 5
  },
  fontSizes: ["0.75rem", "0.875rem", "1rem", "1.25rem", "1.5625rem", "1.9375rem", "2.4375rem", "3.0625rem"],
  // pixels: 12 | 14 | 16 | 20 | 25 | 31 | 39 | 49
  custom: {}
};
const themes = {
  light: JSON.parse(JSON.stringify(light$1)),
  dark: createDark(light$1)
};
function validateTheme(partial) {
  for (let key in partial) {
    if (!Object.keys(light$1).includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
  if (partial.fontSizes && !Array.isArray(partial.fontSizes)) {
    throw new Error(`fontSize must be array of string`);
  }
  if ("custom" in partial) {
    const custom = partial.custom;
    if (typeof custom !== "object" || custom === null) {
      throw new Error(`Invalid custom property: must be an object`);
    }
  }
}
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      target[key] ?? (target[key] = {});
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
function buildThemeCSS(name, input) {
  const styles = {};
  for (const key in input) {
    const value = input[key];
    if (key === "colors") {
      for (const colorName in input.colors) {
        [...Array(12).keys()].forEach(
          (i) => styles[`--${colorName}-${i}`] = input.colors[colorName][i]
        );
      }
    } else if (key === "fontSizes") {
      [...Array(8).keys()].forEach(
        (i) => styles[`--fontSize-${i}`] = input.fontSizes[i]
      );
    } else {
      if (typeof value === "object" && value !== null) {
        for (const k in value) {
          styles[`--${key}-${k.replace("/", "_")}`] = value[k];
        }
      }
    }
  }
  let text = "";
  for (const prop in styles) {
    text += `  ${prop}: ${styles[prop]};
`;
  }
  return `[data-theme="${name}"] {
${text}}`;
}
function getTheme(name) {
  if (!themes[name]) throw Error(`Theme "${name}" not found`);
  return themes[name];
}
function setTheme(name, input) {
  validateTheme(input);
  if (!themes[name]) themes[name] = structuredClone(light$1);
  deepMerge(themes[name], input);
}
function createDark(source) {
  let dark2 = structuredClone(source);
  dark2.direction = "lighten";
  for (let name in dark2.colors) {
    dark2.colors[name].reverse();
    dark2.baseTones[name] = 12 - 1 - dark2.baseTones[name];
  }
  return dark2;
}
function themeTokens(name) {
  let input = getTheme(name);
  let tokens = {};
  for (const key in input) {
    const value = input[key];
    if (key === "colors") {
      for (const name2 in input.colors) {
        let colorTones = {};
        [...Array(12).keys()].forEach((i) => colorTones[i] = input.colors[name2][i]);
        tokens[name2] = colorTones;
      }
    } else if (key === "fontSizes") {
      tokens.fontSizes = input.fontSizes;
    } else {
      tokens[key] = {};
      if (typeof value === "object" && value !== null) {
        for (const k in value) {
          tokens[key][k] = value[k];
        }
      }
    }
  }
  return tokens;
}
function themeVars() {
  let input = getTheme("light");
  let theme = {};
  for (const key in input) {
    const section = key;
    const value = input[key];
    if (key === "colors") {
      for (const name in input.colors) {
        let colorTones = {};
        [...Array(12).keys()].forEach((i) => colorTones[i] = `var(--${name}-${i})`);
        theme[name] = colorTones;
      }
    } else if (key === "fontSizes") {
      theme.fontSizes = [...Array(8).keys()].map((i) => `var(--fontSize-${i})`);
    } else {
      theme[section] = {};
      if (typeof value === "object" && value !== null) {
        for (const k in value) {
          theme[section][k] = `var(--${section}-${k.replace("/", "_")})`;
        }
      }
    }
  }
  return theme;
}
function themeCSS() {
  return Object.entries(themes).map(([name, input]) => buildThemeCSS(name, input)).join("\n");
}
function themeApply(el) {
  if (typeof document === "undefined") return;
  if (el) {
    el.textContent = themeCSS();
    return;
  } else {
    el = document.getElementById("domphy-themes") ?? Object.assign(document.createElement("style"), { id: "domphy-themes" });
    el.textContent = themeCSS();
    document.head.appendChild(el);
  }
}
function themeSpacing(n) {
  return n / 4 + "em";
}
function themeName(object) {
  let elementNode = typeof object == "function" ? object.elementNode : object;
  let node = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTheme"))) {
    node = node.parent;
  }
  let themeName2 = "light";
  if (node.attributes && node.attributes.has("dataTheme")) {
    themeName2 = node.attributes.get("dataTheme");
    typeof object == "function" && node.attributes.onChange("dataTheme", object);
  }
  return themeName2;
}
const ElementSizes = ["inherit"];
[...Array(8).keys()].forEach((i) => {
  ElementSizes.push(`decrease-${i}`);
  ElementSizes.push(`increase-${i}`);
});
function offsetSize(origin, size = "inherit") {
  if (!ElementSizes.includes(size)) {
    throw Error(`size name "${size}" invalid`);
  }
  let resultSize;
  if (size == "inherit") {
    resultSize = origin;
  } else if (size == null ? void 0 : size.startsWith("increase-")) {
    let offset = parseInt(size.replace("increase-", ""), 10);
    resultSize = origin + offset;
  } else if (size == null ? void 0 : size.startsWith("decrease-")) {
    let offset = parseInt(size.replace("decrease-", ""), 10);
    resultSize = origin - offset;
  } else {
    resultSize = origin;
  }
  return Math.max(0, Math.min(8, resultSize));
}
function contextSize(object) {
  if (!object) return 2;
  let elementNode = typeof object == "function" ? object.elementNode : object;
  let node = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataSize"))) {
    node = node.parent;
  }
  let size = 2;
  if (node && node.attributes && node.attributes.has("dataSize")) {
    size = offsetSize(size, node.attributes.get("dataSize"));
    typeof object == "function" && node.attributes.onChange("dataSize", object);
  }
  return size;
}
function themeSize(object, size = "inherit") {
  let index = offsetSize(contextSize(object), size);
  return themeVars().fontSizes[index];
}
const TONE_STEPS = 12;
const ElementTones = ["inherit", "base"];
[...Array(TONE_STEPS).keys()].forEach((i) => {
  ElementTones.push(`decrease-${i}`);
  ElementTones.push(`increase-${i}`);
  ElementTones.push(`shift-${i}`);
});
function adjustTone(tone, level) {
  if (tone < 0 || tone > TONE_STEPS - 1) return tone;
  let newIndex = tone + level;
  newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
  return newIndex;
}
function shiftTone(tone, level) {
  if (tone < 0 || tone > TONE_STEPS - 1) return tone;
  let newIndex = tone <= 5 ? tone + level : tone - level;
  newIndex = newIndex < 0 || newIndex > TONE_STEPS - 1 ? -newIndex : newIndex;
  newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
  return newIndex;
}
function offsetTone(originTone, tone = "inherit") {
  if (typeof tone == "number") return tone;
  if (tone == "inherit") return originTone;
  if (!ElementTones.includes(tone)) {
    throw Error(`tone name "${tone}" invalid`);
  }
  if (tone.startsWith("increase-")) {
    let offset = parseInt(tone.replace("increase-", ""), 10);
    return adjustTone(originTone, offset);
  } else if (tone.startsWith("decrease-")) {
    let offset = parseInt(tone.replace("decrease-", ""), 10);
    return adjustTone(originTone, -offset);
  } else if (tone.startsWith("shift-")) {
    let offset = parseInt(tone.replace("shift-", ""), 10);
    return shiftTone(originTone, offset);
  } else {
    return originTone;
  }
}
function contextTone(object) {
  if (!object) return 0;
  let elementNode = typeof object == "function" ? object.elementNode : object;
  let node = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTone"))) {
    node = node.parent;
  }
  let tone = 0;
  if (node && node.attributes && node.attributes.has("dataTone")) {
    tone = offsetTone(tone, node.attributes.get("dataTone"));
    typeof object == "function" && node.attributes.onChange("dataTone", object);
  }
  return tone;
}
function themeTone(object, tone = "inherit") {
  return offsetTone(contextTone(object), tone);
}
function contextColor(object, tone = "inherit", color = "inherit") {
  let elementNode = typeof object == "function" ? object.elementNode : object;
  let themeColor2 = color == "inherit" ? elementNode.getContext("themeColor") || "neutral" : color;
  let resultTone;
  if (tone == "base") {
    resultTone = getTheme(themeName(object)).baseTones[themeColor2];
  } else {
    resultTone = offsetTone(contextTone(object), tone);
  }
  let resultColor = themeVars()[themeColor2][resultTone];
  return resultColor;
}
function themeColor(object, tone = "inherit", color = "inherit") {
  let themeColor2 = color == "inherit" ? "neutral" : color;
  if (!object) {
    return themeVars()[themeColor2][offsetTone(0, tone)];
  }
  let resultTone;
  if (tone == "base") {
    resultTone = getTheme(themeName(object)).baseTones[themeColor2];
  } else {
    resultTone = themeTone(object, tone);
  }
  let resultColor = themeVars()[themeColor2][resultTone];
  return resultColor;
}
function icon() {
  return {
    _onInsert: (node) => {
      if (node.tagName != "span") {
        console.warn(`"icon" primitive patch should use span tag`);
      }
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      verticalAlign: "middle",
      width: themeSpacing(6),
      height: themeSpacing(6)
    }
  };
}
const keyframes = { to: { transform: "rotate(360deg)" } };
const animationName = hashString(JSON.stringify(keyframes));
function spinner(props = {}) {
  const { color = "neutral" } = props;
  return {
    role: "status",
    ariaLabel: "loading",
    _onInsert: (node) => {
      if (node.tagName != "span") {
        console.warn(`"spinner" patch must use span tag`);
      }
    },
    style: {
      display: "inline-block",
      margin: 0,
      flexShrink: 0,
      width: themeSpacing(6),
      height: themeSpacing(6),
      borderRadius: "50%",
      border: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-3", color)}`,
      borderTopColor: (listener) => themeColor(listener, "shift-6", color),
      boxSizing: "border-box",
      padding: 0,
      animation: `${animationName} 0.7s linear infinite`,
      [`@keyframes ${animationName}`]: keyframes
    }
  };
}
const dark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-bulb-off"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M11.089 7.083a5 5 0 0 1 5.826 5.84m-1.378 2.611a5.012 5.012 0 0 1 -.537 .466a3.5 3.5 0 0 0 -1 3a2 2 0 1 1 -4 0a3.5 3.5 0 0 0 -1 -3a5 5 0 0 1 -.528 -7.544" /><path d="M9.7 17h4.6" /><path d="M3 3l18 18" /></svg>`;
const light = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-bulb"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /><path d="M9.7 17l4.6 0" /></svg>`;
const fullscreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrows-maximize"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 4l4 0l0 4" /><path d="M14 10l6 -6" /><path d="M8 20l-4 0l0 -4" /><path d="M4 20l6 -6" /><path d="M16 20l4 0l0 -4" /><path d="M14 14l6 6" /><path d="M8 4l-4 0l0 4" /><path d="M4 4l6 6" /></svg>`;
const exit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrows-minimize"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 9l4 0l0 -4" /><path d="M3 3l6 6" /><path d="M5 15l4 0l0 4" /><path d="M3 21l6 -6" /><path d="M19 9l-4 0l0 -4" /><path d="M15 9l6 -6" /><path d="M19 15l-4 0l0 4" /><path d="M15 15l6 6" /></svg>`;
const gridOn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-table-dashed"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -14" /><path d="M3 10h18" /><path d="M10 3v18" /></svg>`;
const gridOff = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-table-off"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3h12a2 2 0 0 1 2 2v12m-.585 3.413a1.994 1.994 0 0 1 -1.415 .587h-14a2 2 0 0 1 -2 -2v-14c0 -.55 .223 -1.05 .583 -1.412" /><path d="M3 10h7m4 0h7" /><path d="M10 3v3m0 4v11" /><path d="M3 3l18 18" /></svg>`;
const Toolbar = (props) => {
  let { isDark, isFull, hasGrid } = props;
  isFull.onChange((val) => {
    var _a, _b;
    document.body.classList.toggle("fullscreen");
    (_a = document.querySelector(".VPNav")) == null ? void 0 : _a.classList.toggle("fullscreen");
    (_b = document.querySelector(".VPContent")) == null ? void 0 : _b.classList.toggle("has-sidebar");
    const root = document.documentElement;
    const body = document.body;
    if (val) {
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.height = "100%";
    } else {
      root.style.overflow = "";
      body.style.overflow = "";
      body.style.height = "";
    }
  });
  const toggleGrid = {
    span: (listener) => hasGrid.get(listener) ? gridOff : gridOn,
    onClick: () => hasGrid.set(!hasGrid.get()),
    $: [icon()]
  };
  const toggleTheme = {
    span: (listener) => isDark.get(listener) ? light : dark,
    onClick: () => isDark.set(!isDark.get()),
    $: [icon()]
  };
  const toggleScreen = {
    span: (listener) => isFull.get(listener) ? exit : fullscreen,
    onClick: () => isFull.set(!isFull.get()),
    $: [icon()]
  };
  return {
    div: [toggleGrid, toggleTheme, toggleScreen],
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: themeSpacing(3),
      padding: themeSpacing(1)
    }
  };
};
const Render = (element, checked, hasGrid) => {
  return {
    div: [element],
    dataTheme: (listener) => checked.get(listener) ? "dark" : "light",
    style: {
      color: (listener) => themeColor(listener, "shift-6"),
      backgroundColor: (listener) => themeColor(listener),
      padding: themeSpacing(8),
      overflow: "auto",
      height: "100%",
      "&::before": {
        content: '""',
        position: "absolute",
        pointerEvents: "none",
        inset: 0,
        backgroundImage: (listener) => hasGrid.get(listener) ? `linear-gradient(to bottom,rgba(255, 124, 124, 0.3) 0.5px, transparent 0.5px)` : "none",
        backgroundSize: `1px ${themeSpacing(8)}`
      },
      "&::after": {
        content: '""',
        position: "absolute",
        pointerEvents: "none",
        inset: 0,
        backgroundImage: (listener) => hasGrid.get(listener) ? `linear-gradient(to bottom,rgba(255, 122, 122, 0.3) 0.5px, transparent 0.5px)` : "none",
        backgroundSize: `1px ${themeSpacing(1)}`
      }
    }
  };
};
export {
  AttributeList as A,
  BooleanAttributes as B,
  CamelAttributes as C,
  ElementNode as E,
  HtmlTags as H,
  Notifier as N,
  PrefixCSS as P,
  Render as R,
  State as S,
  Toolbar as T,
  themeApply as a,
  ElementList as b,
  contextColor as c,
  createDark as d,
  themeCSS as e,
  themeColor as f,
  getTheme as g,
  hashString as h,
  themeName as i,
  themeSize as j,
  themeSpacing as k,
  themeTokens as l,
  merge as m,
  themeVars as n,
  icon as o,
  spinner as p,
  setTheme as s,
  toState as t
};
