import type { ElementNode } from "./ElementNode.js";
import { StyleList } from "./StyleList.js";
import { StyleProperty } from "./StyleProperty.js";

// A selector carrying a pseudo-element/pseudo-class the engine does not know is
// invalid, and `CSSStyleSheet.insertRule()` reports that as a SyntaxError
// (CSSOM §6.2: "if the rule cannot be parsed, throw a SyntaxError"). Each engine
// only knows its OWN vendor prefixes, so a patch that styles a native control —
// `input[type=range]` needs `::-webkit-slider-thumb` AND `::-moz-range-track` —
// always ships selectors the current engine will reject. That rejection is the
// intended cross-engine no-op, not an author mistake: warning about it logged
// three times per page load for `inputRange()` in Chromium. Non-vendor
// selectors that fail to parse are still real bugs and still warn.
const VENDOR_PREFIXED_SELECTOR = /[:@]-(webkit|moz|ms|o)-/i;

// Shared-rule registry, one Map per live stylesheet (document head or shadow
// root — each has its own <style>, so each gets its own registry).
//
// Two ElementNodes that produce a BYTE-IDENTICAL rule — the same auto class and
// the same declarations, which is what mounting one component twice produces,
// since `nodeId` hashes the path from the root and both trees share it — used to
// insert that rule once EACH. Measured in jsdom with @domphy/blocks: mounting
// `sidebarLeftRight` twice put 1223 rules in the sheet, 612 of them exact
// duplicates, and every insertRule() costs a style recalculation (~2ms per rule
// in jsdom). The sheet grew linearly with mount count.
//
// Entries are refcounted: the rule is deleted only when the LAST StyleRule
// using it is removed. A rule is shared only while it stays byte-identical for
// every holder — the first write that would change it moves its node off the
// shared scope class first (ElementNode._detachStyleScope, called from
// StyleProperty), which re-inserts that node's rules under a private selector.
type SharedEntry = { rule: CSSRule; count: number };
const sheetRegistries = new WeakMap<CSSStyleSheet, Map<string, SharedEntry>>();

function registryFor(sheet: CSSStyleSheet): Map<string, SharedEntry> {
  let registry = sheetRegistries.get(sheet);
  if (!registry) {
    registry = new Map();
    sheetRegistries.set(sheet, registry);
  }
  return registry;
}

export class StyleRule {
  selectorText: string;
  domRule: CSSRule | CSSMediaRule | CSSKeyframesRule | null = null;
  // Hint: the index `domRule` had in its sheet's cssRules when render()
  // inserted it. Any earlier insertRule/deleteRule shifts it, so remove()
  // verifies identity at the hinted slot before trusting it and falls back
  // to the identity scan otherwise. -1 = no hint (e.g. SSR-hydrated rules).
  _domIndex = -1;
  // Registry key while this rule's `domRule` is SHARED with other StyleRules
  // (see the registry above). null = this rule owns its CSSOM rule outright.
  _sharedKey: string | null = null;
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
    if (this.styleBlock) {
      for (const prop of Object.values(this.styleBlock)) {
        prop.activate();
      }
    }
    if ("cssRules" in domRule) {
      this.styleList.mount(domRule.cssRules as CSSRuleList);
    }
  }

  // The registry key for this rule: exactly the text render() would insert.
  // Byte-identical text is what makes two rules interchangeable.
  _cssKey(): string {
    if (!this.styleBlock) return this.selectorText;
    if (this.selectorText.startsWith("@")) return this.cssText();
    const declarations = Object.values(this.styleBlock)
      .map((decl) => decl.cssText())
      .join(";");
    return `${this.selectorText} { ${declarations} }`;
  }

  // Adopt a CSSOM rule this StyleRule did NOT insert and may be sharing with
  // other nodes — the hydration path, where one server-emitted rule backs every
  // node whose rule text was identical (generateCSS de-duplicates). Refcounting
  // it here is what stops the first node's removal from deleting a rule its
  // siblings still need, and keying it exactly as render() would lets a node
  // rendered later on the client join the same entry instead of inserting a
  // second copy.
  _adoptShared(domRule: CSSRule): void {
    const sheet = domRule.parentStyleSheet as CSSStyleSheet | null;
    if (!sheet) return;
    const key = this._cssKey();
    const registry = registryFor(sheet);
    const entry = registry.get(key);
    if (entry) {
      if (entry.rule !== domRule) return;
      entry.count++;
    } else {
      registry.set(key, { rule: domRule, count: 1 });
    }
    this._sharedKey = key;
  }

  // Give up this rule's claim on its CSSOM rule, deleting it from the sheet
  // only when no other StyleRule still holds it. The single place refcounts
  // are decremented — remove(), re-scoping and copy-on-write all go through it.
  // The CSSOM object this rule actually lives in: the enclosing group rule for
  // anything nested (a declaration block inside `@media`), otherwise the sheet.
  // Deleting or re-inserting against the sheet when the rule sits inside a
  // group is how a rescoped `@media` child escaped its own media query.
  _domContainer(): CSSStyleSheet | CSSGroupingRule | null {
    const domRule = this.domRule;
    if (!domRule) return null;
    return (
      ((domRule.parentRule as CSSGroupingRule | null) ??
        (domRule.parentStyleSheet as CSSStyleSheet | null)) ||
      null
    );
  }

  _releaseDomRule(): void {
    const domRule = this.domRule;
    const key = this._sharedKey;
    const container = this._domContainer();
    const sheet = domRule?.parentStyleSheet as CSSStyleSheet | null;
    this._sharedKey = null;
    this.domRule = null;
    if (!domRule || !container) return;
    if (key && sheet) {
      const registry = sheetRegistries.get(sheet);
      const entry = registry?.get(key);
      if (entry) {
        entry.count--;
        // Other nodes still use this rule — leave it in the sheet.
        if (entry.count > 0) return;
        registry!.delete(key);
      }
    }
    const rules = container.cssRules;
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
    if (index >= 0) container.deleteRule(index);
    this._domIndex = -1;
  }

  remove(): void {
    this._releaseDomRule();
    this._dispose();
  }

  // `dedupe` is passed only for a top-level stylesheet target (StyleList.render
  // / patchCSS): an identical rule already in that sheet is reused instead of
  // inserted again. At-rules are excluded — a `@media` wrapper is inserted
  // EMPTY and filled afterwards, so two nodes sharing the wrapper would pour
  // both their declaration sets into one block.
  render(domSheet: CSSStyleSheet | CSSGroupingRule, dedupe = false) {
    if (!this.styleBlock || !this.styleList) return;
    const styleStr = Object.values(this.styleBlock)
      .map((decl) => decl.cssText())
      .join(";");
    try {
      if (!this.selectorText.startsWith("@")) {
        const css = `${this.selectorText} { ${styleStr} }`;
        const registry = dedupe
          ? registryFor(domSheet as CSSStyleSheet)
          : undefined;
        const shared = registry?.get(css);
        if (shared) {
          shared.count++;
          this._sharedKey = css;
          this._domIndex = -1;
          this.mount(shared.rule);
          return;
        }
        const index = domSheet.insertRule(css, domSheet.cssRules.length);
        this._domIndex = index;
        const domRule = domSheet.cssRules[index];
        if (domRule && "selectorText" in domRule) {
          if (registry) {
            registry.set(css, { rule: domRule, count: 1 });
            this._sharedKey = css;
          }
          this.mount(domRule);
        }
      } else if (
        /^@(media|supports|container|layer)\b/.test(this.selectorText)
      ) {
        // Byte-identical content — wrapper AND everything nested inside it —
        // is shared the same way a plain rule is, keyed by the FULL text
        // (this.cssText()) rather than just the wrapper selector: two nodes
        // producing the same `@media (...)` with DIFFERENT nested
        // declarations must not collapse onto one CSSOM rule. A later write
        // to a nested reactive declaration goes through the ordinary
        // element-level detach (StyleProperty._detachIfChanging), which
        // reaches the owning ElementNode through any number of nested
        // StyleRules and re-inserts the node's whole style tree — this
        // wrapper included — fresh, so sharing costs nothing once a value
        // actually diverges.
        const css = this.cssText();
        const registry = dedupe
          ? registryFor(domSheet as CSSStyleSheet)
          : undefined;
        const shared = registry?.get(css);
        if (shared) {
          shared.count++;
          this._sharedKey = css;
          this._domIndex = -1;
          this.mount(shared.rule as CSSGroupingRule);
          return;
        }
        const index = domSheet.insertRule(
          `${this.selectorText} {}`,
          domSheet.cssRules.length,
        );
        this._domIndex = index;
        const domRule = domSheet.cssRules[index];
        if ("cssRules" in domRule) {
          this.mount(domRule as CSSGroupingRule);
          this.styleList.render(domRule as CSSGroupingRule);
          if (registry) {
            registry.set(css, { rule: domRule, count: 1 });
            this._sharedKey = css;
          }
        }
      } else if (
        this.selectorText.startsWith("@keyframes") ||
        this.selectorText.startsWith("@font-face")
      ) {
        // These go in whole, so an identical one can be shared like a plain
        // rule — every instance of a spinner re-inserted the same
        // content-named @keyframes. A later write to a reactive declaration
        // inside goes through the same element-level detach described above,
        // which releases this rule's registry claim before the new value
        // ever reaches a holder that doesn't want it.
        const css = this.cssText();
        const registry = dedupe
          ? registryFor(domSheet as CSSStyleSheet)
          : undefined;
        const shared = registry?.get(css);
        if (shared) {
          shared.count++;
          this._sharedKey = css;
          this._domIndex = -1;
          this.mount(shared.rule);
          return;
        }
        const index = domSheet.insertRule(css, domSheet.cssRules.length);
        this._domIndex = index;
        const domRule = domSheet.cssRules[index];
        if (registry && domRule) {
          registry.set(css, { rule: domRule, count: 1 });
          this._sharedKey = css;
        }
        this.mount(domRule);
      }
    } catch (err) {
      if (VENDOR_PREFIXED_SELECTOR.test(this.selectorText)) return;
      console.warn("Failed to insert rule:", this.selectorText, err);
    }
  }
}
