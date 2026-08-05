"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // ../packages/core/src/constants/BooleanAttributes.ts
  var BooleanAttributes = [
    "allowFullScreen",
    "async",
    "autoFocus",
    "autoPlay",
    "checked",
    "compact",
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
    "inert",
    "download",
    "noModule",
    "paused",
    "autoPictureInPicture"
  ];

  // ../packages/core/src/constants/CamelAttributes.ts
  var CamelAttributes = [
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
    "maskUnits",
    "baseFrequency",
    "numOctaves",
    "xChannelSelector",
    "yChannelSelector",
    "stdDeviation",
    "colorInterpolationFilters",
    "pathLength"
  ];

  // ../packages/core/src/constants/HtmlAttributeNames.ts
  var HtmlAttributeNames = {
    // Rename, not just a case change.
    htmlFor: "for",
    // Boolean HTML attributes (BooleanAttributes.ts) with camelCase humps.
    allowFullScreen: "allowfullscreen",
    autoFocus: "autofocus",
    autoPlay: "autoplay",
    formNoValidate: "formnovalidate",
    isMap: "ismap",
    itemScope: "itemscope",
    noHref: "nohref",
    noShade: "noshade",
    noValidate: "novalidate",
    playsInline: "playsinline",
    trueSpeed: "truespeed",
    typeMustMatch: "typemustmatch",
    noModule: "nomodule",
    autoPictureInPicture: "autopictureinpicture",
    // Enumerated (yes/no, on/off, true/false) attributes — see
    // EnumeratedBooleanAttributes in classes/ElementAttribute.ts.
    autoCapitalize: "autocapitalize",
    contentEditable: "contenteditable",
    spellCheck: "spellcheck",
    // Multi-hump aria-* attributes — the ARIA spec hyphenates only after
    // "aria", so camelToKebab() would emit a bogus second hyphen
    // (ariaActiveDescendant -> aria-active-descendant, never recognized by
    // assistive technology). These are the only multi-hump names in the typed
    // GlobalAttributes list (types/GlobalAttributes.ts).
    ariaActiveDescendant: "aria-activedescendant",
    ariaColCount: "aria-colcount",
    ariaPosinSet: "aria-posinset",
    ariaSetSize: "aria-setsize",
    // Other global attributes.
    accessKey: "accesskey",
    enterKeyHint: "enterkeyhint",
    inputMode: "inputmode",
    itemId: "itemid",
    itemProp: "itemprop",
    itemRef: "itemref",
    itemType: "itemtype",
    tabIndex: "tabindex",
    writingSuggestions: "writingsuggestions",
    // Common non-boolean multi-word HTML attributes.
    charSet: "charset",
    hrefLang: "hreflang",
    crossOrigin: "crossorigin",
    aLink: "alink",
    bgColor: "bgcolor",
    vLink: "vlink",
    formAction: "formaction",
    formEncType: "formenctype",
    formMethod: "formmethod",
    formTarget: "formtarget",
    popoverTarget: "popovertarget",
    popoverTargetAction: "popovertargetaction",
    allowPaymentRequest: "allowpaymentrequest",
    allowUserMedia: "allowusermedia",
    frameBorder: "frameborder",
    longDesc: "longdesc",
    marginHeight: "marginheight",
    marginWidth: "marginwidth",
    referrerPolicy: "referrerpolicy",
    srcDoc: "srcdoc",
    hSpace: "hspace",
    fetchPriority: "fetchpriority",
    srcSet: "srcset",
    srcLang: "srclang",
    useMap: "usemap",
    vSpace: "vspace",
    dirName: "dirname",
    imageSizes: "imagesizes",
    imageSrcSet: "imagesrcset",
    classId: "classid",
    codeBase: "codebase",
    codeType: "codetype",
    valueType: "valuetype",
    shadowRootClonable: "shadowrootclonable",
    shadowRootDelegatesFocus: "shadowrootdelegatesfocus",
    shadowRootMode: "shadowrootmode",
    colSpan: "colspan",
    rowSpan: "rowspan",
    noWrap: "nowrap",
    vAlign: "valign",
    charOff: "charoff",
    maxLength: "maxlength",
    minLength: "minlength",
    autoComplete: "autocomplete",
    encType: "enctype",
    dateTime: "datetime"
  };

  // ../packages/core/src/constants/HtmlTags.ts
  var HtmlTags = [
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

  // ../packages/core/src/constants/PrefixCSS.ts
  var PrefixCSS = {
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

  // ../packages/core/src/constants/SvgTags.ts
  var SvgTags = [
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
    "feTurbulence",
    "feDisplacementMap",
    "feComponentTransfer",
    "feFuncR",
    "feFuncG",
    "feFuncB",
    "feFuncA",
    "foreignObject"
  ];

  // ../packages/core/src/constants/VoidTags.ts
  var VoidTags = [
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

  // ../packages/core/src/config.ts
  var _config = {};
  function getConfig() {
    return { ..._config };
  }
  __name(getConfig, "getConfig");

  // ../packages/core/src/types/EventProperties.ts
  var EventProperties = [
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
  var eventNameMap = EventProperties.reduce(
    (acc, ev) => {
      const key = ev.slice(2).toLowerCase();
      acc[key] = ev;
      return acc;
    },
    {}
  );

  // ../packages/core/src/classes/Notifier.ts
  var _chain = [];
  var _microtask = typeof queueMicrotask === "function" ? queueMicrotask : (cb) => {
    Promise.resolve().then(cb).catch((e) => {
      setTimeout(() => {
        throw e;
      }, 0);
    });
  };
  var SELF_NOTIFY_CAP = 100;
  var _batchDepth = 0;
  var _batchedNotifiers = /* @__PURE__ */ new Set();
  var _scheduledNotifiers = /* @__PURE__ */ new Set();
  var _deliveringNotifier = null;
  var Notifier = class {
    constructor() {
      // `Object.create(null)` avoids inheriting Object.prototype (`constructor`,
      // `toString`, `hasOwnProperty`, `__proto__`, ...): a plain `{}` would resolve
      // `this._listeners[event]` to an inherited value for those event names,
      // which is truthy but not a Set, crashing `.has`/`.add` on first subscribe.
      this._listeners = /* @__PURE__ */ Object.create(null);
      this._pending = /* @__PURE__ */ new Map();
      this._scheduled = false;
      // Args currently being delivered per event (used to detect a self-update fixpoint).
      this._flushing = /* @__PURE__ */ new Map();
      // Self-re-notification depth in the current settle burst (runaway guard).
      this._selfDepth = 0;
    }
    static {
      __name(this, "Notifier");
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
        throw new Error(
          "Event name must be a string, listener must be a function"
        );
      }
      if (!this._listeners[event]) {
        this._listeners[event] = /* @__PURE__ */ new Set();
      }
      const release = /* @__PURE__ */ __name(() => this.removeListener(event, listener), "release");
      if (this._listeners[event].has(listener)) return release;
      this._listeners[event].add(listener);
      if (typeof listener.onSubscribe === "function") {
        listener.onSubscribe(release);
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
          this._onEmpty?.(event);
        }
      }
    }
    // Number of listeners subscribed to an event. Used by `computed` to stay lazy:
    // an unobserved computed only marks itself dirty on a dependency change and
    // defers recomputation until the next read.
    listenerCount(event) {
      return this._listeners?.[event]?.size ?? 0;
    }
    notify(event, ...args) {
      if (!this._listeners) return;
      if (!this._listeners[event]) return;
      const top = _chain.length ? _chain[_chain.length - 1] : null;
      const selfReentry = !!top && top[0] === this && top[1] === event;
      if (selfReentry) {
        const inflight = this._flushing.get(event);
        if (inflight && inflight[0] === args[0]) return;
        if (this._selfDepth >= SELF_NOTIFY_CAP) {
          console.error(
            `[Domphy] Runaway self-update on "${event}" \u2014 stopped after ${SELF_NOTIFY_CAP} iterations`
          );
          return;
        }
        this._selfDepth++;
        this._pending.set(event, { args, chain: [] });
      } else {
        if (this._isCircular(event)) return;
        this._pending.set(event, { args, chain: [..._chain] });
      }
      if (_batchDepth > 0) {
        _batchedNotifiers.add(this);
      } else {
        this._scheduleFlush();
      }
    }
    // Schedule the microtask flush if one is not already pending. Idempotent, so a
    // batch flushing many notifiers (and concurrent direct notifies) never queues
    // two flushes for the same instance.
    _scheduleFlush() {
      if (this._scheduled) return;
      this._scheduled = true;
      _scheduledNotifiers.add(this);
      _microtask(() => this._flushAll());
    }
    _isCircular(event) {
      const idx = _chain.findIndex(([n, e]) => n === this && e === event);
      if (idx === -1) return false;
      const names = [..._chain.slice(idx).map(([, e]) => e), event];
      console.error(
        `[Domphy] Circular dependency detected:
  ${names.join(" \u2192 ")}`
      );
      return true;
    }
    _flushAll() {
      this._scheduled = false;
      _scheduledNotifiers.delete(this);
      const pending = this._pending;
      this._pending = /* @__PURE__ */ new Map();
      for (const [event, { args, chain }] of pending) {
        _chain = chain;
        this._flush(event, args);
      }
      _chain = [];
      if (this._pending.size === 0) this._selfDepth = 0;
    }
    _flush(event, args) {
      if (!this._listeners) return;
      const listeners = this._listeners[event];
      if (!listeners) return;
      _chain.push([this, event]);
      this._flushing.set(event, args);
      const prevDelivering = _deliveringNotifier;
      _deliveringNotifier = this;
      try {
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          try {
            listener(...args);
          } catch (e) {
            console.error(e);
          }
        }
      } finally {
        _deliveringNotifier = prevDelivering;
      }
      this._flushing.delete(event);
      _chain.pop();
    }
  };
  function hasPendingNotifiers() {
    return _scheduledNotifiers.size > 0;
  }
  __name(hasPendingNotifiers, "hasPendingNotifiers");
  function flushPendingNotifiers() {
    let guard = 0;
    while (_scheduledNotifiers.size > 0) {
      if (guard++ > 1e4) {
        console.error("[Domphy] flushSync: notifier queue did not settle");
        break;
      }
      const notifiers = [..._scheduledNotifiers];
      _scheduledNotifiers.clear();
      for (const notifier of notifiers) notifier._flushAll();
    }
  }
  __name(flushPendingNotifiers, "flushPendingNotifiers");

  // ../packages/core/src/classes/Collector.ts
  var COLLECTOR_STACK = [];
  var UNTRACK_DEPTH = 0;
  function activeCollector() {
    if (UNTRACK_DEPTH > 0) return null;
    return COLLECTOR_STACK.length ? COLLECTOR_STACK[COLLECTOR_STACK.length - 1] : null;
  }
  __name(activeCollector, "activeCollector");

  // ../packages/core/src/dev.ts
  var __DEV__ = typeof process !== "undefined" && process.env != null && false;

  // ../packages/core/src/classes/State.ts
  var State = class {
    constructor(initialValue, name = typeof initialValue) {
      this.name = name;
      this._isState = true;
      this._notifier = new Notifier();
      this.initialValue = initialValue;
      this._value = initialValue;
    }
    static {
      __name(this, "State");
    }
    get(listener) {
      if (listener) {
        this.addListener(listener);
      } else {
        const collector = activeCollector();
        if (collector) this.addListener(collector.handler);
      }
      return this._value;
    }
    set(newValue) {
      if (!this._notifier) {
        if (__DEV__) {
          console.warn(
            `[Domphy] State.set() called on a disposed state ("${this.name}") \u2014 the write is ignored. The state outlived its owner; keep a live reference or re-create it.`
          );
        }
        return;
      }
      this._value = newValue;
      this._notifier.notify(this.name, newValue);
    }
    reset() {
      this.set(this.initialValue);
    }
    addListener(listener) {
      if (!this._notifier) return () => {
      };
      return this._notifier.addListener(this.name, listener);
    }
    removeListener(listener) {
      if (!this._notifier) return;
      this._notifier.removeListener(this.name, listener);
    }
    _dispose() {
      if (this._notifier) {
        this._notifier._dispose();
        this._notifier = null;
      }
    }
  };

  // ../packages/core/src/utils.ts
  function merge(source = {}, target = {}) {
    const comma = [
      "animation",
      "transition",
      "boxShadow",
      "textShadow",
      "background",
      "fontFamily"
    ];
    const space = ["class", "rel", "transform", "acceptCharset", "sandbox"];
    const adjacent = ["content"];
    if (Object.prototype.toString.call(target) === "[object Object]" && Object.getPrototypeOf(target) === Object.prototype) {
      target = deepClone(target);
    }
    for (const key in target) {
      const value = target[key];
      if (value === void 0 || value === null) continue;
      if (typeof value === "object" && !Array.isArray(value)) {
        if (typeof source[key] === "object") {
          source[key] = merge(source[key], value);
        } else {
          source[key] = value;
        }
      } else {
        if (comma.includes(key)) {
          if (typeof source[key] === "function" || typeof value === "function") {
            const old = source[key];
            source[key] = (listener) => {
              const val1 = typeof old === "function" ? old(listener) : old;
              const val2 = typeof value === "function" ? value(listener) : value;
              return [val1, val2].filter((e) => e).join(", ");
            };
          } else {
            source[key] = [source[key], value].filter((e) => e).join(", ");
          }
        } else if (adjacent.includes(key)) {
          if (typeof source[key] === "function" || typeof value === "function") {
            const old = source[key];
            source[key] = (listener) => {
              const val1 = typeof old === "function" ? old(listener) : old;
              const val2 = typeof value === "function" ? value(listener) : value;
              return [val1, val2].filter((e) => e).join("");
            };
          } else {
            source[key] = [source[key], value].filter((e) => e).join("");
          }
        } else if (space.includes(key)) {
          if (typeof source[key] === "function" || typeof value === "function") {
            const old = source[key];
            source[key] = (listener) => {
              const val1 = typeof old === "function" ? old(listener) : old;
              const val2 = typeof value === "function" ? value(listener) : value;
              return [val1, val2].filter((e) => e).join(" ");
            };
          } else {
            source[key] = [source[key], value].filter((e) => e).join(" ");
          }
        } else if (key.startsWith("on")) {
          const name = key.replace("on", "").toLowerCase();
          addEvent(source, name, value);
        } else if (key.startsWith("_on")) {
          const name = key.replace("_on", "");
          addHook(source, name, value);
        } else {
          source[key] = value;
        }
      }
    }
    return source;
  }
  __name(merge, "merge");
  function hashString(str = "") {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = hash * 16777619 >>> 0;
    }
    return String.fromCharCode(97 + hash % 26) + hash.toString(16);
  }
  __name(hashString, "hashString");
  function toState(val, name) {
    return val instanceof State || val?._isState ? val : new State(val, name);
  }
  __name(toState, "toState");

  // ../packages/core/src/helpers.ts
  function addHook(partial, hookName, handler) {
    const hookProperty = `_on${hookName}`;
    const current = partial[hookProperty];
    if (typeof current === "function") {
      partial[hookProperty] = (...args) => {
        current(...args);
        handler(...args);
      };
    } else {
      partial[hookProperty] = handler;
    }
  }
  __name(addHook, "addHook");
  function addEvent(attributes, eventName, handler) {
    const eventProperty = eventNameMap[eventName];
    if (!eventProperty) {
      throw Error(`invalid event name "${eventName}"`);
    }
    const current = attributes[eventProperty];
    if (typeof current === "function") {
      attributes[eventProperty] = (event, node) => {
        current(event, node);
        handler(event, node);
      };
    } else {
      attributes[eventProperty] = handler;
    }
  }
  __name(addEvent, "addEvent");
  function deepClone(value, seen = /* @__PURE__ */ new WeakMap()) {
    if (value === null || typeof value !== "object") return value;
    if (typeof value === "function") return value;
    if (seen.has(value)) return seen.get(value);
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
      for (const [k, v] of value)
        clone.set(deepClone(k, seen), deepClone(v, seen));
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
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype) return value;
    clone = Object.create(proto);
    seen.set(value, clone);
    for (const key of Reflect.ownKeys(value)) {
      clone[key] = deepClone(value[key], seen);
    }
    return clone;
  }
  __name(deepClone, "deepClone");
  function validate(element, asPartial = false) {
    if (Object.prototype.toString.call(element) !== "[object Object]") {
      throw Error(`typeof ${element} is invalid DomphyElement`);
    }
    const keys = Object.keys(element);
    if (keys.length === 0 && !asPartial) {
      throw Error("element object has no tag key");
    }
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const val = element[key];
      if (i === 0 && !HtmlTagSet.has(key) && !asPartial) {
        throw Error(`key ${key} is not valid HTML tag name`);
      } else if (key === "style" && val && Object.prototype.toString.call(val) !== "[object Object]") {
        throw Error(`"style" must be a object`);
      } else if (key === "$") {
        if (!Array.isArray(val)) {
          throw Error(
            `"$" must be an array of patch objects, received ${val === null ? "null" : typeof val} on element { ${keys.join(", ")} } \u2014 wrap patches in an array, e.g. $: [patch()]`
          );
        }
        val.forEach((v) => validate(v, true));
      } else if (key.startsWith("_on") && typeof val !== "function") {
        throw Error(`hook ${key} value "${val}" must be a function `);
      } else if (key.startsWith("on") && typeof val !== "function") {
        throw Error(`event ${key} value "${val}" must be a function `);
      } else if (key === "_portal" && typeof val !== "function") {
        throw Error(`"_portal" must be a function return HTMLElement`);
      } else if (key === "_context" && Object.prototype.toString.call(val) !== "[object Object]") {
        throw Error(`"_context" must be a object`);
      } else if (key === "_metadata" && Object.prototype.toString.call(val) !== "[object Object]") {
        throw Error(`"_metadata" must be a object`);
      } else if (key === "_key" && typeof val !== "string" && typeof val !== "number") {
        throw Error(`"_key" must be a string or number`);
      }
    }
    return true;
  }
  __name(validate, "validate");
  function decodeSchemeObfuscation(value) {
    return value.replace(/&#(x?[0-9a-fA-F]+);/gi, (_match, code) => {
      const codePoint = code[0] === "x" || code[0] === "X" ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
      return codePoint >= 0 && codePoint <= 1114111 ? String.fromCodePoint(codePoint) : "";
    }).replace(/&colon;/gi, ":").replace(/&Tab;/gi, "	").replace(/&NewLine;/gi, "\n");
  }
  __name(decodeSchemeObfuscation, "decodeSchemeObfuscation");
  function isDangerousURL(value) {
    const canonical = decodeSchemeObfuscation(value).replace(/[\x00-\x20]+/g, "").toLowerCase();
    return canonical.startsWith("javascript:") || canonical.startsWith("vbscript:") || canonical.startsWith("data:text/html") || canonical.startsWith("data:application/xhtml+xml");
  }
  __name(isDangerousURL, "isDangerousURL");
  function stripScriptElements(html) {
    const lower = html.toLowerCase();
    let result = "";
    let index = 0;
    while (index < html.length) {
      const open = lower.indexOf("<", index);
      if (open === -1) {
        result += html.slice(index);
        break;
      }
      result += html.slice(index, open);
      let quote = null;
      let tagEnd = -1;
      for (let j = open + 1; j < html.length; j++) {
        const ch = html[j];
        if (quote) {
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") {
          quote = ch;
        } else if (ch === ">") {
          tagEnd = j;
          break;
        }
      }
      if (tagEnd === -1) {
        result += html.slice(open);
        break;
      }
      const tagText = html.slice(open, tagEnd + 1);
      if (/^<script[\s/>]/i.test(tagText)) {
        if (/\/\s*>$/.test(tagText)) {
          index = tagEnd + 1;
          continue;
        }
        const close = lower.indexOf("<\/script", tagEnd + 1);
        if (close === -1) {
          index = html.length;
          break;
        }
        const closeEnd = html.indexOf(">", close);
        index = closeEnd === -1 ? html.length : closeEnd + 1;
        continue;
      }
      result += tagText;
      index = tagEnd + 1;
    }
    return result;
  }
  __name(stripScriptElements, "stripScriptElements");
  function sanitizeHTMLString(html) {
    let result = stripScriptElements(html);
    result = result.replace(
      /\s+on[a-zA-Z][\w-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      ""
    );
    result = result.replace(
      /\/on[a-zA-Z][\w-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      "/"
    );
    result = result.replace(
      /(["'])on[a-zA-Z][\w-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      "$1"
    );
    result = result.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
    result = result.replace(/\/srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "/");
    result = result.replace(
      /(["'])srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      "$1"
    );
    result = result.replace(
      /((?:href|src|action|formaction|data)\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]*))/gi,
      (match, prefix, _raw, dq, sq, bare) => {
        const value = dq ?? sq ?? bare ?? "";
        if (!isDangerousURL(value)) return match;
        const quoteChar = dq !== void 0 ? '"' : sq !== void 0 ? "'" : "";
        return `${prefix}${quoteChar}#${quoteChar}`;
      }
    );
    return result;
  }
  __name(sanitizeHTMLString, "sanitizeHTMLString");
  function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  __name(escapeHTML, "escapeHTML");
  var HtmlTagSet = new Set(HtmlTags);
  function getTagName(element) {
    return Object.keys(element).find((e) => HtmlTagSet.has(e));
  }
  __name(getTagName, "getTagName");
  function cloneDescriptor(element, contentKey) {
    if (Object.getPrototypeOf(element) !== Object.prototype) {
      return deepClone(element);
    }
    const seen = /* @__PURE__ */ new WeakMap();
    const clone = {};
    for (const key of Reflect.ownKeys(element)) {
      clone[key] = key === contentKey ? element[key] : deepClone(element[key], seen);
    }
    return clone;
  }
  __name(cloneDescriptor, "cloneDescriptor");
  function camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }
  __name(camelToKebab, "camelToKebab");
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
  __name(selectorSplitter, "selectorSplitter");
  function normalizeSelectorKey(selectorText) {
    const text = selectorText.trim();
    if (text.startsWith("@")) return text.replace(/\s+/g, "");
    return text.replace(/\s*([>+~,])\s*/g, "$1").replace(/\s+/g, " ").replace(/\(\s*odd\s*\)/g, "(2n+1)").replace(/\(\s*even\s*\)/g, "(2n)").trim();
  }
  __name(normalizeSelectorKey, "normalizeSelectorKey");
  function collectCSSRules(rules, map) {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      let key = null;
      if (typeof rule.selectorText === "string") {
        key = normalizeSelectorKey(rule.selectorText);
      } else if (typeof rule.cssText === "string" && rule.cssText.startsWith("@")) {
        key = normalizeSelectorKey(rule.cssText.split("{")[0]);
      }
      if (key && !map.has(key)) map.set(key, rule);
    }
    return map;
  }
  __name(collectCSSRules, "collectCSSRules");
  function ensureDomStyle(styleParent, nonce) {
    let domStyle = styleParent.querySelector(
      "#domphy-style"
    );
    if (!domStyle) {
      domStyle = document.createElement("style");
      domStyle.id = "domphy-style";
      const resolvedNonce = nonce ?? getConfig().cspNonce;
      if (resolvedNonce) domStyle.nonce = resolvedNonce;
      styleParent.appendChild(domStyle);
    }
    if (domStyle.dataset.domphyBase !== "true") {
      domStyle.sheet?.insertRule("[hidden] { display: none !important; }", 0);
      domStyle.dataset.domphyBase = "true";
    }
    return domStyle;
  }
  __name(ensureDomStyle, "ensureDomStyle");
  var mergePartial = /* @__PURE__ */ __name((partial) => {
    if (Array.isArray(partial.$)) {
      const part = {};
      partial.$.forEach((p) => merge(part, mergePartial(p)));
      delete partial.$;
      merge(part, partial);
      return part;
    } else {
      return partial;
    }
  }, "mergePartial");

  // ../packages/core/src/classes/ElementAttribute.ts
  var EnumeratedBooleanAttributes = {
    translate: ["yes", "no"],
    autoCapitalize: ["on", "off"],
    // Both inherit from the nearest ancestor when absent, so `false` MUST emit
    // the explicit "false" keyword — dropping the attribute would leave a child
    // of a contenteditable/spellchecked root still editable/checked. Keeping
    // them non-boolean also preserves other keywords verbatim, notably
    // contenteditable="plaintext-only".
    contentEditable: ["true", "false"],
    spellCheck: ["true", "false"]
  };
  var ElementAttribute = class {
    constructor(name, value, parent) {
      // The value exactly as declared by the caller, kept verbatim (a reactive
      // function stays a function here) — unlike `value`, which always holds the
      // current RESOLVED primitive. AttributeList.addClass() reads this to detect
      // whether the existing "class" binding is reactive and, if so, to compose
      // with the original function instead of freezing at its last-resolved
      // string.
      this.declaredValue = void 0;
      this._notifier = new Notifier();
      // Release handles for the reactive listener's state subscriptions, so a
      // re-set (e.g. patch() replacing a reactive value) can drop the old listener
      // instead of leaking it on the long-lived State until node removal.
      this._releases = [];
      // Whether the BeforeRemove hook that drains _releases has been registered.
      // It must register at most ONCE per attribute: patch() re-sets every
      // reactive attribute on every reuse, and ElementNode.addHook COMPOSES hooks,
      // so an unguarded registration would grow the node's BeforeRemove chain by
      // one closure per subscription per patch for the node's whole life.
      this._removeHooked = false;
      // Release handles for addListener() subscriptions, drained by a SINGLE
      // BeforeRemove hook — see _listenerRemoveHooked.
      this._listenerReleases = [];
      // Same once-per-attribute guard as _removeHooked: without it every
      // addListener() call composes another BeforeRemove hook onto the node
      // (ElementNode.addHook COMPOSES), growing the chain per subscription.
      this._listenerRemoveHooked = false;
      this.parent = parent;
      this.isBoolean = BooleanAttributes.includes(name);
      this.enumeratedBoolean = EnumeratedBooleanAttributes[name];
      if (CamelAttributes.includes(name)) {
        this.name = name;
      } else if (Object.hasOwn(HtmlAttributeNames, name)) {
        this.name = HtmlAttributeNames[name];
      } else {
        this.name = camelToKebab(name);
      }
      this.value = void 0;
      this.set(value);
    }
    static {
      __name(this, "ElementAttribute");
    }
    normalize(value) {
      if (this.enumeratedBoolean && typeof value === "boolean") {
        return value ? this.enumeratedBoolean[0] : this.enumeratedBoolean[1];
      }
      return value;
    }
    render() {
      if (!this.parent || !this.parent.domElement) return;
      const domElement = this.parent.domElement;
      const mutateAttrs = ["value"];
      if (this.isBoolean) {
        if (this.value === false || this.value == null) {
          domElement.removeAttribute(this.name);
        } else {
          domElement.setAttribute(
            this.name,
            this.value === true ? "" : this.value
          );
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
      const prev = this.value;
      this.declaredValue = value;
      if (this._releases.length) {
        for (const release of this._releases) release();
        this._releases = [];
      }
      if (value == null) {
        this.value = null;
      } else if (typeof value === "function") {
        let listener = /* @__PURE__ */ __name(() => {
          if (!this.parent || this.parent._disposed) return;
          const p = this.value;
          this.value = this.isBoolean ? Boolean(value(listener)) : this.normalize(value(listener));
          this.render();
          if (p !== this.value) this._notifier.notify(this.name, this.value);
        }, "listener");
        listener.elementNode = this.parent;
        listener.debug = `class:${this.parent?.tagName}_${this.parent?.nodeId} attribute:${this.name}`;
        listener.onSubscribe = (release) => {
          this._releases.push(release);
          if (this.parent && !this._removeHooked) {
            this._removeHooked = true;
            this.parent.addHook("BeforeRemove", () => {
              for (const releaseSubscription of this._releases) {
                releaseSubscription();
              }
              this._releases = [];
              listener = null;
            });
          }
        };
        this.value = this.isBoolean ? Boolean(value(listener)) : this.normalize(value(listener));
      } else {
        this.value = this.isBoolean ? Boolean(value) : this.normalize(value);
      }
      this.render();
      if (prev !== this.value) this._notifier.notify(this.name, this.value);
    }
    addListener(callback) {
      const handler = callback;
      handler.onSubscribe = (release) => {
        this._listenerReleases.push(release);
        if (this.parent && !this._listenerRemoveHooked) {
          this._listenerRemoveHooked = true;
          this.parent.addHook("BeforeRemove", () => {
            for (const release2 of this._listenerReleases) release2();
            this._listenerReleases = [];
          });
        }
      };
      this._notifier.addListener(this.name, handler);
    }
    remove() {
      if (this.parent && this.parent.attributes) {
        this.parent.attributes.remove(this.name);
      }
      this._dispose();
    }
    _dispose() {
      for (const releaseSubscription of this._releases) releaseSubscription();
      this._releases = [];
      for (const release of this._listenerReleases) release();
      this._listenerReleases = [];
      this._notifier._dispose();
      this.value = null;
      this.parent = null;
    }
    generateHTML() {
      const { name, value } = this;
      if (this.isBoolean) {
        return value ? `${name}` : "";
      }
      if (value == null) return "";
      const val = Array.isArray(value) ? JSON.stringify(value) : value;
      return `${name}="${escapeHTML(String(val))}"`;
    }
  };

  // ../packages/core/src/classes/AttributeList.ts
  var AttributeList = class {
    constructor(parent) {
      this.items = {};
      this.parent = parent;
    }
    static {
      __name(this, "AttributeList");
    }
    generateHTML() {
      if (!this.items) return "";
      const str = Object.values(this.items).map((attr) => attr.generateHTML()).filter(Boolean).join(" ");
      return str ? ` ${str}` : "";
    }
    get(name) {
      if (!this.items) return void 0;
      return this.items[name]?.value;
    }
    set(name, value) {
      if (!this.items || !this.parent) return;
      if (this.items[name]) {
        this.items[name].set(value);
      } else {
        this.items[name] = new ElementAttribute(name, value, this.parent);
      }
    }
    addListener(name, callback) {
      if (this.has(name)) {
        this.items[name].addListener(callback);
      }
    }
    has(name) {
      if (!this.items) return false;
      return Object.hasOwn(this.items, name);
    }
    remove(name) {
      if (!this.items) return;
      const domName = this.items[name]?.name ?? name;
      if (this.items[name]) {
        this.items[name]._dispose();
        delete this.items[name];
      }
      if (this.parent && this.parent.domElement && this.parent.domElement instanceof Element) {
        this.parent.domElement.removeAttribute(domName);
      }
    }
    _dispose() {
      if (this.items) {
        for (const key in this.items) {
          this.items[key]._dispose();
        }
      }
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
      if (!className) return;
      if (typeof className !== "string" && typeof className !== "function")
        return;
      const add = /* @__PURE__ */ __name((classes, newClass) => {
        const list = (classes || "").split(" ").filter((e) => e);
        !list.includes(newClass) && list.push(newClass);
        return list.join(" ");
      }, "add");
      const declared = this.items?.class?.declaredValue;
      const currentIsFn = typeof declared === "function";
      const current = currentIsFn ? declared : this.get("class");
      const nextIsFn = typeof className === "function";
      if (!currentIsFn && !nextIsFn) {
        this.set("class", add(current, className));
        return;
      }
      this.set(
        "class",
        (listener) => add(
          currentIsFn ? current(listener) : current,
          nextIsFn ? className(listener) : className
        )
      );
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
  };

  // ../packages/core/src/classes/StyleProperty.ts
  var StyleProperty = class {
    constructor(name, value, parentRule) {
      this.value = "";
      // Release handles for the reactive listener's state subscriptions, so a
      // re-set (e.g. StyleList.patchCSS() replacing a reactive value on a reused
      // node) can drop the old listener(s) instead of leaking them on the
      // long-lived State(s) until node removal. A single reactive style function
      // can subscribe to MULTIPLE states in one evaluation (e.g.
      // `transform: (l) => \`translate(${x.get(l)}px, ${y.get(l)}px)\``), so
      // onSubscribe can fire more than once per set() call -- every release must
      // be kept, not just the last one. Mirrors ElementAttribute's `_releases`
      // array pattern.
      this._releases = [];
      this.name = name;
      this.cssName = name.startsWith("--") ? name : camelToKebab(name);
      this.parentRule = parentRule;
      this.set(value);
    }
    static {
      __name(this, "StyleProperty");
    }
    _domUpdate() {
      if (!this.parentRule) return;
      const domRule = this.parentRule.domRule;
      if (domRule && domRule.style) {
        const style = domRule.style;
        style.setProperty(this.cssName, String(this.value));
        if (PrefixCSS[this.name]) {
          PrefixCSS[this.name].forEach((prefix) => {
            style.setProperty(`-${prefix}-${this.cssName}`, String(this.value));
          });
        }
      }
    }
    _dispose() {
      if (this._releases.length) {
        for (const release of this._releases) release();
        this._releases = [];
      }
      this.value = "";
      this.parentRule = null;
    }
    set(value) {
      if (this._releases.length) {
        for (const release of this._releases) release();
        this._releases = [];
      }
      if (typeof value === "function") {
        const listener = /* @__PURE__ */ __name((() => {
          if (!this.parentRule || this.parentRule.parentNode?._disposed) return;
          this.value = value(listener);
          this._domUpdate();
        }), "listener");
        listener.onSubscribe = (release) => {
          this._releases.push(release);
        };
        listener.elementNode = this.parentRule.root;
        listener.debug = `class:${this.parentRule?.root?.tagName}_${this.parentRule?.root?.nodeId} style:${this.name}`;
        this.value = value(listener);
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
  };

  // ../packages/core/src/classes/StyleRule.ts
  var StyleRule = class _StyleRule {
    constructor(selectorText, parent) {
      this.domRule = null;
      // Hint: the index `domRule` had in its sheet's cssRules when render()
      // inserted it. Any earlier insertRule/deleteRule shifts it, so remove()
      // verifies identity at the hinted slot before trusting it and falls back
      // to the identity scan otherwise. -1 = no hint (e.g. SSR-hydrated rules).
      this._domIndex = -1;
      this.styleBlock = {};
      this.selectorText = selectorText;
      this.styleList = new StyleList(this);
      this.parent = parent;
    }
    static {
      __name(this, "StyleRule");
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
      while (node instanceof _StyleRule) {
        node = node.parent;
      }
      return node;
    }
    get parentNode() {
      let root2 = this.parent;
      while (root2 && root2 instanceof _StyleRule) {
        root2 = root2.parent;
      }
      return root2;
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
      const domRule = this.domRule;
      const sheet = domRule?.parentStyleSheet;
      if (domRule && sheet) {
        const rules = sheet.cssRules;
        let index = this._domIndex;
        if (index < 0 || index >= rules.length || rules[index] !== domRule) {
          index = -1;
          for (let i = 0; i < rules.length; i++) {
            if (rules[i] === domRule) {
              index = i;
              break;
            }
          }
        }
        if (index >= 0) sheet.deleteRule(index);
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
          this._domIndex = index;
          const domRule = domSheet.cssRules[index];
          if (domRule && "selectorText" in domRule) {
            this.mount(domRule);
          }
        } else if (/^@(media|supports|container|layer)\b/.test(this.selectorText)) {
          const index = domSheet.insertRule(
            `${this.selectorText} {}`,
            domSheet.cssRules.length
          );
          this._domIndex = index;
          const domRule = domSheet.cssRules[index];
          if ("cssRules" in domRule) {
            this.mount(domRule);
            this.styleList.render(domRule);
          }
        } else if (this.selectorText.startsWith("@keyframes") || this.selectorText.startsWith("@font-face")) {
          const css = this.cssText();
          const index = domSheet.insertRule(css, domSheet.cssRules.length);
          this._domIndex = index;
          const domRule = domSheet.cssRules[index];
          this.mount(domRule);
        }
      } catch (err) {
        console.warn("Failed to insert rule:", this.selectorText, err);
      }
    }
  };

  // ../packages/core/src/classes/StyleList.ts
  var StyleList = class {
    constructor(parent) {
      this.items = [];
      this.domStyle = null;
      this.parent = parent;
    }
    static {
      __name(this, "StyleList");
    }
    get parentNode() {
      let root2 = this.parent;
      while (root2 && root2 instanceof StyleRule) {
        root2 = root2.parent;
      }
      return root2;
    }
    addCSS(obj, parentSelector = "") {
      if (!this.items || !this.parent) return;
      const basic = {};
      const conditionalRules = [];
      function getSelector(selector, prev) {
        return selector.startsWith("&") ? `${prev}${selector.slice(1)}` : `${prev} ${selector}`;
      }
      __name(getSelector, "getSelector");
      for (const selector in obj) {
        const value = obj[selector];
        const splitKeys = selectorSplitter(selector);
        for (const key of splitKeys) {
          const currentSelector = getSelector(key, parentSelector);
          if (/^@(container|layer|supports|media)\b/.test(key)) {
            if (typeof value === "object" && value != null) {
              const rule = new StyleRule(key, this.parent);
              rule.styleList.addCSS(value, parentSelector);
              conditionalRules.push(rule);
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
                const newSelector = getSelector(k, currentSelector);
                this.addCSS(v, newSelector);
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
      for (const rule of conditionalRules) {
        this.items.push(rule);
      }
    }
    cssText() {
      if (!this.items) return "";
      return this.items.map((rule) => rule.cssText()).join("");
    }
    // Reconcile this node's own FLAT (non-selector, non-at-rule) style properties
    // in place: update/add properties present in `obj`, remove properties that
    // were present before and are gone now. Used by ElementNode.patch() when list
    // reconciliation reuses a live node, so a freshly-computed static style object
    // (e.g. from a factory function like `FilterButton(...)` called again with new
    // args) actually reaches the DOM instead of being silently dropped — `addCSS`
    // itself is append-only and would duplicate CSSOM rules if called again.
    //
    // Nested selector blocks (&:hover, @media/@supports/@container/@layer,
    // @keyframes, @font-face) are NOT reconciled here — they are set once at
    // construction and assumed stable across reuse. A value that must change
    // after construction under a nested selector needs its own reactive function
    // (`color: (l) => …`), same as it already did before this method existed.
    patchCSS(obj, parentSelector = "") {
      if (!this.items || !this.parent) return;
      const basic = {};
      for (const key in obj) {
        const value = obj[key];
        if (typeof value === "object" && value != null) continue;
        basic[key] = value;
      }
      let rule = this.items.find((r) => r.selectorText === parentSelector);
      if (!rule) {
        if (Object.keys(basic).length === 0) return;
        rule = new StyleRule(parentSelector, this.parent);
        this.items.push(rule);
      }
      const seen = new Set(Object.keys(basic));
      for (const key in basic) rule.insertStyle(key, basic[key]);
      if (rule.styleBlock) {
        for (const existingKey of Object.keys(rule.styleBlock)) {
          if (!seen.has(existingKey)) rule.removeStyle(existingKey);
        }
      }
      const sheet = this.domStyle?.sheet;
      if (!rule.domRule && sheet) rule.render(sheet);
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
    hydrate(domRuleMap) {
      if (!this.items) return;
      for (const rule of this.items) {
        const domRule = domRuleMap.get(normalizeSelectorKey(rule.selectorText));
        if (domRule) rule.mount(domRule);
      }
    }
    mount(domRuleList) {
      if (!this.items) return;
      if (!domRuleList) throw Error("Require domRuleList argument");
      let wrongCount = 0;
      const fixOddEven = /* @__PURE__ */ __name((css) => css.replace("(odd)", "(2n+1)").replace("(even)", "(2n)"), "fixOddEven");
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
  };

  // ../packages/core/src/classes/ElementNode.ts
  function devWarnVoidContent(tagName) {
    console.warn(
      `[Domphy] <${tagName}> is a void element and cannot have children \u2014 SSR output omits the declared content while the client renders it, so hydration drifts. Remove the content or use a non-void tag.`
    );
  }
  __name(devWarnVoidContent, "devWarnVoidContent");
  var ElementNode = class _ElementNode {
    constructor(domphyElement, _parent = null, index = 0) {
      this._disposed = false;
      this._beforeRemoveFired = false;
      // True when inserted imperatively (a direct children.insert() by app/patch
      // code, e.g. a floating panel or an _onInit-inserted subtree) rather than by
      // declared-inputs reconciliation — see ElementList.update()/insert().
      this._imperative = false;
      this.type = "ElementNode";
      this.parent = null;
      // Whether the BeforeRemove hook that releases `_childrenRelease` has been
      // registered for this node. It must register at most ONCE per node: patch()
      // re-runs _setupFunctionChildren on every reuse, and addHook COMPOSES hooks,
      // so an unguarded registration would grow the hook chain by one closure per
      // patch for the node's whole life.
      this._childrenReleaseHooked = false;
      // Per-node behavior contract (see `behavior()` in utils.ts). Attached
      // instances, keyed the same as their declaring `_behaviors` record.
      this._behaviorInstances = /* @__PURE__ */ new Map();
      // Specs declared before the DOM element exists (construction-time merge()),
      // held until the Mount hook can actually attach them.
      this._pendingBehaviors = /* @__PURE__ */ new Map();
      this._behaviorMountHooked = false;
      this._behaviorTeardownHooked = false;
      this.children = new ElementList(this);
      this.styles = new StyleList(this);
      this.attributes = new AttributeList(this);
      this.domElement = null;
      this._hooks = {};
      this._events = null;
      this._boundEvents = /* @__PURE__ */ new Set();
      this._context = {};
      this._metadata = {};
      this.key = null;
      // The RAW descriptor object this node was last constructed/patched from
      // (before cloning), retained for exactly one purpose: patch()'s
      // reference-equality fast path. Never read otherwise.
      this._descriptor = null;
      validate(domphyElement);
      this._descriptor = domphyElement;
      this.parent = _parent;
      this.tagName = getTagName(domphyElement);
      let element = cloneDescriptor(domphyElement, this.tagName);
      element.style = element.style || {};
      element = mergePartial(element);
      this.key = element._key ?? null;
      this._context = element._context || {};
      this._metadata = element._metadata || {};
      const tempPath = `${this.parent?.nodeId}.${index}`;
      const str = Object.keys(element.style).length ? JSON.stringify(
        element.style,
        (_k, v) => typeof v === "function" ? tempPath : v
      ) : "";
      this.nodeId = hashString(tempPath + str);
      this.attributes.addClass(`${this.tagName}_${this.nodeId}`);
      if (element._onSchedule) element._onSchedule(this, element);
      this.merge(element);
      const children = element[this.tagName];
      if (__DEV__ && children != null && children !== "" && VoidTags.includes(this.tagName)) {
        devWarnVoidContent(this.tagName);
      }
      if (children != null) {
        if (typeof children === "function") {
          this._setupFunctionChildren(children);
        } else {
          this.children.update(Array.isArray(children) ? children : [children]);
        }
      }
      this._hooks.Init && this._hooks.Init(this);
    }
    static {
      __name(this, "ElementNode");
    }
    _setupFunctionChildren(fn) {
      let listener = /* @__PURE__ */ __name(() => {
        if (this._disposed) return;
        try {
          const input = fn(listener);
          this.children.update(Array.isArray(input) ? input : [input]);
        } catch (error) {
          this._handleError(error);
        }
      }, "listener");
      listener.elementNode = this;
      listener.debug = `class:${this.tagName}_${this.nodeId} children`;
      const releases = [];
      listener.onSubscribe = (release) => {
        releases.push(release);
        this._childrenRelease = () => {
          for (const releaseSubscription of releases) releaseSubscription();
          releases.length = 0;
          listener = null;
        };
        if (!this._childrenReleaseHooked) {
          this._childrenReleaseHooked = true;
          this.addHook("BeforeRemove", () => {
            this._childrenRelease?.();
            this._childrenRelease = void 0;
          });
        }
      };
      listener();
    }
    _createDOMNode() {
      const svgNamespace = "http://www.w3.org/2000/svg";
      const node = SvgTags.includes(this.tagName) ? document.createElementNS(svgNamespace, this.tagName) : document.createElement(this.tagName);
      this.domElement = node;
      if (this._events) {
        for (const key in this._events) this._bindEvent(key);
      }
      if (this.attributes) {
        Object.values(this.attributes.items).forEach((attr) => attr.render());
      }
      return node;
    }
    // Bind a DOM listener that dispatches LIVE from this._events, so patch() can
    // swap the handler (e.g. a list item's onClick closure after its data changes)
    // without detaching/reattaching the DOM listener.
    _bindEvent(eventName) {
      if (!this.domElement || this._boundEvents.has(eventName)) return;
      this._boundEvents.add(eventName);
      let fn = /* @__PURE__ */ __name((event) => this._events?.[eventName]?.(event, this), "fn");
      this.domElement.addEventListener(eventName, fn);
      this.addHook("BeforeRemove", (n) => {
        n.domElement?.removeEventListener(eventName, fn);
        fn = null;
      });
    }
    _dispose() {
      if (this._disposed) return;
      this._disposed = true;
      if (!this._beforeRemoveFired) {
        this._beforeRemoveFired = true;
        try {
          this._hooks.BeforeRemove?.(this, () => {
          });
        } catch (error) {
          this._handleError(error);
        }
      }
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
      this._hooks.Remove?.(this);
      this.domElement = null;
      this._hooks = {};
      this._events = null;
      this._context = {};
      this._metadata = {};
      this._descriptor = null;
      this.parent = null;
    }
    merge(part) {
      merge(this._context, part._context);
      merge(this._metadata, part._metadata);
      this._processBehaviors(part._behaviors);
      const keys = Object.keys(part);
      for (let i = 0; i < keys.length; i++) {
        const originalKey = keys[i];
        const value = part[originalKey];
        if ([
          "$",
          "_onSchedule",
          "_key",
          "_context",
          "_metadata",
          "_behaviors",
          "style",
          this.tagName
        ].includes(originalKey)) {
        } else if ([
          "_onInit",
          "_onInsert",
          "_onMount",
          "_onBeforeUpdate",
          "_onUpdate",
          "_onBeforeRemove",
          "_onRemove",
          "_onError"
        ].includes(originalKey)) {
          this.addHook(originalKey.substring(3), value);
        } else if (originalKey.startsWith("on")) {
          this.addEvent(
            originalKey.substring(2).toLowerCase(),
            value
          );
        } else if (originalKey === "_portal") {
          this._portal = value;
        } else if (originalKey === "class") {
          if (typeof value === "string" || typeof value === "function") {
            this.attributes.addClass(value);
          }
        } else {
          this.attributes.set(originalKey, value);
        }
      }
      if (part.style) {
        this.styles.addCSS(
          part.style || {},
          `.${`${this.tagName}_${this.nodeId}`}`
        );
      }
    }
    // Update this live node IN PLACE from a fresh element description, preserving
    // its DOM element (and thus focus/scroll/selection/uncontrolled value) and its
    // children's identity. Used by list reconciliation to reuse a node by key
    // (keyed) or position (unkeyed) while reflecting new data, instead of
    // destroying and recreating the DOM. Flat style properties ARE reconciled (see
    // styles.patchCSS below) — a reused node's newly-computed static style must
    // reach the DOM, e.g. a factory function like `FilterButton(label, active,
    // onClick)` called again with new args from a reactive parent. Nested selector
    // blocks (&:hover, @media, …) are NOT reconciled — set once at construction,
    // assumed stable across reuse. Lifecycle hooks are NOT re-run (reused items
    // share structure; hooks already ran). Reactive content (a function child)
    // keeps its own listener and is left untouched.
    patch(rawElement) {
      if (rawElement === this._descriptor) return;
      this._descriptor = rawElement;
      let element = cloneDescriptor(rawElement, this.tagName);
      element.style = element.style || {};
      element = mergePartial(element);
      const content = element[this.tagName];
      if (__DEV__ && content != null && content !== "" && VoidTags.includes(this.tagName)) {
        devWarnVoidContent(this.tagName);
      }
      if (typeof content === "function") {
        this._childrenRelease?.();
        this._childrenRelease = void 0;
        this._setupFunctionChildren(content);
      } else if (content != null) {
        const next = Array.isArray(content) ? content : [content];
        this.children.update(next, !!this.domElement, true);
      }
      if (element._context) merge(this._context, element._context);
      if (element._metadata) merge(this._metadata, element._metadata);
      this._processBehaviors(element._behaviors);
      this.styles.patchCSS(
        element.style || {},
        `.${this.tagName}_${this.nodeId}`
      );
      const autoClass = `${this.tagName}_${this.nodeId}`;
      const reserved = [
        "$",
        "_onSchedule",
        "_key",
        "_context",
        "_metadata",
        "_behaviors",
        "style",
        this.tagName
      ];
      const hookKeys = [
        "_onInit",
        "_onInsert",
        "_onMount",
        "_onBeforeUpdate",
        "_onUpdate",
        "_onBeforeRemove",
        "_onRemove",
        "_onError"
      ];
      const keep = /* @__PURE__ */ new Set(["class"]);
      let userClass = null;
      this._events = {};
      for (const key of Object.keys(element)) {
        if (reserved.includes(key) || hookKeys.includes(key) || key === "_portal")
          continue;
        const value = element[key];
        if (key.startsWith("on") && typeof value === "function") {
          this.addEvent(key.substring(2).toLowerCase(), value);
        } else if (key === "class" && (typeof value === "string" || typeof value === "function")) {
          userClass = value;
        } else {
          this.attributes.set(key, value);
          keep.add(key);
        }
      }
      if (typeof userClass === "function") {
        const userClassFn = userClass;
        this.attributes.set(
          "class",
          (listener) => `${autoClass} ${userClassFn(listener)}`
        );
      } else {
        this.attributes.set(
          "class",
          userClass ? `${autoClass} ${userClass}` : autoClass
        );
      }
      if (this.attributes.items) {
        for (const name of Object.keys(this.attributes.items)) {
          if (!keep.has(name)) this.attributes.remove(name);
        }
      }
      if (this._events) {
        for (const key in this._events) this._bindEvent(key);
      }
    }
    // Walk ancestors to find the nearest Error hook. The boundary node receives
    // the error and a `reset` callback that clears its children (allowing it to
    // re-render with fresh data or a fallback). If no handler is found, log to
    // console so errors in reactive children are never silently swallowed.
    _handleError(error) {
      let node = this;
      while (node) {
        if (node._hooks.Error) {
          const boundary = node;
          node._hooks.Error(boundary, error, () => {
            boundary.children.update([]);
          });
          return;
        }
        node = node.parent;
      }
      console.error("[Domphy] Unhandled error in reactive child:", error);
    }
    addEvent(name, callback) {
      this._events = this._events || {};
      const current = this._events[name];
      if (typeof current === "function") {
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
        const composed = /* @__PURE__ */ __name(((...args) => {
          current(...args);
          callback(...args);
        }), "composed");
        try {
          Object.defineProperty(composed, "length", {
            value: Math.max(
              current.length,
              callback.length
            ),
            configurable: true
          });
        } catch {
        }
        this._hooks[name] = composed;
      } else {
        this._hooks[name] = callback;
      }
    }
    getRoot() {
      let root2 = this;
      while (root2 && root2 instanceof _ElementNode && root2.parent) {
        root2 = root2.parent;
      }
      return root2;
    }
    // Route a `_behaviors` record declared by THIS generation's PartialElement
    // into their per-node instances: an already-attached key gets its fresh
    // `props` forwarded via update() (the cross-generation fix — the instance,
    // not the closure that declared it, is what persists); a not-yet-attached
    // key attaches immediately if the DOM element already exists (the patch()/
    // reused-node path), or is queued for the node's one-time Mount hook
    // (the merge()/construction path, where domElement doesn't exist yet).
    _processBehaviors(behaviors) {
      if (!behaviors) return;
      for (const key of Object.keys(behaviors)) {
        const spec = behaviors[key];
        const instance = this._behaviorInstances.get(key);
        if (instance) {
          instance.update?.(spec.props);
        } else if (this.domElement) {
          this._attachBehaviorNow(key, spec);
        } else {
          this._pendingBehaviors.set(key, spec);
          this._ensureBehaviorMountHook();
        }
      }
    }
    _attachBehaviorNow(key, spec) {
      try {
        const instance = spec.attach(this, spec.props) || {};
        this._behaviorInstances.set(key, instance);
        this._ensureBehaviorTeardownHook();
      } catch (error) {
        this._handleError(error);
      }
    }
    // Registered at most once per node (Mount itself only ever fires once per
    // real DOM node) — flushes whatever was queued by merge() at construction,
    // by then reading domElement/getRoot() safely.
    _ensureBehaviorMountHook() {
      if (this._behaviorMountHooked) return;
      this._behaviorMountHooked = true;
      this.addHook("Mount", () => {
        if (this._pendingBehaviors.size === 0) return;
        const pending = this._pendingBehaviors;
        this._pendingBehaviors = /* @__PURE__ */ new Map();
        pending.forEach((spec, key) => this._attachBehaviorNow(key, spec));
      });
    }
    // Registered at most once per node — addHook COMPOSES, so a per-attach
    // registration would grow the BeforeRemove chain by one closure per
    // behavior key. The body reads the CURRENT instance map dynamically, so
    // one registration covers every key attached over the node's whole life.
    _ensureBehaviorTeardownHook() {
      if (this._behaviorTeardownHooked) return;
      this._behaviorTeardownHooked = true;
      this.addHook("BeforeRemove", () => {
        this._behaviorInstances.forEach((instance) => instance.destroy?.());
        this._behaviorInstances.clear();
      });
    }
    // Look up a behavior instance by key, walking up from this node through its
    // ancestors (same pattern as getContext/getMetadata) — a behavior is
    // declared on the element that owns the concern (e.g. a combobox's outer
    // anchor), but the event that needs it often fires on a DESCENDANT (e.g.
    // the combobox's inner input on focus). Returns undefined if the key was
    // never declared on this node or an ancestor, or was declared but hasn't
    // attached yet (construction-time, pre-Mount).
    getBehavior(key) {
      let node = this;
      while (node) {
        const instance = node._behaviorInstances.get(key);
        if (instance) return instance;
        node = node.parent;
      }
      return void 0;
    }
    getContext(name) {
      let node = this;
      while (node && (!node._context || !Object.hasOwn(node._context, name))) {
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
      css += this.children.items.map((child) => child instanceof _ElementNode ? child.generateCSS() : "").join("");
      return css;
    }
    generateHTML() {
      if (!this.children || !this.attributes) return "";
      const attributes = this.attributes.generateHTML();
      if (VoidTags.includes(this.tagName)) {
        return `<${this.tagName}${attributes}>`;
      }
      const content = this.children.generateHTML();
      return `<${this.tagName}${attributes}>${content}</${this.tagName}>`;
    }
    mount(domElement, domStyle) {
      if (!domElement) throw new Error("Missing dom node on bind");
      if (__DEV__ && this.parent === null && domElement.tagName && domElement.tagName.toLowerCase() !== this.tagName) {
        console.warn(
          `[Domphy] Hydration mismatch at mount root: expected <${this.tagName}> but found <${domElement.tagName.toLowerCase()}>. The server-rendered DOM does not match the client tree \u2014 check that mount() receives the element generated for THIS component.`
        );
      }
      if (__DEV__ && !domStyle && this.parent === null && domElement.childNodes.length > 0) {
        console.warn(
          "[Domphy] mount() was called without a style element on already-rendered DOM. Reactive style updates after hydration will be dropped \u2014 pass the server-rendered <style> element as the second argument to mount()."
        );
      }
      this.domElement = domElement;
      if (this._events) {
        for (const key in this._events) this._bindEvent(key);
      }
      if (this.children) {
        let domIndex = 0;
        this.children.items.forEach((child, i) => {
          const childNode = domElement.childNodes[domIndex];
          if (child instanceof _ElementNode) {
            domIndex++;
            if (!childNode) return;
            if (__DEV__) this._devCheckHydrationMatch(child, childNode, i);
            child.mount(childNode);
          } else if (child.html) {
            const span = child._domSpan();
            if (childNode) {
              child.domText = childNode;
              child._domExtras = [];
              for (let k = 1; k < span; k++) {
                const extra = domElement.childNodes[domIndex + k];
                if (extra) child._domExtras.push(extra);
              }
            }
            domIndex += span;
          } else if (childNode) {
            if (__DEV__ && childNode.nodeType !== 3) {
              console.warn(
                `[Domphy] Hydration mismatch at <${this.tagName}> child ${i}: expected a text node ("${child.text.slice(0, 40)}") but found ${childNode.nodeType === 1 ? `<${childNode.tagName.toLowerCase()}>` : `node type ${childNode.nodeType}`}. The server-rendered DOM does not match the client tree \u2014 check the component producing this subtree.`
              );
            }
            child.domText = childNode;
            domIndex++;
          } else if (this.tagName === "textarea") {
            child.render(domElement);
          } else {
            domIndex++;
          }
        });
      }
      if (domStyle) {
        const sheet = domStyle.sheet;
        if (sheet)
          this._hydrateStyles(collectCSSRules(sheet.cssRules, /* @__PURE__ */ new Map()));
      }
      this._hooks.Mount && this._hooks.Mount(this);
    }
    // DEV-only hydration guard (guarded by __DEV__ at the call site, so
    // production builds fold the whole thing away — zero per-node cost in
    // production): server DOM is bound purely by position, so a server/client
    // tree drift would silently bind the wrong node. Compare the tag name (and
    // the id/class attributes where the client declares them) and warn with
    // expected vs actual.
    _devCheckHydrationMatch(child, domNode, index) {
      const at = `<${this.tagName}> child ${index}`;
      const advice = "The server-rendered DOM does not match the client tree \u2014 check the component producing this subtree.";
      if (domNode.nodeType !== 1) {
        console.warn(
          `[Domphy] Hydration mismatch at ${at}: expected <${child.tagName}> but found ${domNode.nodeType === 3 ? `a text node ("${(domNode.textContent ?? "").slice(0, 40)}")` : `node type ${domNode.nodeType}`}. ${advice}`
        );
        return;
      }
      const el = domNode;
      const actualTag = el.tagName.toLowerCase();
      if (actualTag !== child.tagName) {
        console.warn(
          `[Domphy] Hydration mismatch at ${at}: expected <${child.tagName}> but found <${actualTag}>. ${advice}`
        );
        return;
      }
      for (const name of ["id", "class"]) {
        const declared = child.attributes?.items?.[name];
        if (!declared || declared.value == null) continue;
        const expectedValue = String(declared.value);
        const actualValue = el.getAttribute(name) ?? "";
        if (expectedValue !== actualValue) {
          console.warn(
            `[Domphy] Hydration mismatch at ${at} <${child.tagName}>: expected ${name}="${expectedValue}" but found ${name}="${actualValue}". ${advice}`
          );
        }
      }
    }
    _hydrateStyles(domRuleMap) {
      this.styles?.hydrate(domRuleMap);
      if (this.children) {
        for (const child of this.children.items) {
          if (child instanceof _ElementNode) child._hydrateStyles(domRuleMap);
        }
      }
    }
    render(domElement) {
      const newNode = this._createDOMNode();
      domElement.appendChild(newNode);
      this._hooks.Mount && this._hooks.Mount(this);
      let domStyle = this.getRoot().styles.domStyle;
      const root2 = domElement.getRootNode();
      const styleParent = root2 instanceof ShadowRoot ? root2 : document.head;
      domStyle ||= ensureDomStyle(styleParent);
      this.styles.render(domStyle);
      this.children.items.forEach((child) => {
        if (child instanceof _ElementNode && child._portal) {
          const dom = child._portal(this.getRoot());
          dom && child.render(dom);
        } else {
          child.render(newNode);
        }
      });
      return newNode;
    }
    remove() {
      if (this.parent) {
        this.parent.children.remove(this);
      } else {
        const done = /* @__PURE__ */ __name(() => {
          this.domElement?.remove();
          this._dispose();
        }, "done");
        if (this._hooks.BeforeRemove && this.domElement) {
          let called = false;
          const once = /* @__PURE__ */ __name(() => {
            if (!called) {
              called = true;
              done();
            }
          }, "once");
          const beforeRemoveHook = this._hooks.BeforeRemove;
          this._beforeRemoveFired = true;
          try {
            beforeRemoveHook(this, once);
          } catch (error) {
            this._handleError(error);
            once();
          }
          if (beforeRemoveHook.length < 2 && !called) once();
          else if (__DEV__ && !called) {
            setTimeout(() => {
              if (!called)
                console.warn(
                  "[Domphy] _onBeforeRemove declared a `done` parameter but did not call it within 5s \u2014 the element will stay in the DOM. Call done() when cleanup finishes."
                );
            }, 5e3);
          }
        } else {
          done();
        }
      }
    }
  };

  // ../packages/core/src/classes/RawHTML.ts
  function isRawHTML(value) {
    return typeof value === "object" && value !== null && value.__domphyRawHTML === true;
  }
  __name(isRawHTML, "isRawHTML");

  // ../packages/core/src/classes/TextNode.ts
  var ZWSP = String.fromCharCode(8203);
  var TextNode = class {
    constructor(textContent, parent) {
      this.type = "TextNode";
      // True when inserted imperatively (a direct children.insert()) rather than
      // by declared-inputs reconciliation — see ElementList.update()/insert().
      this._imperative = false;
      // Additional root nodes of a multi-root rawHtml() child. `domText` always
      // stays the FIRST root (the slot anchor every existing call site uses);
      // rawHtml("<b>a</b><i>b</i>") parses to TWO roots and previously everything
      // after firstChild was silently dropped on the client while SSR emitted the
      // whole string — diverging trees. Empty for plain text / single-root HTML.
      this._domExtras = [];
      this.parent = parent;
      this.html = isRawHTML(textContent);
      const text = this.html ? textContent.html : textContent;
      this.text = text === "" ? this.emptyText() : String(text);
    }
    static {
      __name(this, "TextNode");
    }
    // The stand-in for an empty text child: ZWSP everywhere except inside a
    // <textarea>, where it must stay a truly empty string (see ZWSP above).
    emptyText() {
      return this.parent?.tagName === "textarea" ? "" : ZWSP;
    }
    _createDOMNode() {
      let newNode;
      this._domExtras = [];
      if (this.html) {
        const tpl = document.createElement("template");
        tpl.innerHTML = sanitizeHTMLString(this.text.trim());
        const roots = Array.from(tpl.content.childNodes);
        if (roots.length === 0) {
          newNode = document.createTextNode("");
        } else {
          newNode = roots[0];
          this._domExtras = roots.slice(1);
        }
      } else {
        newNode = document.createTextNode(this.text);
      }
      this.domText = newNode;
      return newNode;
    }
    // Every DOM node this child occupies, in order: one node for plain text and
    // single-root rawHtml, N for a multi-root rawHtml child. ElementList uses
    // this for group moves/swaps/removals.
    _allDomNodes() {
      const nodes = [];
      if (this.domText) nodes.push(this.domText);
      for (const extra of this._domExtras) nodes.push(extra);
      return nodes;
    }
    // Number of DOM siblings this child's markup parses to. mount() hydration
    // advances its DOM cursor by this span so logical siblings AFTER a
    // multi-root rawHtml child still bind to the right server nodes (SSR emits
    // the same markup, so the counts agree).
    _domSpan() {
      if (!this.html) return 1;
      const tpl = document.createElement("template");
      tpl.innerHTML = sanitizeHTMLString(this.text.trim());
      return Math.max(tpl.content.childNodes.length, 1);
    }
    // Update the text content in place. When the node is a plain DOM text node and
    // stays plain text, mutate `nodeValue` directly (cheap, preserves the node) —
    // this is what lets reactive text like `(l) => "Count: " + n.get(l)` patch the
    // existing text node instead of recreating it every change. Crossing the
    // text/rawHtml boundary (or a non-text node) rebuilds the node.
    setText(textContent) {
      const isHtml = isRawHTML(textContent);
      const raw = isHtml ? textContent.html : textContent;
      const next = raw === "" ? this.emptyText() : String(raw);
      if (next === this.text && isHtml === this.html && this.domText) return;
      const wasHTML = this.html;
      this.text = next;
      this.html = isHtml;
      if (!this.domText) return;
      if (!wasHTML && !isHtml && this.domText.nodeType === 3) {
        this.domText.nodeValue = next;
        return;
      }
      const old = this.domText;
      const oldExtras = this._domExtras;
      const fresh = this._createDOMNode();
      const parent = old.parentNode;
      if (parent) {
        parent.insertBefore(fresh, old);
        for (const extra of this._domExtras) parent.insertBefore(extra, old);
        parent.removeChild(old);
        for (const extra of oldExtras) extra.remove();
      }
    }
    _dispose() {
      this.domText = void 0;
      this._domExtras = [];
      this.text = "";
    }
    generateHTML() {
      if (this.text === ZWSP) return "&#8203;";
      return this.html ? sanitizeHTMLString(this.text.trim()) : escapeHTML(this.text);
    }
    render(domText) {
      const newNode = this._createDOMNode();
      domText.appendChild(newNode);
      for (const extra of this._domExtras) domText.appendChild(extra);
    }
  };

  // ../packages/core/src/classes/ElementList.ts
  var _warnedKeylessSites = /* @__PURE__ */ new Set();
  var ElementList = class {
    constructor(parent) {
      this.items = [];
      this._nextKey = 0;
      this.owner = parent;
    }
    static {
      __name(this, "ElementList");
    }
    _createNode(element) {
      if (isRawHTML(element)) return new TextNode(element, this.owner);
      return typeof element === "object" && element !== null ? new ElementNode(element, this.owner, this._nextKey++) : new TextNode(element == null ? "" : String(element), this.owner);
    }
    // Resolve the first item at or after `index` whose DOM node is an ACTUAL
    // child of the owner's DOM element, for use as an insertBefore reference.
    // The logical `items` array and the real DOM child list diverge: a portal
    // item occupies a logical slot while its DOM lives wherever _portal() routed
    // it, so a positional `childNodes[i]` (or a blind `items[i].domElement`)
    // reference either points outside the owner (insertBefore throws
    // NotFoundError) or drifts by the number of preceding portals (silently
    // misplacing the node). Returns null when no such item exists (append).
    _domReferenceAfter(index) {
      const dom = this.owner.domElement;
      if (!dom) return null;
      for (let i = index; i < this.items.length; i++) {
        const item = this.items[i];
        const el = item instanceof ElementNode ? item.domElement : item.domText;
        if (el && el.parentNode === dom) return el;
      }
      return null;
    }
    _moveDomElement(node, index) {
      if (!this.owner || !this.owner.domElement) return;
      const dom = this.owner.domElement;
      const nodes = node instanceof ElementNode ? node.domElement ? [node.domElement] : [] : node._allDomNodes();
      if (nodes.length === 0) return;
      const ref = this._domReferenceAfter(index + 1);
      for (const el of nodes) {
        if (el !== ref) dom.insertBefore(el, ref);
      }
    }
    _swapDomElement(aNode, bNode) {
      if (!this.owner || !this.owner.domElement) return;
      const parent = this.owner.domElement;
      const aNodes = aNode instanceof ElementNode ? aNode.domElement ? [aNode.domElement] : [] : aNode._allDomNodes();
      const bNodes = bNode instanceof ElementNode ? bNode.domElement ? [bNode.domElement] : [] : bNode._allDomNodes();
      if (aNodes.length === 0 || bNodes.length === 0) return;
      const marker = document.createComment("");
      parent.insertBefore(marker, aNodes[0]);
      const bEnd = bNodes[bNodes.length - 1].nextSibling;
      for (const el of aNodes) parent.insertBefore(el, bEnd);
      for (const el of bNodes) parent.insertBefore(el, marker);
      marker.remove();
    }
    update(inputs, updateDom = true, silent = false) {
      if (this.items.some((item) => item._imperative)) {
        const declared = this.items.filter((item) => !item._imperative);
        const imperative = this.items.filter((item) => item._imperative);
        this.items = declared.concat(imperative);
      }
      const oldItems = this.items.slice();
      const keyed = /* @__PURE__ */ new Map();
      for (const item of oldItems) {
        if (item instanceof ElementNode && item.key !== null && item.key !== void 0 && !item._imperative && !item._beforeRemoveFired) {
          keyed.set(item.key, item);
        }
      }
      if (!silent && this.owner.domElement)
        this.owner._hooks?.BeforeUpdate?.(this.owner, inputs);
      const oldSet = new Set(oldItems);
      const claimed = /* @__PURE__ */ new Set();
      let keyedReused = false;
      let unkeyedObjectInputs = 0;
      const lengthChanged = __DEV__ && oldItems.length > 0 ? inputs.length !== oldItems.length : false;
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const isObj = typeof input === "object" && input !== null && !isRawHTML(input);
        const key = isObj ? input._key : void 0;
        const tag = isObj ? getTagName(input) : void 0;
        if (__DEV__ && isObj && key === void 0) unkeyedObjectInputs++;
        if (key !== void 0) {
          const reused = keyed.get(key);
          if (reused instanceof ElementNode && reused.tagName === tag) {
            keyed.delete(key);
            keyedReused = true;
            const cur = this.items.indexOf(reused);
            if (cur !== i && cur >= 0) {
              this.move(cur, i, false, true);
            }
            reused.parent = this.owner;
            reused.patch(input);
            claimed.add(reused);
            continue;
          }
        } else if (isObj) {
          const at = this.items[i];
          if (at instanceof ElementNode && at.key == null && at.tagName === tag && oldSet.has(at) && !claimed.has(at) && !at._imperative && !at._beforeRemoveFired) {
            at.parent = this.owner;
            at.patch(input);
            claimed.add(at);
            continue;
          }
        } else {
          const at = this.items[i];
          if (at instanceof TextNode && oldSet.has(at) && !claimed.has(at) && !at._imperative) {
            at.setText(input == null ? "" : input);
            claimed.add(at);
            continue;
          }
        }
        claimed.add(this.insert(input, i, updateDom, true, true));
      }
      const extras = this.items.slice(inputs.length);
      for (const node of extras) {
        if (!node._imperative) this.remove(node, updateDom, true);
      }
      keyed.forEach((node) => this.remove(node, updateDom, true));
      if (keyedReused && updateDom && this.owner.domElement) {
        const oldPos = /* @__PURE__ */ new Map();
        for (let i = 0; i < oldItems.length; i++) oldPos.set(oldItems[i], i);
        this._placeKeyedDom(oldPos);
      }
      if (__DEV__ && oldItems.length > 0 && unkeyedObjectInputs > 0 && lengthChanged) {
        const siteId = this.owner.nodeId;
        if (!_warnedKeylessSites.has(siteId)) {
          _warnedKeylessSites.add(siteId);
          const msg = `[domphy] unkeyed list length changed \u2014 DOM nodes reused by position may not match their data slot (focus/scroll/input-value drift). Add _key to each item. (parent <${this.owner.tagName}>, ${unkeyedObjectInputs} unkeyed item${unkeyedObjectInputs === 1 ? "" : "s"})`;
          console.warn(msg);
        }
      }
      if (!silent) this.owner._hooks?.Update?.(this.owner);
    }
    // Minimal-move DOM placement after a keyed reconciliation. `oldPos` maps
    // each pre-update item to its old logical index. The nodes whose old
    // positions form a longest increasing subsequence (LIS) are already in the
    // correct relative DOM order and are left untouched; every other placeable
    // node is re-inserted before the already-placed node that must follow it,
    // walking right to left so the reference is always settled. A single row
    // removal or a two-row swap therefore costs 0 and 2 insertBefores instead
    // of O(n). Skipped entirely: imperative nodes (DOM managed by whoever
    // inserted them), portals (no DOM slot under this owner), nodes whose async
    // removal is in flight, and nodes with no DOM yet.
    _placeKeyedDom(oldPos) {
      const dom = this.owner.domElement;
      if (!dom) return;
      const seq = [];
      const items = this.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item._imperative || item instanceof ElementNode && item._beforeRemoveFired) {
          seq.push(-2);
          continue;
        }
        if (item instanceof ElementNode && item._portal) {
          seq.push(-2);
          continue;
        }
        seq.push(oldPos.get(item) ?? -1);
      }
      const stay = /* @__PURE__ */ new Set();
      const lisPos = [];
      const values = [];
      for (let k = 0; k < seq.length; k++) {
        if (seq[k] >= 0) {
          lisPos.push(k);
          values.push(seq[k]);
        }
      }
      if (values.length > 0) {
        const tails = [];
        const tailIdx = [];
        const prev = new Array(values.length).fill(-1);
        for (let j2 = 0; j2 < values.length; j2++) {
          let lo = 0;
          let hi = tails.length;
          while (lo < hi) {
            const mid = lo + hi >> 1;
            if (tails[mid] < values[j2]) lo = mid + 1;
            else hi = mid;
          }
          tails[lo] = values[j2];
          tailIdx[lo] = j2;
          if (lo > 0) prev[j2] = tailIdx[lo - 1];
        }
        let j = tailIdx[tails.length - 1];
        while (j !== void 0 && j >= 0) {
          stay.add(lisPos[j]);
          j = prev[j];
        }
      }
      let nextDom = null;
      for (let k = seq.length - 1; k >= 0; k--) {
        if (seq[k] === -2) continue;
        const item = items[k];
        const nodes = item instanceof ElementNode ? item.domElement ? [item.domElement] : [] : item._allDomNodes();
        if (nodes.length === 0) continue;
        if (!stay.has(k)) {
          let ref = nextDom;
          for (let m = nodes.length - 1; m >= 0; m--) {
            const el = nodes[m];
            if (el.nextSibling !== ref) dom.insertBefore(el, ref);
            ref = el;
          }
        }
        nextDom = nodes[0];
      }
    }
    insert(input, index, updateDom = true, silent = false, declared = false) {
      const length = this.items.length;
      const finalIndex = typeof index !== "number" || Number.isNaN(index) || index < 0 || index > length ? length : index;
      const item = this._createNode(input);
      item._imperative = !declared;
      this.items.splice(finalIndex, 0, item);
      if (item instanceof ElementNode) {
        item._hooks.Insert && item._hooks.Insert(item);
        const domElement = this.owner.domElement;
        if (updateDom && domElement) {
          if (item._portal) {
            const domElement2 = item._portal(this.owner.getRoot());
            domElement2 && item.render(domElement2);
          } else {
            const domNode = item._createDOMNode();
            const ref = this._domReferenceAfter(finalIndex + 1);
            domElement.insertBefore(domNode, ref);
            const root2 = domElement.getRootNode();
            const styleParent = root2 instanceof ShadowRoot ? root2 : document.head;
            const domStyle = ensureDomStyle(styleParent);
            item.styles.render(domStyle);
            item._hooks.Mount && item._hooks.Mount(item);
            item.children.items.forEach((child) => {
              if (child instanceof ElementNode && child._portal) {
                const dom = child._portal(child.getRoot());
                dom && child.render(dom);
              } else {
                child.render(domNode);
              }
            });
          }
        }
      } else {
        const domElement = this.owner.domElement;
        if (updateDom && domElement) {
          const domNode = item._createDOMNode();
          const ref = this._domReferenceAfter(finalIndex + 1);
          domElement.insertBefore(domNode, ref);
          for (const extra of item._domExtras)
            domElement.insertBefore(extra, ref);
        }
      }
      !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
      return item;
    }
    remove(item, updateDom = true, silent = false) {
      const index = this.items.indexOf(item);
      if (index < 0) return;
      if (item instanceof ElementNode) {
        if (item._beforeRemoveFired) return;
        const done = /* @__PURE__ */ __name(() => {
          const el = item.domElement;
          const i = this.items.indexOf(item);
          if (i >= 0) this.items.splice(i, 1);
          updateDom && el && el.remove();
          item._dispose();
        }, "done");
        if (item._hooks.BeforeRemove && item.domElement) {
          let doneCalled = false;
          const onceDone = /* @__PURE__ */ __name(() => {
            if (!doneCalled) {
              doneCalled = true;
              done();
            }
          }, "onceDone");
          const beforeRemoveHook = item._hooks.BeforeRemove;
          item._beforeRemoveFired = true;
          try {
            beforeRemoveHook(item, onceDone);
          } catch (error) {
            item._handleError(error);
            onceDone();
          }
          if (beforeRemoveHook.length < 2 && !doneCalled)
            onceDone();
          else if (__DEV__ && !doneCalled) {
            setTimeout(() => {
              if (!doneCalled)
                console.warn(
                  "[Domphy] _onBeforeRemove declared a `done` parameter (e.g. an exit animation) but did not call it within 5s \u2014 the element will stay in the DOM. Call done() when cleanup finishes."
                );
            }, 5e3);
          }
        } else {
          done();
        }
      } else {
        this.items.splice(index, 1);
        if (updateDom) for (const el of item._allDomNodes()) el.remove();
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
      this.items.forEach((child) => child._dispose());
      this.items = [];
    }
    swap(aIndex, bIndex, updateDom = true, silent = false) {
      if (aIndex < 0 || bIndex < 0 || aIndex >= this.items.length || bIndex >= this.items.length || aIndex === bIndex)
        return;
      const itemA = this.items[aIndex];
      const itemB = this.items[bIndex];
      this.items[aIndex] = itemB;
      this.items[bIndex] = itemA;
      if (updateDom) this._swapDomElement(itemA, itemB);
      !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner);
    }
    move(fromIndex, toIndex, updateDom = true, silent = false) {
      if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length || fromIndex === toIndex)
        return;
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
  };

  // ../packages/core/src/classes/Reactive.ts
  var REACTION_QUEUE = /* @__PURE__ */ new Set();
  var reactionDrainScheduled = false;
  function drainReactions() {
    reactionDrainScheduled = false;
    while (REACTION_QUEUE.size > 0) {
      const jobs = [...REACTION_QUEUE];
      REACTION_QUEUE.clear();
      for (const job of jobs) {
        try {
          job();
        } catch (e) {
          console.error("[Domphy] Uncaught error in effect:", e);
        }
      }
    }
  }
  __name(drainReactions, "drainReactions");
  function flushSync() {
    let guard = 0;
    while (hasPendingNotifiers() || REACTION_QUEUE.size > 0) {
      if (guard++ > 1e4) {
        console.error("[Domphy] flushSync did not settle");
        break;
      }
      flushPendingNotifiers();
      drainReactions();
    }
  }
  __name(flushSync, "flushSync");

  // src/main.ts
  function _random(max) {
    return Math.round(Math.random() * 1e3) % max;
  }
  __name(_random, "_random");
  var ADJECTIVES = [
    "pretty",
    "large",
    "big",
    "small",
    "tall",
    "short",
    "long",
    "handsome",
    "plain",
    "quaint",
    "clean",
    "elegant",
    "easy",
    "angry",
    "crazy",
    "helpful",
    "mushy",
    "odd",
    "unsightly",
    "adorable",
    "important",
    "inexpensive",
    "cheap",
    "expensive",
    "fancy"
  ];
  var COLOURS = [
    "red",
    "yellow",
    "blue",
    "green",
    "pink",
    "brown",
    "purple",
    "brown",
    "white",
    "black",
    "orange"
  ];
  var NOUNS = [
    "table",
    "chair",
    "house",
    "bbq",
    "desk",
    "car",
    "pony",
    "cookie",
    "sandwich",
    "burger",
    "pizza",
    "mouse",
    "keyboard"
  ];
  var nextId = 1;
  function buildLabels(count) {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: nextId++,
        label: ADJECTIVES[_random(ADJECTIVES.length)] + " " + COLOURS[_random(COLOURS.length)] + " " + NOUNS[_random(NOUNS.length)]
      });
    }
    return data;
  }
  __name(buildLabels, "buildLabels");
  var REMOVE_ICON = {
    span: null,
    class: "glyphicon glyphicon-remove",
    "aria-hidden": "true"
  };
  function createFineImpl(opts = {}) {
    const data = toState([]);
    let selectedRow = null;
    let tbodyNode = null;
    function buildData(count) {
      return buildLabels(count).map(({ id, label }) => ({
        id,
        label: toState(label),
        selected: toState(false)
      }));
    }
    __name(buildData, "buildData");
    function rowElement(row) {
      return {
        tr: [
          { td: row.id, class: "col-md-1" },
          {
            td: [
              {
                a: /* @__PURE__ */ __name((l) => row.label.get(l), "a"),
                onClick: /* @__PURE__ */ __name(() => {
                  if (selectedRow === row) return;
                  selectedRow?.selected.set(false);
                  row.selected.set(true);
                  selectedRow = row;
                }, "onClick")
              }
            ],
            class: "col-md-4"
          },
          {
            td: [
              {
                a: [REMOVE_ICON],
                onClick: /* @__PURE__ */ __name(() => {
                  if (selectedRow === row) selectedRow = null;
                  if (opts.tuned && tbodyNode) {
                    const rows = data.get();
                    const index = rows.indexOf(row);
                    if (index < 0) return;
                    rows.splice(index, 1);
                    tbodyNode.children.remove(tbodyNode.children.items[index]);
                  } else {
                    data.set(data.get().filter((r) => r !== row));
                  }
                }, "onClick")
              }
            ],
            class: "col-md-1"
          },
          { td: null, class: "col-md-6" }
        ],
        _key: row.id,
        class: /* @__PURE__ */ __name((l) => row.selected.get(l) ? "danger" : "", "class")
      };
    }
    __name(rowElement, "rowElement");
    const elementCache = opts.memo ? /* @__PURE__ */ new WeakMap() : null;
    function elementFor(row) {
      if (!elementCache) return rowElement(row);
      let element = elementCache.get(row);
      if (!element) {
        element = rowElement(row);
        elementCache.set(row, element);
      }
      return element;
    }
    __name(elementFor, "elementFor");
    return {
      rows: /* @__PURE__ */ __name((l) => data.get(l).map(elementFor), "rows"),
      onTbodyMount(node) {
        tbodyNode = node;
      },
      run(count) {
        selectedRow = null;
        data.set(buildData(count));
      },
      add(count) {
        data.set(data.get().concat(buildData(count)));
      },
      update() {
        const rows = data.get();
        for (let i = 0; i < rows.length; i += 10) {
          const s = rows[i].label;
          s.set(s.get() + " !!!");
        }
      },
      swapRows() {
        const rows = data.get();
        if (rows.length < 999) return;
        if (opts.tuned && tbodyNode) {
          const tmp2 = rows[1];
          rows[1] = rows[998];
          rows[998] = tmp2;
          tbodyNode.children.swap(1, 998);
          return;
        }
        const next = rows.slice();
        const tmp = next[1];
        next[1] = next[998];
        next[998] = tmp;
        data.set(next);
      },
      clear() {
        selectedRow = null;
        data.set([]);
      }
    };
  }
  __name(createFineImpl, "createFineImpl");
  function createCoarseImpl() {
    const data = toState([]);
    const selected = toState(null);
    function rowElement(row) {
      return {
        tr: [
          { td: row.id, class: "col-md-1" },
          {
            td: [
              {
                a: row.label,
                onClick: /* @__PURE__ */ __name(() => selected.set(row.id), "onClick")
              }
            ],
            class: "col-md-4"
          },
          {
            td: [
              {
                a: [REMOVE_ICON],
                onClick: /* @__PURE__ */ __name(() => data.set(data.get().filter((r) => r.id !== row.id)), "onClick")
              }
            ],
            class: "col-md-1"
          },
          { td: null, class: "col-md-6" }
        ],
        _key: row.id,
        class: /* @__PURE__ */ __name((l) => selected.get(l) === row.id ? "danger" : "", "class")
      };
    }
    __name(rowElement, "rowElement");
    return {
      rows: /* @__PURE__ */ __name((l) => data.get(l).map(rowElement), "rows"),
      run(count) {
        selected.set(null);
        data.set(buildLabels(count));
      },
      add(count) {
        data.set(data.get().concat(buildLabels(count)));
      },
      update() {
        data.set(
          data.get().map(
            (r, i) => i % 10 === 0 ? { ...r, label: r.label + " !!!" } : r
          )
        );
      },
      swapRows() {
        const rows = data.get();
        if (rows.length < 999) return;
        const next = rows.slice();
        const tmp = next[1];
        next[1] = next[998];
        next[998] = tmp;
        data.set(next);
      },
      clear() {
        selected.set(null);
        data.set([]);
      }
    };
  }
  __name(createCoarseImpl, "createCoarseImpl");
  var implParam = new URLSearchParams(location.search).get("impl");
  var impl = implParam === "coarse" ? createCoarseImpl() : createFineImpl({
    tuned: implParam === "tuned",
    memo: implParam === "memo"
  });
  function actionButton(id, label, run) {
    return {
      div: [
        {
          button: label,
          type: "button",
          class: "btn btn-primary btn-block",
          id,
          onClick: run
        }
      ],
      class: "col-sm-6 smallpad"
    };
  }
  __name(actionButton, "actionButton");
  var App = {
    div: [
      {
        div: [
          {
            div: [
              { div: [{ h1: 'Domphy-"keyed"' }], class: "col-md-6" },
              {
                div: [
                  {
                    div: [
                      actionButton("run", "Create 1,000 rows", () => impl.run(1e3)),
                      actionButton("runlots", "Create 10,000 rows", () => impl.run(1e4)),
                      actionButton("add", "Append 1,000 rows", () => impl.add(1e3)),
                      actionButton("update", "Update every 10th row", () => impl.update()),
                      actionButton("clear", "Clear", () => impl.clear()),
                      actionButton("swaprows", "Swap Rows", () => impl.swapRows())
                    ],
                    class: "row"
                  }
                ],
                class: "col-md-6"
              }
            ],
            class: "row"
          }
        ],
        class: "jumbotron"
      },
      {
        table: [
          {
            tbody: /* @__PURE__ */ __name((l) => impl.rows(l), "tbody"),
            id: "tbody",
            _onMount: /* @__PURE__ */ __name((node) => impl.onTbodyMount?.(node), "_onMount")
          }
        ],
        class: "table table-hover table-striped test-data"
      },
      {
        span: null,
        class: "preloadicon glyphicon glyphicon-remove",
        "aria-hidden": "true"
      }
    ],
    class: "container"
  };
  var root = { div: [App], id: "main" };
  new ElementNode(root).render(document.body);
  window.__flushSync = flushSync;
})();
