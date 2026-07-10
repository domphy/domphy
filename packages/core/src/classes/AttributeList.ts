import { BooleanAttributes } from "../constants.js";
import type { AttributeValue, Listener } from "../types.js";
import { ElementAttribute } from "./ElementAttribute.js";
import type { ElementNode } from "./ElementNode.js";

export class AttributeList {
  items: Record<string, ElementAttribute> | null = {};
  parent: ElementNode | null;

  constructor(parent: ElementNode) {
    this.parent = parent;
  }

  generateHTML(): string {
    if (!this.items) return "";
    const str = Object.values(this.items)
      .map((attr) => attr.generateHTML())
      .filter(Boolean) // an omitted (null/undefined-valued) attribute emits ""
      .join(" ");
    return str ? ` ${str}` : "";
  }

  get(name: string): any {
    if (!this.items) return undefined;
    return this.items[name]?.value;
  }

  set(name: string, value: AttributeValue): void {
    if (!this.items || !this.parent) return;
    if (this.items[name]) {
      this.items[name].set(value);
    } else {
      this.items[name] = new ElementAttribute(name, value, this.parent);
    }
  }

  addListener(name: string, callback: (value: string | number) => void): void {
    if (this.has(name)) {
      this.items![name].addListener(callback);
    }
  }

  has(name: string): boolean {
    if (!this.items) return false;
    return Object.hasOwn(this.items, name);
  }

  remove(name: string): void {
    if (!this.items) return;

    // Resolve the canonical DOM-facing name (e.g. "ariaCurrent" -> "aria-current")
    // BEFORE disposing the ElementAttribute — removeAttribute() must use the
    // same name render()/setAttribute() used, or the real DOM attribute is
    // left stuck forever for any name camelToKebab()/HtmlAttributeNames changed.
    const domName = this.items[name]?.name ?? name;

    if (this.items[name]) {
      this.items[name]._dispose();
      delete this.items[name];
    }

    if (
      this.parent &&
      this.parent.domElement &&
      this.parent.domElement instanceof Element
    ) {
      this.parent.domElement.removeAttribute(domName);
    }
  }

  _dispose(): void {
    if (this.items) {
      for (const key in this.items) {
        this.items[key]._dispose();
      }
    }
    this.items = null;
    this.parent = null;
  }

  toggle(name: string, force?: boolean): void {
    if (
      !BooleanAttributes.includes(name as (typeof BooleanAttributes)[number])
    ) {
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

  addClass(className: string | ((listener: Listener) => string)): void {
    if (!className) return;
    if (typeof className !== "string" && typeof className !== "function") return;

    const add = (classes: string, newClass: string) => {
      const list = (classes || "").split(" ").filter((e: string) => e);
      !list.includes(newClass) && list.push(newClass);
      return list.join(" ");
    };

    // Read the declared value (not the resolved `.value`) to detect whether
    // the existing "class" binding is reactive — ElementAttribute.set()
    // always invokes a function value immediately and stores only the
    // resolved string as `.value`, so `.get("class")` can never itself be a
    // function; `declaredValue` preserves the original reactive function.
    const declared = this.items?.["class"]?.declaredValue;
    const currentIsFn = typeof declared === "function";
    const current = currentIsFn ? declared : this.get("class");
    const nextIsFn = typeof className === "function";

    // Neither side is reactive — merge as a plain string, same as before.
    if (!currentIsFn && !nextIsFn) {
      this.set("class", add(current, className as string));
      return;
    }

    // Either side is reactive: the merged class must itself be a function so
    // it re-resolves on every listener tick, threading the SAME listener
    // through both sides so each one's own state dependencies (if any) are
    // tracked. Calling a reactive side with no listener (the previous bug
    // here) both breaks its dependency tracking and, at the ElementNode.merge
    // call site, silently drops the auto-generated per-node style class —
    // the element's own `style: {}` object then never reaches the DOM.
    this.set("class", (listener: Listener) =>
      add(
        currentIsFn ? (current as (l: Listener) => string)(listener) : current,
        nextIsFn
          ? (className as (l: Listener) => string)(listener)
          : (className as string),
      ),
    );
  }

  hasClass(className: string): boolean {
    if (!className || typeof className !== "string") return false;
    const current = this.get("class") || "";
    const list = current.split(" ").filter((e: string) => e);
    return list.includes(className);
  }

  toggleClass(className: string): void {
    if (!className || typeof className !== "string") return;
    this.hasClass(className)
      ? this.removeClass(className)
      : this.addClass(className);
  }

  removeClass(className: string): void {
    if (!className || typeof className !== "string") return;
    const current = this.get("class") || "";
    const list: string[] = current.split(" ").filter((e: string) => e);
    const updated = list.filter((cls) => cls !== className);
    updated.length > 0
      ? this.set("class", updated.join(" "))
      : this.remove("class");
  }

  replaceClass(oldClass: string, newClass: string): void {
    if (
      !oldClass ||
      !newClass ||
      typeof oldClass !== "string" ||
      typeof newClass !== "string"
    )
      return;
    if (this.hasClass(oldClass)) {
      this.removeClass(oldClass);
      this.addClass(newClass);
    }
  }
}
