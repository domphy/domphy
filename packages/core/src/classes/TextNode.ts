import { escapeHTML, isHTML, sanitizeHTMLString } from "../helpers.js";
import type { ElementNode } from "./ElementNode.js";

export class TextNode {
  type = "TextNode";
  // True when inserted imperatively (a direct children.insert()) rather than
  // by declared-inputs reconciliation — see ElementList.update()/insert().
  _imperative = false;
  parent: ElementNode;
  text: string;
  domText?: ChildNode;

  constructor(textContent: string | number, parent: ElementNode) {
    this.parent = parent;
    this.text = textContent === "" ? "\u200B" : String(textContent);
  }
  _createDOMNode() {
    let newNode: ChildNode;
    if (isHTML(this.text)) {
      const tpl = document.createElement("template");
      tpl.innerHTML = this.text.trim();
      // Strip event-handler attributes and javascript: URLs from all elements.
      tpl.content.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
          if (/^on/i.test(attr.name)) {
            el.removeAttribute(attr.name);
          } else if (
            /^(?:href|src|action|formaction)$/i.test(attr.name) &&
            /^\s*javascript:/i.test(attr.value)
          ) {
            el.setAttribute(attr.name, "#");
          }
        }
      });
      newNode = tpl.content.firstChild || document.createTextNode("");
    } else {
      newNode = document.createTextNode(this.text);
    }
    this.domText = newNode;
    return newNode;
  }

  // Update the text content in place. When the node is a plain DOM text node and
  // stays plain text, mutate `nodeValue` directly (cheap, preserves the node) —
  // this is what lets reactive text like `(l) => "Count: " + n.get(l)` patch the
  // existing text node instead of recreating it every change. Crossing the
  // plain/inline-HTML boundary (or a non-text node) rebuilds the node.
  setText(textContent: string | number): void {
    const next =
      textContent === "" ? String.fromCharCode(0x200b) : String(textContent);
    if (next === this.text && this.domText) return;
    const wasHTML = isHTML(this.text);
    this.text = next;
    if (!this.domText) return;
    if (!wasHTML && !isHTML(next) && this.domText.nodeType === 3) {
      this.domText.nodeValue = next;
      return;
    }
    const old = this.domText;
    const fresh = this._createDOMNode();
    old.parentNode?.replaceChild(fresh, old);
  }

  _dispose(): void {
    this.domText = undefined;
    this.text = "";
  }

  generateHTML(): string {
    if (this.text === "\u200B") return "&#8203;";
    // Mirror _createDOMNode: a single-root HTML string is intentional inline
    // HTML, anything else is plain text and must be escaped so the server
    // output is XSS-safe and parses back to the same text node the client
    // builds (otherwise hydration child alignment drifts).
    return isHTML(this.text)
      ? sanitizeHTMLString(this.text)
      : escapeHTML(this.text);
  }

  render(domText: ChildNode | DocumentFragment | HTMLElement): void {
    const newNode = this._createDOMNode();
    domText.appendChild(newNode);
  }
}
