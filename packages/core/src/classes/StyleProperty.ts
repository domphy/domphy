import type { StyleRule } from "./StyleRule.js";
import type { StyleValue } from "../types.js";
import { camelToKebab } from "../helpers.js";
import { PrefixCSS } from "../constants.js";
import { Listener } from "../types.js"

export class StyleProperty {
  name: string;
  cssName: string;
  value: StyleValue = "";
  parentRule: StyleRule;

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
      let style: CSSStyleDeclaration = (domRule as CSSStyleRule).style;
      style.setProperty(this.cssName, String(this.value));

      if (PrefixCSS[this.name]) {
        PrefixCSS[this.name].forEach((prefix) => {
          style.setProperty(`-${prefix}-${this.cssName}`, String(this.value));
        });
      }
    }
  }
  _dispose(): void {
    this.value = "";
    this.parentRule = null as any;
  }

  set(value: StyleValue): void {

    if (typeof value === "function") {
      let listener = (() => {
        if (!this.parentRule || this.parentRule.parentNode?._disposed) return;
        this.value = value(listener);
        this._domUpdate();
      }) as unknown as Listener;

      listener.onSubscribe = (release: () => void) => {
        this.parentRule.parentNode?.addHook("BeforeRemove", () => {
          release();
          listener = null!;
        });
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