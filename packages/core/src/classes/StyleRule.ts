import type { ElementNode } from "./ElementNode.js";
import { StyleList } from "./StyleList.js";
import { StyleProperty } from "./StyleProperty.js";

export class StyleRule {
  selectorText: string;
  domRule: CSSRule | CSSMediaRule | CSSKeyframesRule | null = null;
  // Hint: the index `domRule` had in its sheet's cssRules when render()
  // inserted it. Any earlier insertRule/deleteRule shifts it, so remove()
  // verifies identity at the hinted slot before trusting it and falls back
  // to the identity scan otherwise. -1 = no hint (e.g. SSR-hydrated rules).
  _domIndex = -1;
  styleList: StyleList | null;
  styleBlock: Record<string, StyleProperty> | null = {};
  parent: StyleRule | ElementNode | null;

  constructor(selectorText: string, parent: StyleRule | ElementNode) {
    this.selectorText = selectorText;
    this.styleList = new StyleList(this);
    this.parent = parent;
  }

  _dispose(): void {
    if (this.styleBlock) {
      for (const prop of Object.values(this.styleBlock)) {
        prop._dispose();
      }
    }

    if (this.styleList) {
      this.styleList._dispose();
    }

    this.styleBlock = null;
    this.styleList = null;
    this.domRule = null;
    this.parent = null;
  }

  get root() {
    let node = this.parent;
    while (node instanceof StyleRule) {
      node = node.parent;
    }
    return node;
  }

  get parentNode(): ElementNode | null {
    let root: any = this.parent;
    while (root && root instanceof StyleRule) {
      root = root.parent;
    }
    return root as ElementNode;
  }

  insertStyle(name: string, val: any): void {
    if (!this.styleBlock) return;
    if (this.styleBlock[name]) {
      this.styleBlock[name].set(val);
    } else {
      this.styleBlock[name] = new StyleProperty(name, val, this);
    }
  }

  removeStyle(name: string): void {
    if (!this.styleBlock) return;
    if (this.styleBlock[name]) {
      this.styleBlock[name].remove();
    }
  }

  cssText(): string {
    if (!this.styleBlock || !this.styleList) return "";
    const styleStr = Object.values(this.styleBlock)
      .map((decl) => decl.cssText())
      .join(";");
    const nested = this.styleList.cssText();
    return `${this.selectorText} { ${styleStr} ${nested} } `;
  }

  mount(domRule: CSSRule | CSSKeyframesRule): void {
    if (!domRule || !this.styleList) return;
    this.domRule = domRule;
    if ("cssRules" in domRule) {
      this.styleList.mount(domRule.cssRules as CSSRuleList);
    }
  }

  remove(): void {
    const domRule = this.domRule;
    const sheet = domRule?.parentStyleSheet;
    if (domRule && sheet) {
      const rules = sheet.cssRules;
      // Fast path: trust the insertion-index hint only after an identity
      // check — earlier insertions/deletions shift every later rule's index.
      let index = this._domIndex;
      if (index < 0 || index >= rules.length || rules[index] !== domRule) {
        index = -1;
        for (let i = 0; i < rules.length; i++) {
          if (rules[i] === domRule) {
            index = i;
            break;
          }
        }
      }
      if (index >= 0) sheet.deleteRule(index);
    }
    this._dispose();
  }

  render(domSheet: CSSStyleSheet | CSSGroupingRule) {
    if (!this.styleBlock || !this.styleList) return;
    const styleStr = Object.values(this.styleBlock)
      .map((decl) => decl.cssText())
      .join(";");
    try {
      if (!this.selectorText.startsWith("@")) {
        const css = `${this.selectorText} { ${styleStr} }`;
        const index = domSheet.insertRule(css, domSheet.cssRules.length);
        this._domIndex = index;
        const domRule = domSheet.cssRules[index];
        if (domRule && "selectorText" in domRule) {
          this.mount(domRule);
        }
      } else if (
        /^@(media|supports|container|layer)\b/.test(this.selectorText)
      ) {
        const index = domSheet.insertRule(
          `${this.selectorText} {}`,
          domSheet.cssRules.length,
        );
        this._domIndex = index;
        const domRule = domSheet.cssRules[index];
        if ("cssRules" in domRule) {
          this.mount(domRule as CSSGroupingRule);
          this.styleList.render(domRule as CSSGroupingRule);
        }
      } else if (
        this.selectorText.startsWith("@keyframes") ||
        this.selectorText.startsWith("@font-face")
      ) {
        const css = this.cssText();
        const index = domSheet.insertRule(css, domSheet.cssRules.length);
        this._domIndex = index;
        const domRule = domSheet.cssRules[index];
        this.mount(domRule);
      }
    } catch (err) {
      console.warn("Failed to insert rule:", this.selectorText, err);
    }
  }
}
