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
    if (this.html) {
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
    const fresh = this._createDOMNode();
    old.parentNode?.replaceChild(fresh, old);
  }

  _dispose(): void {
    this.domText = undefined;
    this.text = "";
  }

  generateHTML(): string {
    if (this.text === ZWSP) return "&#8203;";
    // Mirror _createDOMNode: only an explicit rawHtml() child is emitted as
    // markup (still sanitized); every plain string is escaped, so the server
    // output is XSS-safe and parses back to the same text node the client
    // builds (otherwise hydration child alignment drifts).
    return this.html ? sanitizeHTMLString(this.text) : escapeHTML(this.text);
  }

  render(domText: ChildNode | DocumentFragment | HTMLElement): void {
    const newNode = this._createDOMNode();
    domText.appendChild(newNode);
  }
}
