import { PrefixCSS } from "../constants.js";
import { camelToKebab } from "../helpers.js";
import type { Listener, StyleValue } from "../types.js";
import type { StyleRule } from "./StyleRule.js";

export class StyleProperty {
  name: string;
  cssName: string;
  value: StyleValue = "";
  parentRule: StyleRule;
  // Release handle for the reactive listener's state subscription, so a re-set
  // (e.g. StyleList.patchCSS() replacing a reactive value on a reused node) can
  // drop the old listener instead of leaking it on the long-lived State until
  // node removal. Mirrors ElementAttribute's `_releases` pattern.
  private _release: (() => void) | null = null;

  constructor(name: string, value: StyleValue, parentRule: StyleRule) {
    this.name = name;
    this.cssName = camelToKebab(name);
    this.parentRule = parentRule;
    this.set(value);
  }

  _domUpdate(): void {
    if (!this.parentRule) return;
    const domRule = this.parentRule.domRule;

    if (domRule && (domRule as CSSStyleRule).style) {
      const style: CSSStyleDeclaration = (domRule as CSSStyleRule).style;
      style.setProperty(this.cssName, String(this.value));

      if (PrefixCSS[this.name]) {
        PrefixCSS[this.name].forEach((prefix) => {
          style.setProperty(`-${prefix}-${this.cssName}`, String(this.value));
        });
      }
    }
  }
  _dispose(): void {
    this._release?.();
    this._release = null;
    this.value = "";
    this.parentRule = null as any;
  }

  set(value: StyleValue): void {
    // Drop any previous reactive subscription before (re)binding.
    this._release?.();
    this._release = null;

    if (typeof value === "function") {
      let listener = (() => {
        if (!this.parentRule || this.parentRule.parentNode?._disposed) return;
        this.value = value(listener);
        this._domUpdate();
      }) as unknown as Listener;

      listener.onSubscribe = (release: () => void) => {
        this._release = release;
      };

      listener.elementNode = this.parentRule!.root!;
      listener.debug = `class:${this.parentRule?.root?.tagName}_${this.parentRule?.root?.nodeId} style:${this.name}`;
      this.value = value(listener);
    } else {
      this.value = value;
    }

    this._domUpdate();
  }

  remove(): void {
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
    delete this.parentRule.styleBlock![this.name];
    this._dispose();
  }

  cssText(): string {
    let str = `${this.cssName}: ${this.value}`;
    if (PrefixCSS[this.name]) {
      PrefixCSS[this.name].forEach((prefix) => {
        str += `; -${prefix}-${this.cssName}: ${this.value}`;
      });
    }
    return str;
  }
}
