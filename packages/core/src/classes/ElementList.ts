import { TextNode } from "./TextNode.js";
import { ElementNode } from "./ElementNode.js";
import type { DomphyElement } from "../types.js";

type ElementInput = DomphyElement | null | undefined | number | string
type NodeItem = ElementNode | TextNode;

export class ElementList {
  items: NodeItem[] = [];
  owner: ElementNode;

  constructor(parent: ElementNode) {
    this.owner = parent;
  }

  _createNode(element: ElementInput | DomphyElement, index = 0): NodeItem {
    return (typeof element === "object" && element !== null)
      ? new ElementNode(element, this.owner, index)
      : new TextNode(element == null ? "" : String(element), this.owner);
  }

  _moveDomElement(node: NodeItem, index: number) {
    if (!this.owner || !this.owner.domElement) return;
    const dom = this.owner.domElement;

    const el = node instanceof ElementNode ? node.domElement : node.domText;
    if (el) {
      const currentRef = dom.childNodes[index] || null;
      if (el !== currentRef) {
        dom.insertBefore(el, currentRef);
      }
    }
  }

  _swapDomElement(aNode: NodeItem, bNode: NodeItem) {
    if (!this.owner || !this.owner.domElement) return;
    const parent = this.owner.domElement;

    const a = aNode instanceof ElementNode ? aNode.domElement : aNode.domText;
    const b = bNode instanceof ElementNode ? bNode.domElement : bNode.domText;
    if (!a || !b) return;

    const aNext = a.nextSibling;
    const bNext = b.nextSibling;

    parent.insertBefore(a, bNext);
    parent.insertBefore(b, aNext);
  }

  update(inputs: ElementInput[], updateDom = true, silent = false): void {

    const oldItems = this.items.slice(); // snapshot for cleanup

    // keyed lookup from old list
    const keyed = new Map<string | number, NodeItem>();
    for (const item of oldItems) {
      if (item instanceof ElementNode && item.key !== null && item.key !== undefined) {
        keyed.set(item.key, item);
      }
    }

    if (!silent && this.owner.domElement) this.owner._hooks?.BeforeUpdate?.(this.owner, inputs);
    // build target order using existing ops (mutating this.items)
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const key =
        (typeof input === "object" && input !== null) ? (input as any)._key : undefined;

      if (key !== undefined) {
        const reused = keyed.get(key);
        if (reused) {
          keyed.delete(key);

          const cur = this.items.indexOf(reused);
          if (cur !== i && cur >= 0) {
            const isPortal = reused instanceof ElementNode && !!reused._portal;
            this.move(cur, i, isPortal ? false : updateDom, true);
          }
          reused.parent = this.owner as any;
          continue;
        }
      }

      this.insert(input, i, updateDom, true);
    }

    while (this.items.length > inputs.length) {
      this.remove(this.items[this.items.length - 1], updateDom, true);
    }
    keyed.forEach((node) => this.remove(node, updateDom, true));
    if (!silent) this.owner._hooks?.Update?.(this.owner);
  }

  insert(input: ElementInput, index?: number, updateDom = true, silent = false): NodeItem {

    let length = this.items.length;
    const finalIndex = (typeof index !== "number" || isNaN(index) || index < 0 || index > length)
      ? length
      : index;
    const item = this._createNode(input, finalIndex);
    this.items.splice(finalIndex, 0, item);

    if (item instanceof ElementNode) {
      //Parent always insert/mount before children
      item._hooks.Insert && item._hooks.Insert(item)

      let domElement = this.owner.domElement;
      if (updateDom && domElement) {


        if (item._portal) {
          let domElement = item._portal!(this.owner.getRoot())
          domElement && item.render(domElement)
        } else {
          let domNode = item._createDOMNode();
          const ref = domElement.childNodes[finalIndex] ?? null;
          domElement.insertBefore(domNode, ref);
          let root = domElement.getRootNode()
          const styleParent = root instanceof ShadowRoot ? root : document.head
          let domStyle = styleParent.querySelector("#domphy-style") as HTMLStyleElement;
          item.styles.render(domStyle as HTMLStyleElement)
          item._hooks.Mount && item._hooks.Mount(item)
          item.children.items.forEach(child => {
            if (child instanceof ElementNode && child._portal) {
              let dom = child._portal!(child.getRoot())
              dom && child.render(dom)
            } else {
              child.render(domNode)
            }
          })
        }
      }



    } else {
      let domElement = this.owner.domElement;
      if (updateDom && domElement) {
        let domNode = item._createDOMNode();
        const ref = domElement.childNodes[finalIndex] ?? null;
        domElement.insertBefore(domNode, ref);
      }
    }
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner)
    return item;
  }

  remove(item: NodeItem, updateDom = true, silent = false): void {

    const index = this.items.indexOf(item);
    if (index < 0) return;

    if (item instanceof ElementNode) {
      const done = () => {
        const el = item.domElement
        this.items.splice(index, 1);
        updateDom && el && el.remove()
        item._hooks?.Remove?.(item)
        item._dispose();
      }
      if (item._hooks && item._hooks.BeforeRemove && item.domElement) {
        item._hooks.BeforeRemove(item, done)
      } else {
        done()
      }

    } else {
      const el = item.domText
      this.items.splice(index, 1);
      updateDom && el && el.remove()
      item._dispose();
    }

    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner)
  }

  clear(updateDom = true, silent = false): void {
    if (this.items.length === 0) return;
    const snapshot = this.items.slice();

    for (const item of snapshot) {
      this.remove(item, updateDom, true);
    }
    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner)
  }

  _dispose(): void {
    this.items = [];
  }

  swap(aIndex: number, bIndex: number, updateDom = true, silent = false) {
    if (aIndex < 0 || bIndex < 0 ||
      aIndex >= this.items.length || bIndex >= this.items.length ||
      aIndex === bIndex) return;

    const itemA = this.items[aIndex];
    const itemB = this.items[bIndex];

    this.items[aIndex] = itemB;
    this.items[bIndex] = itemA;

    if (updateDom) this._swapDomElement(itemA, itemB);

    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner)
  }

  move(fromIndex: number, toIndex: number, updateDom = true, silent = false): void {
    if (fromIndex < 0 || fromIndex >= this.items.length ||
      toIndex < 0 || toIndex >= this.items.length || fromIndex === toIndex) return;

    const item = this.items[fromIndex];

    this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);

    if (updateDom) this._moveDomElement(item, toIndex);

    !silent && this.owner.domElement && this.owner._hooks.Update && this.owner._hooks.Update(this.owner)
  }

  generateHTML(): string {
    let html = "";
    for (const item of this.items) html += item.generateHTML();
    return html;
  }
}