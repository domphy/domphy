import { escapeHTML, camelToKebab } from "../helpers.js";
import { BooleanAttributes, CamelAttributes } from "../constants.js";
import type { ElementNode } from "./ElementNode.js"
import { type AttributeValue } from "../types.js"

export class ElementAttribute {
  readonly name: string;
  readonly isBoolean: boolean;
  value: any;
  parent: ElementNode;
  constructor(name: string, value: any, parent: any) {
    this.parent = parent;
    this.isBoolean = (BooleanAttributes as readonly string[]).includes(name);
    if (CamelAttributes.includes(name)) {
      this.name = name
    } else {
      this.name = camelToKebab(name)
    }
    this.value = undefined;
    this.set(value);
  }

  render(): void {
    if (!this.parent || !this.parent.domElement) return;
    const domElement = this.parent.domElement;

    const mutateAttrs = ["value"];
    if (this.isBoolean) {
      if (this.value === false || this.value == null) {
        domElement.removeAttribute(this.name)
      } else {
        domElement.setAttribute(this.name, this.value === true ? "" : this.value)
      }
    } else if (this.value == null) {
      domElement.removeAttribute(this.name);
    } else if (mutateAttrs.includes(this.name)) {
      (domElement as any)[this.name] = this.value;
    } else {
      domElement.setAttribute(this.name, this.value);
    }
  }

  set(value: AttributeValue): void {
    if (value == null) {
      this.value = null;
      this.render();
      return;
    }
    if (typeof value === "string" && /<\/?[a-z][\s\S]*>/i.test(value)) {
      this.value = escapeHTML(value);
    } else if (typeof value == "function") {
      let listener: any = () => {
        if (!listener) return;
        this.value = this.isBoolean ? Boolean((value as Function)()) : (value as Function)();
        this.render();
      };

      listener.elementNode = this.parent!;

      listener.onSubscribe = (release: () => void) => {
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

  remove(): void {
    if (this.parent && this.parent.attributes) {
      this.parent.attributes.remove(this.name);
    }
    this._dispose();
  }

  _dispose(): void {
    this.value = null;
    this.parent = null as any
  }

  generateHTML(): string {
    const { name, value } = this;
    if (this.isBoolean) {
      return value ? `${name}` : "";
    } else {
      const val = Array.isArray(value) ? JSON.stringify(value) : value;
      return `${name}="${escapeHTML(String(val))}"`;
    }
  }
}