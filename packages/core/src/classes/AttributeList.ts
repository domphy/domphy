import type { ElementNode } from "./ElementNode.js";
import { ElementAttribute } from "./ElementAttribute.js";
import { BooleanAttributes } from "../constants.js";
import { Notifier } from "./Notifier.js"
import { AttributeValue } from "../types.js"

export class AttributeList {
  _notifier = new Notifier()

  items: Record<string, ElementAttribute> | null = {};
  parent: ElementNode | null;

  constructor(parent: ElementNode) {
    this.parent = parent;
  }

  generateHTML(): string {
    if (!this.items) return "";
    const str = Object.values(this.items)
      .map((attr) => attr.generateHTML())
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
      this.parent.domElement && this._notifier.notify(name, this.items[name].value)
    } else {
      this.items[name] = new ElementAttribute(name, value, this.parent);
    }
  }

  onChange(name: string, callback: (value: string | number) => void): void {
    if (this.has(name) && this.parent?.domElement) {
      const handler = callback as any
      handler.onSubscribe = (release: () => void) => this.parent?.addHook("BeforeRemove", release);
      this._notifier.addListener(name, handler)
    }
  }

  has(name: string): boolean {
    if (!this.items) return false;
    return Object.prototype.hasOwnProperty.call(this.items, name);
  }

  remove(name: string): void {
    if (!this.items) return;

    if (this.items[name]) {
      this.items[name]._dispose();
      delete this.items[name];
    }

    if (this.parent && this.parent.domElement && this.parent.domElement instanceof Element) {
      this.parent.domElement.removeAttribute(name);
    }
  }

  _dispose(): void {

    if (this.items) {
      for (const key in this.items) {
        this.items[key]._dispose();
      }
    }
    this._notifier._dispose()
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

  addClass(className: string): void {
    if (!className || typeof className !== "string") return;

    const add = (classes: string, newClass: string) => {
      const list = (classes || "").split(" ").filter((e: string) => e);
      !list.includes(newClass) && list.push(className)
      return list.join(" ")
    }

    let current = this.get("class");

    if (typeof current === "function") {
      this.set("class", () => add(current(), className));
    } else {
      this.set("class", add(current, className))
    }
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