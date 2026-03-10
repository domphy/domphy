import type { DomphyElement, EventName, HookMap, TagName, PartialElement } from "../types.js";
import { AttributeList } from "./AttributeList.js";
import { ElementList } from "./ElementList.js";
import { StyleList } from "./StyleList.js";
import { validate, mergePartial, getTagName, deepClone, ensureDomStyle } from "../helpers.js";
import { merge, hashString } from "../utils.js";

export class ElementNode {
  type = "ElementNode"
  parent: ElementNode | null = null;
  _portal?: (root: ElementNode) => HTMLElement;
  tagName: TagName;
  children = new ElementList(this);
  styles = new StyleList(this);
  attributes = new AttributeList(this);
  domElement?: HTMLElement | null = null;
  _hooks: HookMap = {};
  _events?: { [K in EventName]?: (event: Event, node: ElementNode) => void } | null = null;
  _context?: Record<string, any> = {};
  _metadata?: Record<string, any> = {};
  key?: string | number | null = null;
  nodeId: string

  constructor(domphyElement: DomphyElement, _parent: ElementNode | null = null, index = 0) {
    domphyElement = deepClone(domphyElement)
    validate(domphyElement)
    domphyElement.style = domphyElement.style || {}
    this.parent = _parent;
    this.tagName = getTagName(domphyElement) as TagName;
    domphyElement = mergePartial(domphyElement) as DomphyElement

    this.key = (domphyElement as any)._key ?? null;
    this._context = domphyElement._context || {}
    this._metadata = domphyElement._metadata || {}

    let tempPath = `${this.parent?.getPath()}.${index}`
    const str = JSON.stringify(domphyElement.style || {}, (k, v) => typeof v === "function" ? tempPath : v,);
    this.nodeId = hashString(tempPath + str)

    this.attributes!.addClass(`${this.tagName}_${this.nodeId}`);

    if (domphyElement._onSchedule) domphyElement._onSchedule(this, domphyElement)

    this.merge(domphyElement)

    const children = (domphyElement as any)[this.tagName];

    if (children != null && children != undefined) {
      if (typeof children === "function") {
        let listener: any = () => {
          let input = children(listener)
          this.children!.update(Array.isArray(input) ? input : [input])
        }
        listener!.elementNode = this;
        listener!.onSubscribe = (release: () => void) => this.addHook("BeforeRemove", () => {
          release()
          listener = null
        });
        listener && listener();
      } else {
        this.children!.update(Array.isArray(children) ? children : [children])
      }
    }
    this._hooks.Init && this._hooks.Init(this)
  }

  _createDOMNode() {
    const svgNamespace = "http://www.w3.org/2000/svg"
    const svgTags = ["svg", "circle", "path", "rect", "ellipse",
      "line", "polyline", "polygon", "g", "defs",
      "use", "symbol", "linearGradient", "radialGradient",
      "stop", "clipPath", "mask", "filter", "text",
      "tspan", "textPath", "image", "pattern", "marker",
      "animate", "animateTransform", "animateMotion",
      "feGaussianBlur", "feComposite", "feColorMatrix",
      "feMerge", "feMergeNode", "feOffset", "feFlood",
      "feBlend", "foreignObject"]

    let node = svgTags.includes(this.tagName)
      ? document.createElementNS(svgNamespace, this.tagName)
      : document.createElement(this.tagName)

    this.domElement = node as HTMLElement

    if (this._events) {
      for (const key in this._events) {
        const eventName = key as EventName;
        const handler = this._events[eventName] as (event: Event, node: ElementNode) => void;
        let fn: any = (event: Event) => handler(event, this)
        node.addEventListener(eventName, fn)
        this.addHook("BeforeRemove", (n) => {
          n.domElement!.removeEventListener(eventName, fn)
          fn = null
        })
      }
    }

    if (this.attributes) {
      Object.values(this.attributes.items!).forEach(attr => attr.render())
    }
    return node
  }

  _dispose(): void {

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

    this.domElement = null;
    this._hooks = {};
    this._events = null;
    this._context = {};
    this._metadata = {};
    this.parent = null;
  }
  get pathId(): string {
    return hashString(this.getPath())
  }
  merge(part: PartialElement) {
    merge(this._context, part._context)
    merge(this._metadata, part._metadata)

    const keys = Object.keys(part)
    for (let i = 0; i < keys.length; i++) {
      const originalKey = keys[i];
      const value = (part as any)[originalKey];
      if (["$", "_onSchedule", "_key", "_context", "_metadata", "style", this.tagName].includes(originalKey)) {
        continue
      } else if (["_onInit", "_onInsert", "_onMount", "_onBeforeUpdate", "_onUpdate", "_onBeforeRemove", "_onRemove"].includes(originalKey)) {
        this.addHook(originalKey.substring(3) as keyof HookMap, value);
      } else if (originalKey.startsWith("on")) {
        this.addEvent(originalKey.substring(2).toLowerCase() as EventName, value);
      } else if (originalKey == "_portal") {
        this._portal = value
      } else if (originalKey == "class" && typeof value === "string") {
        this.attributes!.addClass(value);
      } else {
        this.attributes!.set(originalKey, value);
      }
    }
    if (part.style) {
      this.styles.addCSS(part.style || {}, `.${`${this.tagName}_${this.nodeId}`}`);
    }

  }
  getPath(): string {
    let path: number[] = []
    let node: ElementNode = this
    while (node && node.parent) {
      const parent = node.parent
      const index = parent.children!.items.indexOf(node)
      path.push(index)
      node = parent
    }
    return path.reverse().join(".")
  }

  addEvent(name: EventName, callback: (event: Event, node: ElementNode) => void): void {

    this._events = this._events || {}

    let current = this._events[name]
    if (typeof current == "function") {
      this._events[name] = (event: Event, node: ElementNode) => {
        current!(event, node)
        callback(event, node)
      }
    } else {
      this._events[name] = callback
    }
  }

  addHook<K extends keyof HookMap>(name: K, callback: HookMap[K]): void {
    const current = this._hooks[name];

    if (typeof current === "function") {
      this._hooks[name] = ((...args: any[]) => {
        (current as Function)(...args);
        (callback as Function)(...args);
      }) as HookMap[K];
    } else {
      this._hooks[name] = callback;
    }
  }
  getRoot(): ElementNode {
    let root: ElementNode = this;
    while (root && root instanceof ElementNode && root.parent) {
      root = root.parent;
    }
    return root
  }

  getContext(name: string): any {
    let node: ElementNode | null = this;
    while (node && (!node._context || !Object.prototype.hasOwnProperty.call(node._context, name))) {
      node = node.parent;
    }
    return node && node._context ? node._context[name] : undefined;
  }

  setContext(name: string, value: any) {
    this._context = this._context || {}
    this._context[name] = value;
  }

  getMetadata(name: string): any {
    return this._metadata ? this._metadata[name] : undefined;
  }

  setMetadata(key: string, value: any) {
    this._metadata = this._metadata || {}
    this._metadata[key] = value;

  }

  generateCSS(): string {
    if (!this.styles || !this.children) return "";
    let css = this.styles.cssText()
    css += this.children.items.map(child => child instanceof ElementNode ? child.generateCSS() : "").join("")
    return css
  }

  generateHTML(): string {
    if (!this.children || !this.attributes) return "";
    let content = this.children.generateHTML();
    const attributes = this.attributes.generateHTML();
    return `<${this.tagName}${attributes}>${content}</${this.tagName}>`;
  }

  mount(domElement: HTMLElement, domStyle?: HTMLStyleElement): void {
    if (!domElement) throw new Error("Missing dom node on bind");
    this.domElement = domElement;

    if (this._events) {
      for (const key in this._events) {
        const eventName = key as EventName;
        const handler = this._events[eventName] as (event: Event, node: ElementNode) => void;
        let fn: any = (event: Event) => handler(event, this)
        domElement.addEventListener(eventName, fn)
        this.addHook("BeforeRemove", (n) => {
          n.domElement!.removeEventListener(eventName, fn)
          fn = null
        })
      }
    }

    if (this.children) {
      this.children.items.forEach((child, i) => {
        const childNode = domElement.childNodes[i];
        if (childNode instanceof Node && child instanceof ElementNode) {
          child.mount(childNode as HTMLElement, domStyle);
        }
      });
    }

    this._hooks.Mount && this._hooks.Mount(this)
  }

  render(domElement: HTMLElement | SVGElement | DocumentFragment, domStyle: HTMLStyleElement | null = null): HTMLElement | SVGElement {
    const newNode = this._createDOMNode();
    domElement.appendChild(newNode)
    this._hooks.Mount && this._hooks.Mount(this)
    domStyle ||= this.getRoot().styles.domStyle
    let root = domElement.getRootNode()
    const styleParent = root instanceof ShadowRoot ? root : document.head
    domStyle ||= ensureDomStyle(styleParent)
    this.styles.render(domStyle as HTMLStyleElement)
    this.children.items.forEach(child => {
      if (child instanceof ElementNode && child._portal) {
        let dom = child._portal!(this.getRoot())
        dom && child.render(dom)
      } else {
        child.render(newNode)
      }
    })
    return newNode;
  }

  remove() {
    if (this.parent) {
      this.parent.children.remove(this)

    } else {
      this.domElement?.remove()
      this._dispose();
    }
  }
}
