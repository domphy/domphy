import { PrefixCSS } from "../constants.js";
import { camelToKebab } from "../helpers.js";
import type { Listener, StyleValue } from "../types.js";
import type { StyleRule } from "./StyleRule.js";

export class StyleProperty {
  name: string;
  cssName: string;
  value: StyleValue = "";
  parentRule: StyleRule;
  // Release handles for the reactive listener's state subscriptions, so a
  // re-set (e.g. StyleList.patchCSS() replacing a reactive value on a reused
  // node) can drop the old listener(s) instead of leaking them on the
  // long-lived State(s) until node removal. A single reactive style function
  // can subscribe to MULTIPLE states in one evaluation (e.g.
  // `transform: (l) => \`translate(${x.get(l)}px, ${y.get(l)}px)\``), so
  // onSubscribe can fire more than once per set() call -- every release must
  // be kept, not just the last one. Mirrors ElementAttribute's `_releases`
  // array pattern.
  private _releases: (() => void)[] = [];

  constructor(name: string, value: StyleValue, parentRule: StyleRule) {
    this.name = name;
    // CSS custom properties (`--fooBar`) are case-sensitive and never
    // kebab-cased by the platform itself — running one through
    // camelToKebab() would mangle it (e.g. "--siteHeaderHeight" ->
    // "--site-header-height"), silently breaking every `var(--siteHeaderHeight)`
    // reference elsewhere in the same style tree.
    this.cssName = name.startsWith("--") ? name : camelToKebab(name);
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
    if (this._releases.length) {
      for (const release of this._releases) release();
      this._releases = [];
    }
    this.value = "";
    this.parentRule = null as any;
  }

  set(value: StyleValue): void {
    // Drop any previous reactive subscription(s) before (re)binding.
    if (this._releases.length) {
      for (const release of this._releases) release();
      this._releases = [];
    }

    if (typeof value === "function") {
      const listener = (() => {
        if (!this.parentRule || this.parentRule.parentNode?._disposed) return;
        this.value = value(listener);
        this._domUpdate();
      }) as unknown as Listener;

      listener.onSubscribe = (release: () => void) => {
        this._releases.push(release);
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
