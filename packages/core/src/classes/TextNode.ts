import { escapeHTML, sanitizeHTMLString } from "../helpers.js";
import type { ElementNode } from "./ElementNode.js";
import { isRawHTML, type RawHTML } from "./RawHTML.js";

// Zero-width space: an empty text child still needs a real DOM node to hold
// its slot, and a matching &#8203; in the server output so hydration aligns.
// Exception: a <textarea> is a value-bearing element — its text content IS the
// control's value, so a ZWSP slot-holder would leak into `.value` (hiding the
// native placeholder and reporting a phantom 1-character value). Its children
// are not layout anchors, so an empty text node keeps the slot cleanly.
const ZWSP = String.fromCharCode(0x200b);

export class TextNode {
  type = "TextNode";
  // True when inserted imperatively (a direct children.insert()) rather than
  // by declared-inputs reconciliation — see ElementList.update()/insert().
  _imperative = false;
  parent: ElementNode;
  text: string;
  // True only when the child was wrapped in `rawHtml(...)`. A plain string is
  // ALWAYS text — markup in it renders as visible characters, never as DOM.
  html: boolean;
  domText?: ChildNode;
  // Additional root nodes of a multi-root rawHtml() child. `domText` always
  // stays the FIRST root (the slot anchor every existing call site uses);
  // rawHtml("<b>a</b><i>b</i>") parses to TWO roots and previously everything
  // after firstChild was silently dropped on the client while SSR emitted the
  // whole string — diverging trees. Empty for plain text / single-root HTML.
  _domExtras: ChildNode[] = [];

  // The stand-in for an empty text child: ZWSP everywhere except inside a
  // <textarea>, where it must stay a truly empty string (see ZWSP above).
  private emptyText(): string {
    return this.parent?.tagName === "textarea" ? "" : ZWSP;
  }

  constructor(textContent: string | number | RawHTML, parent: ElementNode) {
    this.parent = parent;
    this.html = isRawHTML(textContent);
    const text = this.html ? (textContent as RawHTML).html : textContent;
    this.text = text === "" ? this.emptyText() : String(text);
  }
  _createDOMNode() {
    let newNode: ChildNode;
    this._domExtras = [];
    if (this.html) {
      const tpl = document.createElement("template");
      // The same string-level sanitizer generateHTML() passes the server
      // output through, so the client parse produces exactly the nodes
      // hydration expects to bind (scripts, on* handlers, iframe srcdoc and
      // dangerous URL schemes removed on both sides).
      tpl.innerHTML = sanitizeHTMLString(this.text.trim());
      const roots = Array.from(tpl.content.childNodes);
      if (roots.length === 0) {
        newNode = document.createTextNode("");
      } else {
        // Insert ALL template roots, not just firstChild — a multi-root
        // rawHtml() child spans several siblings, tracked in _domExtras.
        newNode = roots[0];
        this._domExtras = roots.slice(1);
      }
    } else {
      newNode = document.createTextNode(this.text);
    }
    this.domText = newNode;
    return newNode;
  }

  // Every DOM node this child occupies, in order: one node for plain text and
  // single-root rawHtml, N for a multi-root rawHtml child. ElementList uses
  // this for group moves/swaps/removals.
  _allDomNodes(): ChildNode[] {
    const nodes: ChildNode[] = [];
    if (this.domText) nodes.push(this.domText);
    for (const extra of this._domExtras) nodes.push(extra);
    return nodes;
  }

  // Number of DOM siblings this child's markup parses to. mount() hydration
  // advances its DOM cursor by this span so logical siblings AFTER a
  // multi-root rawHtml child still bind to the right server nodes (SSR emits
  // the same markup, so the counts agree).
  _domSpan(): number {
    if (!this.html) return 1;
    const tpl = document.createElement("template");
    tpl.innerHTML = sanitizeHTMLString(this.text.trim());
    return Math.max(tpl.content.childNodes.length, 1);
  }

  // Update the text content in place. When the node is a plain DOM text node and
  // stays plain text, mutate `nodeValue` directly (cheap, preserves the node) —
  // this is what lets reactive text like `(l) => "Count: " + n.get(l)` patch the
  // existing text node instead of recreating it every change. Crossing the
  // text/rawHtml boundary (or a non-text node) rebuilds the node.
  setText(textContent: string | number | RawHTML): void {
    const isHtml = isRawHTML(textContent);
    const raw = isHtml ? (textContent as RawHTML).html : textContent;
    const next = raw === "" ? this.emptyText() : String(raw);
    if (next === this.text && isHtml === this.html && this.domText) return;
    const wasHTML = this.html;
    this.text = next;
    this.html = isHtml;
    if (!this.domText) return;
    if (!wasHTML && !isHtml && this.domText.nodeType === 3) {
      this.domText.nodeValue = next;
      return;
    }
    const old = this.domText;
    const oldExtras = this._domExtras;
    const fresh = this._createDOMNode();
    const parent = old.parentNode;
    if (parent) {
      // Replace the whole group in place: fresh nodes go where the old first
      // root sat, then the old roots (including extras) come out.
      parent.insertBefore(fresh, old);
      for (const extra of this._domExtras) parent.insertBefore(extra, old);
      parent.removeChild(old);
      for (const extra of oldExtras) extra.remove();
    }
  }

  _dispose(): void {
    this.domText = undefined;
    this._domExtras = [];
    this.text = "";
  }

  generateHTML(): string {
    if (this.text === ZWSP) return "&#8203;";
    // Mirror _createDOMNode: only an explicit rawHtml() child is emitted as
    // markup (still sanitized); every plain string is escaped, so the server
    // output is XSS-safe and parses back to the same text node the client
    // builds (otherwise hydration child alignment drifts). The rawHtml branch
    // trims like the client parse does, so leading/trailing whitespace cannot
    // become an extra server-side text node with no client counterpart.
    return this.html
      ? sanitizeHTMLString(this.text.trim())
      : escapeHTML(this.text);
  }

  render(domText: ChildNode | DocumentFragment | HTMLElement): void {
    const newNode = this._createDOMNode();
    domText.appendChild(newNode);
    for (const extra of this._domExtras) domText.appendChild(extra);
  }
}
