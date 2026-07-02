import { SvgTags, VoidTags } from "../constants.js";
import { __DEV__ } from "../dev.js";
import {
  collectCSSRules,
  deepClone,
  ensureDomStyle,
  getTagName,
  mergePartial,
  validate,
} from "../helpers.js";
import type {
  DomphyElement,
  EventName,
  HookMap,
  Listener,
  PartialElement,
  TagName,
} from "../types.js";
import { hashString, merge } from "../utils.js";
import { AttributeList } from "./AttributeList.js";
import { ElementList } from "./ElementList.js";
import { StyleList } from "./StyleList.js";

export class ElementNode {
  _disposed = false;
  _beforeRemoveFired = false;
  type = "ElementNode";
  parent: ElementNode | null = null;
  _childrenRelease?: () => void;
  _portal?: (root: ElementNode) => HTMLElement;
  tagName: TagName;
  children = new ElementList(this);
  styles = new StyleList(this);
  attributes = new AttributeList(this);
  domElement?: HTMLElement | null = null;
  _hooks: HookMap = {};
  _events?:
    | { [K in EventName]?: (event: Event, node: ElementNode) => void }
    | null = null;
  _boundEvents = new Set<EventName>();
  _context?: Record<string, any> = {};
  _metadata?: Record<string, any> = {};
  key?: string | number | null = null;
  nodeId: string;

  constructor(
    domphyElement: DomphyElement,
    _parent: ElementNode | null = null,
    index = 0,
  ) {
    domphyElement = deepClone(domphyElement);
    validate(domphyElement);
    domphyElement.style = domphyElement.style || {};
    this.parent = _parent;
    this.tagName = getTagName(domphyElement) as TagName;
    domphyElement = mergePartial(domphyElement) as DomphyElement;

    this.key = (domphyElement as any)._key ?? null;
    this._context = domphyElement._context || {};
    this._metadata = domphyElement._metadata || {};

    const tempPath = `${this.parent?.nodeId}.${index}`;
    const str = JSON.stringify(domphyElement.style || {}, (_k, v) =>
      typeof v === "function" ? tempPath : v,
    );
    this.nodeId = hashString(tempPath + str);

    this.attributes!.addClass(`${this.tagName}_${this.nodeId}`);
    if (domphyElement._onSchedule)
      domphyElement._onSchedule(this, domphyElement);

    this.merge(domphyElement);

    const children = (domphyElement as any)[this.tagName];

    if (children != null) {
      if (typeof children === "function") {
        this._setupFunctionChildren(children);
      } else {
        this.children!.update(Array.isArray(children) ? children : [children]);
      }
    }
    this._hooks.Init && this._hooks.Init(this);
  }

  _setupFunctionChildren(fn: (listener: any) => any): void {
    let listener: any = () => {
      if (this._disposed) return;
      try {
        const input = fn(listener);
        this.children!.update(Array.isArray(input) ? input : [input]);
      } catch (error) {
        this._handleError(error);
      }
    };
    listener!.elementNode = this;
    listener!.debug = `class:${this.tagName}_${this.nodeId} children`;
    listener!.onSubscribe = (release: () => void) => {
      this._childrenRelease = () => {
        release();
        listener = null;
      };
      this.addHook("BeforeRemove", () => {
        this._childrenRelease?.();
        this._childrenRelease = undefined;
      });
    };
    listener();
  }

  _createDOMNode() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const node = SvgTags.includes(this.tagName)
      ? document.createElementNS(svgNamespace, this.tagName)
      : document.createElement(this.tagName);

    this.domElement = node as HTMLElement;

    if (this._events) {
      for (const key in this._events) this._bindEvent(key as EventName);
    }

    if (this.attributes) {
      Object.values(this.attributes.items!).forEach((attr) => attr.render());
    }
    return node;
  }

  // Bind a DOM listener that dispatches LIVE from this._events, so patch() can
  // swap the handler (e.g. a list item's onClick closure after its data changes)
  // without detaching/reattaching the DOM listener.
  _bindEvent(eventName: EventName): void {
    if (!this.domElement || this._boundEvents.has(eventName)) return;
    this._boundEvents.add(eventName);
    let fn: any = (event: Event) => this._events?.[eventName]?.(event, this);
    this.domElement.addEventListener(eventName, fn);
    this.addHook("BeforeRemove", (n) => {
      n.domElement?.removeEventListener(eventName, fn);
      fn = null;
    });
  }

  _dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    // Fire BeforeRemove so reactive-listener releases (registered as BeforeRemove
    // hooks via onSubscribe) actually run for this node. Descendants are torn
    // down through this recursive _dispose — not through ElementList.remove — so
    // without this their subscriptions to long-lived State/RecordState leak.
    // Skip if the async-removal path in ElementList already fired it.
    if (!this._beforeRemoveFired) {
      this._beforeRemoveFired = true;
      this._hooks.BeforeRemove?.(this, () => {});
    }

    if (this.children) {
      this.children._dispose();
    }

    if (this.styles) {
      this.styles.items!.forEach((rule) => rule.remove());
      this.styles._dispose();
    }

    if (this.attributes) {
      this.attributes._dispose();
    }

    // _onRemove fires for every node in the subtree, not just the directly-removed one.
    this._hooks.Remove?.(this);

    this.domElement = null;
    this._hooks = {};
    this._events = null;
    this._context = {};
    this._metadata = {};
    this.parent = null;
  }
  merge(part: PartialElement) {
    merge(this._context, part._context);
    merge(this._metadata, part._metadata);

    const keys = Object.keys(part);
    for (let i = 0; i < keys.length; i++) {
      const originalKey = keys[i];
      const value = (part as any)[originalKey];
      if (
        [
          "$",
          "_onSchedule",
          "_key",
          "_context",
          "_metadata",
          "style",
          this.tagName,
        ].includes(originalKey)
      ) {
      } else if (
        [
          "_onInit",
          "_onInsert",
          "_onMount",
          "_onBeforeUpdate",
          "_onUpdate",
          "_onBeforeRemove",
          "_onRemove",
          "_onError",
        ].includes(originalKey)
      ) {
        this.addHook(originalKey.substring(3) as keyof HookMap, value);
      } else if (originalKey.startsWith("on")) {
        this.addEvent(
          originalKey.substring(2).toLowerCase() as EventName,
          value,
        );
      } else if (originalKey === "_portal") {
        this._portal = value;
      } else if (
        originalKey === "class" &&
        (typeof value === "string" || typeof value === "function")
      ) {
        // A reactive `class` must MERGE with (not replace) the auto-generated
        // per-node style class set at construction (line ~67) — replacing it
        // outright orphans this element's own `style: {}` object, since the
        // CSS rule is scoped to that auto class name.
        this.attributes!.addClass(value);
      } else {
        this.attributes!.set(originalKey, value);
      }
    }
    if (part.style) {
      this.styles.addCSS(
        part.style || {},
        `.${`${this.tagName}_${this.nodeId}`}`,
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
  patch(rawElement: DomphyElement): void {
    let element: any = deepClone(rawElement);
    element.style = element.style || {};
    element = mergePartial(element);

    // Children / content — recurse so grandchildren are reused/patched too.
    // Reactive function always wins: release old binding and re-setup with the
    // new closure so the node reflects the new data source, not the stale one.
    const content = element[this.tagName];
    if (typeof content === "function") {
      this._childrenRelease?.();
      this._childrenRelease = undefined;
      this._setupFunctionChildren(content);
    } else {
      const next =
        content == null ? [] : Array.isArray(content) ? content : [content];
      this.children.update(next, !!this.domElement, true);
    }

    if (element._context) merge(this._context, element._context);
    if (element._metadata) merge(this._metadata, element._metadata);

    this.styles.patchCSS(element.style || {}, `.${this.tagName}_${this.nodeId}`);

    // Rebuild attributes and events. Events are replaced (live dispatch in
    // _bindEvent reads this._events, so swapping the map is enough); attributes
    // present before but absent now are removed; the auto scope class is kept.
    const autoClass = `${this.tagName}_${this.nodeId}`;
    const reserved = [
      "$",
      "_onSchedule",
      "_key",
      "_context",
      "_metadata",
      "style",
      this.tagName,
    ];
    const hookKeys = [
      "_onInit",
      "_onInsert",
      "_onMount",
      "_onBeforeUpdate",
      "_onUpdate",
      "_onBeforeRemove",
      "_onRemove",
      "_onError",
    ];
    const keep = new Set<string>(["class"]);
    let userClass: string | ((listener: Listener) => string) | null = null;

    this._events = {};
    for (const key of Object.keys(element)) {
      if (reserved.includes(key) || hookKeys.includes(key) || key === "_portal")
        continue;
      const value = element[key];
      if (key.startsWith("on") && typeof value === "function") {
        this.addEvent(key.substring(2).toLowerCase() as EventName, value);
      } else if (
        key === "class" &&
        (typeof value === "string" || typeof value === "function")
      ) {
        userClass = value;
      } else {
        this.attributes!.set(key, value);
        keep.add(key);
      }
    }

    // A reactive userClass must stay reactive here too — a plain string
    // combine (as if it were static) would freeze it at whatever the
    // function happened to return on this one patch call, and never update
    // again since patch() doesn't re-run per listener tick.
    if (typeof userClass === "function") {
      const userClassFn = userClass;
      this.attributes!.set(
        "class",
        (listener: Listener) => `${autoClass} ${userClassFn(listener)}`,
      );
    } else {
      this.attributes!.set(
        "class",
        userClass ? `${autoClass} ${userClass}` : autoClass,
      );
    }

    if (this.attributes!.items) {
      for (const name of Object.keys(this.attributes!.items)) {
        if (!keep.has(name)) this.attributes!.remove(name);
      }
    }

    if (this._events) {
      for (const key in this._events) this._bindEvent(key as EventName);
    }
  }

  // Walk ancestors to find the nearest Error hook. The boundary node receives
  // the error and a `reset` callback that clears its children (allowing it to
  // re-render with fresh data or a fallback). If no handler is found, log to
  // console so errors in reactive children are never silently swallowed.
  _handleError(error: unknown): void {
    let node: ElementNode | null = this;
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

  addEvent(
    name: EventName,
    callback: (event: Event, node: ElementNode) => void,
  ): void {
    this._events = this._events || {};

    const current = this._events[name];
    if (typeof current === "function") {
      this._events[name] = (event: Event, node: ElementNode) => {
        current!(event, node);
        callback(event, node);
      };
    } else {
      this._events[name] = callback;
    }
  }

  addHook<K extends keyof HookMap>(name: K, callback: HookMap[K]): void {
    const current = this._hooks[name];

    if (typeof current === "function") {
      const composed = ((...args: any[]) => {
        (current as Function)(...args);
        (callback as Function)(...args);
      }) as HookMap[K];
      // Preserve the maximum declared arity across composed hooks. Removal logic
      // inspects BeforeRemove.length (>= 2 means the hook owns `done()`, e.g. an
      // exit animation); a naive (...args) wrapper would report 0 and break that.
      try {
        Object.defineProperty(composed, "length", {
          value: Math.max(
            (current as Function).length,
            (callback as Function).length,
          ),
          configurable: true,
        });
      } catch {
        /* length non-configurable on some engines — best effort */
      }
      this._hooks[name] = composed;
    } else {
      this._hooks[name] = callback;
    }
  }
  getRoot(): ElementNode {
    let root: ElementNode = this;
    while (root && root instanceof ElementNode && root.parent) {
      root = root.parent;
    }
    return root;
  }

  getContext(name: string): any {
    let node: ElementNode | null = this;
    while (node && (!node._context || !Object.hasOwn(node._context, name))) {
      node = node.parent;
    }
    return node && node._context ? node._context[name] : undefined;
  }

  setContext(name: string, value: any) {
    this._context = this._context || {};
    this._context[name] = value;
  }

  getMetadata(name: string): any {
    return this._metadata ? this._metadata[name] : undefined;
  }

  setMetadata(key: string, value: any) {
    this._metadata = this._metadata || {};
    this._metadata[key] = value;
  }

  generateCSS(): string {
    if (!this.styles || !this.children) return "";
    let css = this.styles.cssText();
    css += this.children.items
      .map((child) => (child instanceof ElementNode ? child.generateCSS() : ""))
      .join("");
    return css;
  }

  generateHTML(): string {
    if (!this.children || !this.attributes) return "";
    const attributes = this.attributes.generateHTML();
    // Void elements must not emit a closing tag — `<br></br>` is parsed by the
    // HTML tokenizer as two <br>, which corrupts hydration child alignment.
    if ((VoidTags as readonly string[]).includes(this.tagName)) {
      return `<${this.tagName}${attributes}>`;
    }
    const content = this.children.generateHTML();
    return `<${this.tagName}${attributes}>${content}</${this.tagName}>`;
  }

  mount(domElement: HTMLElement, domStyle?: HTMLStyleElement): void {
    if (!domElement) throw new Error("Missing dom node on bind");
    if (
      __DEV__ &&
      !domStyle &&
      this.parent === null &&
      domElement.childNodes.length > 0
    ) {
      console.warn(
        "[Domphy] mount() was called without a style element on already-rendered DOM. Reactive style updates after hydration will be dropped — pass the server-rendered <style> element as the second argument to mount().",
      );
    }
    this.domElement = domElement;

    if (this._events) {
      for (const key in this._events) this._bindEvent(key as EventName);
    }

    if (this.children) {
      this.children.items.forEach((child, i) => {
        const childNode = domElement.childNodes[i];
        if (!childNode) return;
        if (child instanceof ElementNode) {
          child.mount(childNode as HTMLElement);
        } else {
          // Bind the server-rendered text/inline-HTML node so that reactive
          // child updates after hydration can locate and replace it.
          child.domText = childNode;
        }
      });
    }

    // Attach reactive style declarations to the server-rendered stylesheet so
    // post-hydration updates mutate the existing CSSOM rules instead of being
    // silently dropped (StyleProperty._domUpdate needs a bound domRule). Done
    // once from the call that received the style element, walking the whole
    // subtree because per-node selectors are globally unique.
    if (domStyle) {
      const sheet = domStyle.sheet;
      if (sheet)
        this._hydrateStyles(collectCSSRules(sheet.cssRules, new Map()));
    }

    this._hooks.Mount && this._hooks.Mount(this);
  }

  _hydrateStyles(domRuleMap: Map<string, CSSRule>): void {
    this.styles?.hydrate(domRuleMap);
    if (this.children) {
      for (const child of this.children.items) {
        if (child instanceof ElementNode) child._hydrateStyles(domRuleMap);
      }
    }
  }

  render(
    domElement: HTMLElement | SVGElement | DocumentFragment,
  ): HTMLElement | SVGElement {
    const newNode = this._createDOMNode();
    domElement.appendChild(newNode);
    this._hooks.Mount && this._hooks.Mount(this);
    let domStyle = this.getRoot().styles.domStyle;
    const root = domElement.getRootNode();
    const styleParent = root instanceof ShadowRoot ? root : document.head;
    domStyle ||= ensureDomStyle(styleParent);
    this.styles.render(domStyle as HTMLStyleElement);
    this.children.items.forEach((child) => {
      if (child instanceof ElementNode && child._portal) {
        const dom = child._portal!(this.getRoot());
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
      // Root removal must also run BeforeRemove/Remove (and release reactive
      // subscriptions across the whole tree via _dispose), honoring async done().
      const done = () => {
        this.domElement?.remove();
        this._dispose();
      };
      if (this._hooks.BeforeRemove && this.domElement) {
        let called = false;
        const once = () => {
          if (!called) {
            called = true;
            done();
          }
        };
        this._beforeRemoveFired = true;
        this._hooks.BeforeRemove(this, once);
        if ((this._hooks.BeforeRemove as Function).length < 2 && !called)
          once();
        else if (__DEV__ && !called) {
          setTimeout(() => {
            if (!called)
              console.warn(
                "[Domphy] _onBeforeRemove declared a `done` parameter but did not call it within 5s — the element will stay in the DOM. Call done() when cleanup finishes.",
              );
          }, 5000);
        }
      } else {
        done();
      }
    }
  }
}
