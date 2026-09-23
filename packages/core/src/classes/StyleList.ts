import { normalizeSelectorKey, selectorSplitter } from "../helpers.js";
import type { ElementNode } from "./ElementNode.js";
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
    // Conditional at-rules (@media/@container/@supports/@layer) must be inserted
    // AFTER the base property block so that same-specificity rules in the at-rule
    // override the base when the condition matches (later rules win in the cascade).
    const conditionalRules: StyleRule[] = [];

    function getSelector(selector: string, prev: string): string {
      return selector.startsWith("&")
        ? `${prev}${selector.slice(1)}`
        : `${prev} ${selector}`;
    }

    for (const selector in obj) {
      const value = obj[selector];
      const splitKeys = selectorSplitter(selector);
      for (const key of splitKeys) {
        const currentSelector = getSelector(key, parentSelector);
        if (/^@(container|layer|supports|media)\b/.test(key)) {
          if (typeof value === "object" && value != null) {
            const rule = new StyleRule(key, this.parent);
            rule.styleList!.addCSS(value, parentSelector);
            conditionalRules.push(rule);
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
              // A further-nested selector block (whether it starts with '&'
              // or is a plain descendant selector like ".icon") must be
              // flattened as a sibling rule at THIS level, not re-processed
              // as a rule nested inside `rule` -- `rule.styleList` is never
              // rendered for a plain (non-@) selector (see StyleRule.render()),
              // so inserting there silently drops the rule from the live
              // stylesheet on client render, and re-running addCSS against the
              // same already-fully-resolved `newSelector` duplicated the
              // selector text inside itself. `getSelector` already joins `k`
              // onto `currentSelector` correctly for both cases (concat for
              // '&', descendant-space otherwise), so both cases resolve the
              // same way: recurse on `this` with the fully-resolved selector.
              const newSelector = getSelector(k, currentSelector);
              this.addCSS(v, newSelector);
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

    for (const rule of conditionalRules) {
      this.items.push(rule);
    }
  }

  cssText(): string {
    if (!this.items) return "";
    return this.items.map((rule) => rule.cssText()).join("");
  }

  // Reconcile this node's own FLAT (non-selector, non-at-rule) style properties
  // in place: update/add properties present in `obj`, remove properties that
  // were present before and are gone now. Used by ElementNode.patch() when list
  // reconciliation reuses a live node, so a freshly-computed static style object
  // (e.g. from a factory function like `FilterButton(...)` called again with new
  // args) actually reaches the DOM instead of being silently dropped — `addCSS`
  // itself is append-only and would duplicate CSSOM rules if called again.
  //
  // Nested selector blocks (&:hover, @media/@supports/@container/@layer,
  // @keyframes, @font-face) are NOT reconciled here — they are set once at
  // construction and assumed stable across reuse. A value that must change
  // after construction under a nested selector needs its own reactive function
  // (`color: (l) => …`), same as it already did before this method existed.
  patchCSS(obj: Record<string, any>, parentSelector: string = ""): void {
    if (!this.items || !this.parent) return;

    const basic: Record<string, any> = {};
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === "object" && value != null) continue; // nested/@rule block
      basic[key] = value;
    }

    let rule = this.items.find((r) => r.selectorText === parentSelector);
    if (!rule && Object.keys(basic).length > 0) {
      // Adding a rule changes what this node's scope class stands for, and
      // other nodes may be wearing it — take this node private first, then
      // build the rule under its own class.
      const node = this.parentNode;
      if (node?._scopeShared && node.scopeClass) {
        node._detachStyleScope();
        parentSelector = `.${node.scopeClass}`;
        rule = this.items.find((r) => r.selectorText === parentSelector);
      }
    }
    if (!rule) {
      // Same empty guard as addCSS: with no flat properties and no existing
      // rule there is nothing to reconcile. Creating the rule anyway inserted
      // an empty `.x {}` into the live CSSOM — one per patched node per
      // reconciliation pass (8,000 for a single 1,000-row swap) — each later
      // scanned out of the sheet by StyleRule.remove() at dispose time.
      if (Object.keys(basic).length === 0) return;
      rule = new StyleRule(parentSelector, this.parent);
      this.items.push(rule);
    }

    const seen = new Set(Object.keys(basic));
    for (const key in basic) rule.insertStyle(key, basic[key]);

    if (rule.styleBlock) {
      for (const existingKey of Object.keys(rule.styleBlock)) {
        if (!seen.has(existingKey)) rule.removeStyle(existingKey);
      }
    }

    // A brand-new rule has no live CSSOM binding yet — insert it now if this
    // node is already mounted (addCSS's construction-time path relies on a
    // single later styles.render() call that already ran for a reused node).
    const sheet = this.domStyle?.sheet;
    if (!rule.domRule && sheet) rule.render(sheet, true);
  }

  // Rewrite the scope prefix of every rule in this list and of nested lists.
  // Selector text only — nothing touches the live stylesheet. Used at
  // construction to swap the placeholder for the content hash class, and as
  // the middle step of `_reliveScope` below.
  _applyScope(from: string, to: string): void {
    if (!this.items) return;
    for (const rule of this.items) {
      if (rule.selectorText.startsWith(from)) {
        rule.selectorText = to + rule.selectorText.slice(from.length);
      }
      rule.styleList?._applyScope(from, to);
    }
  }

  // Move this node's LIVE rules onto a new scope class, used when the node
  // leaves the shared content scope.
  //
  // Every rule is released and re-inserted, in DECLARATION order — including
  // at-rule wrappers, whose nested rules ride along inside render(). That
  // order is the whole point: addCSS() deliberately emits the base block
  // BEFORE conditional at-rules so a matching `@media` beats it at equal
  // specificity (CSS Cascading L4, order of appearance). Re-inserting only
  // the rules whose SELECTOR carried the class left the `@media` wrapper at
  // its old index while the base block was appended to the end of the sheet,
  // which INVERTED the cascade: a mobile-only `display: block` lost to the
  // base `display: none`, so a drawer backdrop never appeared.
  //
  // Re-inserted with `dedupe` at the top-level sheet: the new class name is a
  // content hash (ElementNode._detachStyleScope), so another node already
  // wearing that same hash — because IT detached to the same real content, or
  // because it never had to detach at all — backs this rule with the SAME
  // CSSOM entry instead of a byte-identical duplicate. Nested containers
  // (@media/@container/@supports/@layer) stay outside the registry, matching
  // StyleList.render()'s own convention for them.
  _reliveScope(from: string, to: string): void {
    if (!this.items) return;
    // Containers must be read before the release nulls each rule's domRule.
    const containers = this.items.map((rule) => rule._domContainer());
    for (const rule of this.items) rule._releaseDomRule();
    this._applyScope(from, to);
    this.items.forEach((rule, index) => {
      const container = containers[index];
      if (container) rule.render(container, container instanceof CSSStyleSheet);
    });
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

  hydrate(domRuleMap: Map<string, CSSRule>): void {
    if (!this.items) return;
    for (const rule of this.items) {
      const domRule = domRuleMap.get(normalizeSelectorKey(rule.selectorText));
      if (domRule) rule.mount(domRule as CSSRule);
    }
  }

  mount(domRuleList: CSSRuleList): void {
    if (!this.items) return;
    if (!domRuleList) throw Error("Require domRuleList argument");
    let wrongCount = 0;
    const fixOddEven = (css: string) =>
      css.replace("(odd)", "(2n+1)").replace("(even)", "(2n)");

    this.items.forEach((rule, i) => {
      const index = i - wrongCount;
      const domRule = domRuleList[index];
      if (!domRule) return;
      if (
        rule.selectorText.startsWith("@") &&
        domRule instanceof CSSKeyframesRule
      ) {
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
      this.domStyle = dom;
      if (!dom.sheet) {
        // A <style> element not yet part of a CONNECTED document has no
        // associated sheet (CSSOM "obtain a CSS style sheet" — e.g. a shadow
        // root whose host hasn't been attached to the document yet). Without
        // this guard every rule below threw insertRule() against `null` into
        // its OWN try/catch in StyleRule.render(), so a node that rendered
        // while detached lost every one of its rules behind N identical
        // "Failed to insert rule" warnings instead of one clear cause.
        console.warn(
          `[Domphy] Styles for <${this.parentNode?.tagName ?? "node"}> were not inserted: its <style> element has no CSS sheet (the shadow root or document it lives in is not connected yet). Render this node after its host is attached to the document.`,
        );
        return;
      }
      // `true`: top-level sheet, so an identical rule already inserted by
      // another node is reused instead of duplicated (see StyleRule's registry).
      this.items.forEach((rule) => rule.render(dom.sheet!, true));
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
