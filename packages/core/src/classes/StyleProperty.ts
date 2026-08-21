import { PrefixCSS } from "../constants.js";
import { camelToKebab } from "../helpers.js";
import type { Listener, StyleValue } from "../types.js";
import { runUntracked } from "./Collector.js";
import type { StyleRule } from "./StyleRule.js";

// Style values are interpolated raw into generateCSS() / insertRule()
// strings. `}` closes the rule, `;` starts another declaration, and
// `</style>` breaks out of the host <style> element — same threat model
// as theme assertCssSafe. CSS hex escapes neutralize the characters
// without changing how the CSS parser reconstructs the intended value.
function escapeCssValue(value: string | number): string {
  const text = String(value);
  if (!/[;}]|<\/style/i.test(text)) return text;
  return text
    .replace(/<\/style/gi, "\\3C /style")
    .replace(/;/g, "\\3B ")
    .replace(/}/g, "\\7D ");
}

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
  // Declared reactive function, kept so a pre-mount (SSR generate) evaluation
  // can stay untracked and the live stylesheet path can subscribe later.
  private _fn: ((listener: Listener) => string | number) | null = null;
  private _bound = false;

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
    this._fn = null;
    this._bound = false;
    this.value = "";
    this.parentRule = null as any;
  }

  private _bind(fn: (listener: Listener) => string | number): void {
    const listener = (() => {
      if (!this.parentRule || this.parentRule.parentNode?._disposed) return;
      this.value = fn(listener);
      this._domUpdate();
    }) as unknown as Listener;

    listener.onSubscribe = (release: () => void) => {
      this._releases.push(release);
    };

    listener.elementNode = this.parentRule!.root!;
    listener.debug = `class:${this.parentRule?.root?.tagName}_${this.parentRule?.root?.nodeId} style:${this.name}`;
    this.value = fn(listener);
    this._bound = true;
  }

  // Subscribe a pre-mount reactive value once the rule has a live CSSOM
  // binding (client render / hydration). SSR generateCSS/HTML never calls
  // this, so those one-shot trees do not leak State listeners.
  activate(): void {
    if (!this._fn || this._bound) return;
    this._bind(this._fn);
    this._domUpdate();
  }

  set(value: StyleValue): void {
    // Drop any previous reactive subscription(s) before (re)binding.
    if (this._releases.length) {
      for (const release of this._releases) release();
      this._releases = [];
    }
    this._bound = false;
    this._fn = null;

    if (typeof value === "function") {
      this._fn = value;
      // A live (mounted) node must subscribe now. A generateCSS/HTML tree
      // has no DOM — resolve once, untracked, and leave subscription to
      // activate() on render/hydrate.
      if (this.parentRule?.parentNode?.domElement) {
        this._bind(value);
      } else {
        // Listener is a function (State.get subscribes only on a function).
        // Attach elementNode so tag-dependent styles (heading fontSize)
        // resolve during generateCSS; drop any accidental subscriptions so
        // discarded SSR trees do not leak.
        const stub = (() => {}) as unknown as Listener;
        stub.elementNode = this.parentRule!.root!;
        const transient: (() => void)[] = [];
        stub.onSubscribe = (release) => {
          transient.push(release);
        };
        this.value = runUntracked(() => value(stub));
        for (const release of transient) release();
      }
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
    const cssValue = escapeCssValue(this.value as string | number);
    let str = `${this.cssName}: ${cssValue}`;
    if (PrefixCSS[this.name]) {
      PrefixCSS[this.name].forEach((prefix) => {
        str += `; -${prefix}-${this.cssName}: ${cssValue}`;
      });
    }
    return str;
  }
}
