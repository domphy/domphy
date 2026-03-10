import { ElementNode } from "./ElementNode.js";
import { selectorSplitter } from "../helpers.js";
import { StyleRule } from "./StyleRule.js";

export class StyleList {
  parent: StyleRule | ElementNode | null;
  items: StyleRule[] = [];
  domStyle: HTMLStyleElement | null = null;

  constructor(parent: StyleRule | ElementNode) {
    this.parent = parent;
  }

  get parentNode(): ElementNode | null {
    let root: any = this.parent;
    while (root && root instanceof StyleRule) {
      root = root.parent;
    }
    return root as ElementNode;
  }

  addCSS(obj: Record<string, any>, parentSelector: string = ""): void {
    if (!this.items || !this.parent) return;
    const basic: Record<string, any> = {};

    function getSelector(selector: string, prev: string): string {
      return selector.startsWith("&")
        ? `${prev}${selector.slice(1)}`
        : `${prev} ${selector}`;
    }

    for (const selector in obj) {
      const value = obj[selector];
      let splitKeys = selectorSplitter(selector);
      for (let key of splitKeys) {
        const currentSelector = getSelector(key, parentSelector);
        if (/^@(container|layer|supports|media)\b/.test(key)) {
          if (typeof value === "object" && value != null) {
            const rule = new StyleRule(key, this.parent);
            rule.styleList!.addCSS(value, parentSelector);
            this.items.push(rule);
          }
        } else if (key.startsWith("@keyframes")) {
          const rule = new StyleRule(key, this.parent);
          rule.styleList!.addCSS(value, "");
          this.items.push(rule);
        } else if (key.startsWith("@font-face")) {
          const rule = new StyleRule(key, this.parent);
          for (const k in value) rule.insertStyle(k, value[k]);
          this.items.push(rule);
        } else if (typeof value === "object" && value != null) {
          const rule = new StyleRule(currentSelector, this.parent);
          this.items.push(rule);
          for (const [k, v] of Object.entries(value)) {
            if (typeof v === "object" && v != null) {
              let newSelector = getSelector(k, currentSelector);
              if (k.startsWith("&")) {
                this.addCSS(v, newSelector);
              } else {
                const r = rule.styleList!.insertRule(newSelector);
                r.styleList!.addCSS(v, newSelector);
              }
            } else {
              rule.insertStyle(k, v);
            }
          }
        } else {
          basic[key] = value;
        }
      }
    }

    if (Object.keys(basic).length) {
      const rule = new StyleRule(parentSelector, this.parent);
      for (const key in basic) rule.insertStyle(key, basic[key]);
      this.items.push(rule);
    }
  }

  cssText(): string {
    if (!this.items) return "";
    return this.items.map((rule) => rule.cssText()).join("");
  }

  insertRule(selector: string): StyleRule {
    if (!this.items || !this.parent) return null as any;
    let rule = this.items.find((rule) => rule.selectorText === selector);
    if (!rule) {
      rule = new StyleRule(selector, this.parent);
      this.items.push(rule);
    }
    return rule;
  }

  mount(domRuleList: CSSRuleList): void {
    if (!this.items) return;
    if (!domRuleList) throw Error("Require domRuleList argument");
    let wrongCount = 0;
    const fixOddEven = (css: string) => css.replace("(odd)", "(2n+1)").replace("(even)", "(2n)");

    this.items.forEach((rule, i) => {
      const index = i - wrongCount;
      const domRule = domRuleList[index];
      if (!domRule) return;
      if (rule.selectorText.startsWith("@") && domRule instanceof CSSKeyframesRule) {
        rule.mount(domRule);
      } else if ("keyText" in domRule) {
        rule.mount(domRule);
      } else if ("selectorText" in domRule) {
        if (domRule.selectorText !== fixOddEven(rule.selectorText)) {
          wrongCount += 1;
        } else {
          rule.mount(domRule);
        }
      } else if ("cssRules" in domRule) {
        rule.mount(domRule as CSSMediaRule);
      }
    });
  }

  render(dom: HTMLStyleElement | CSSGroupingRule) {
    if (dom instanceof HTMLStyleElement) {
      this.domStyle = dom
      this.items.forEach((rule) => rule.render(dom.sheet!));
    } else if (dom instanceof CSSGroupingRule) {
      this.items.forEach((rule) => rule.render(dom));
    }
  }

  _dispose(): void {

    if (this.items) {
      for (let i = 0; i < this.items.length; i++) {
        this.items[i]._dispose();
      }
    }

    this.items = [];
    this.parent = null;
    this.domStyle = null;
  }
}
