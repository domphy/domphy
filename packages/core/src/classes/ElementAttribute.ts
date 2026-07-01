import { BooleanAttributes, CamelAttributes } from "../constants.js";
import { camelToKebab, escapeHTML } from "../helpers.js";
import type { AttributeValue } from "../types.js";
import type { ElementNode } from "./ElementNode.js";
import { Notifier } from "./Notifier.js";

export class ElementAttribute {
  readonly name: string;
  readonly isBoolean: boolean;
  value: any;
  parent: ElementNode;
  _notifier = new Notifier();
  // Release handles for the reactive listener's state subscriptions, so a
  // re-set (e.g. patch() replacing a reactive value) can drop the old listener
  // instead of leaking it on the long-lived State until node removal.
  private _releases: (() => void)[] = [];

  constructor(name: string, value: any, parent: any) {
    this.parent = parent;
    this.isBoolean = (BooleanAttributes as readonly string[]).includes(name);
    if (CamelAttributes.includes(name)) {
      this.name = name;
    } else {
      this.name = camelToKebab(name);
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
        domElement.removeAttribute(this.name);
      } else {
        domElement.setAttribute(
          this.name,
          this.value === true ? "" : this.value,
        );
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
    const prev = this.value;

    // Drop any previous reactive subscription before (re)binding.
    if (this._releases.length) {
      for (const release of this._releases) release();
      this._releases = [];
    }

    if (value == null) {
      this.value = null;
    } else if (typeof value === "function") {
      let listener: any = () => {
        if (!this.parent || this.parent._disposed) return;
        const p = this.value;
        // Re-pass `listener` so states read only on a later run (conditional
        // dependencies) get subscribed too — matching children/style paths.
        this.value = this.isBoolean
          ? Boolean((value as Function)(listener))
          : (value as Function)(listener);
        this.render();
        if (p !== this.value) this._notifier.notify(this.name, this.value);
      };

      listener.elementNode = this.parent!;
      listener.debug = `class:${this.parent?.tagName}_${this.parent?.nodeId} attribute:${this.name}`;

      listener.onSubscribe = (release: () => void) => {
        this._releases.push(release);
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
    if (prev !== this.value) this._notifier.notify(this.name, this.value);
  }

  addListener(callback: (value: any) => void): void {
    const handler = callback as any;
    handler.onSubscribe = (release: () => void) =>
      this.parent?.addHook("BeforeRemove", release);
    this._notifier.addListener(this.name, handler);
  }

  remove(): void {
    if (this.parent && this.parent.attributes) {
      this.parent.attributes.remove(this.name);
    }
    this._dispose();
  }

  _dispose(): void {
    this._notifier._dispose();
    this.value = null;
    this.parent = null as any;
  }

  generateHTML(): string {
    const { name, value } = this;
    if (this.isBoolean) {
      return value ? `${name}` : "";
    }
    // Match render()'s live-DOM behavior (removeAttribute on null/undefined):
    // an attribute whose reactive value resolves to null/undefined is OMITTED,
    // not stringified as the literal text "null"/"undefined" — that literal
    // text is a real value to a screen reader (e.g. any non-token
    // aria-current is read as "true"), so it must never be emitted.
    if (value == null) return "";
    const val = Array.isArray(value) ? JSON.stringify(value) : value;
    return `${name}="${escapeHTML(String(val))}"`;
  }
}
