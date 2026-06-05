import { ElementNode } from "./ElementNode.js";
import { isHTML, escapeHTML } from "../helpers.js";

export class TextNode {
  type = "TextNode"
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
      newNode = tpl.content.firstChild || document.createTextNode("");
    } else {
      newNode = document.createTextNode(this.text);
    }
    this.domText = newNode;
    return newNode;
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
    return isHTML(this.text) ? this.text : escapeHTML(this.text);
  }

  render(domText: ChildNode | DocumentFragment | HTMLElement): void {
    const newNode = this._createDOMNode();
    domText.appendChild(newNode);
  }
}