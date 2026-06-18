import { __DEV__ } from "../dev.js";
import { ensureDomStyle, getTagName } from "../helpers.js";
import type { DomphyElement } from "../types.js";
import { ElementNode } from "./ElementNode.js";
import { TextNode } from "./TextNode.js";

type ElementInput = DomphyElement | null | undefined | number | string;
type NodeItem = ElementNode | TextNode;

export class ElementList {
  items: NodeItem[] = [];
  owner: ElementNode;
  _nextKey: number = 0;

  constructor(parent: ElementNode) {
    this.owner = parent;
  }

  _createNode(element: ElementInput | DomphyElement): NodeItem {
    return typeof element === "object" && element !== null
      ? new ElementNode(element, this.owner, this._nextKey++)
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
      if (
        item instanceof ElementNode &&
        item.key !== null &&
        item.key !== undefined
      ) {
        keyed.set(item.key, item);
      }
    }

    if (!silent && this.owner.domElement)
      this.owner._hooks?.BeforeUpdate?.(this.owner, inputs);

    const oldSet = new Set<NodeItem>(oldItems);
    const claimed = new Set<NodeItem>();

    // build target order using existing ops (mutating this.items)
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const isObj = typeof input === "object" && input !== null;
      const key = isObj ? (input as any)._key : undefined;
      const tag = isObj ? getTagName(input as DomphyElement) : undefined;

      // Keyed reuse: same key + same tag → reuse the node and patch it in place
      // (preserves DOM identity/state while reflecting new data).
      if (key !== undefined) {
        const reused = keyed.get(key);
        if (reused instanceof ElementNode && reused.tagName === tag) {
          keyed.delete(key);
          const cur = this.items.indexOf(reused);
          if (cur !== i && cur >= 0) {
            const isPortal = !!reused._portal;
            this.move(cur, i, isPortal ? false : updateDom, true);
          }
          reused.parent = this.owner as any;
          reused.patch(input as DomphyElement);
          claimed.add(reused);
          continue;
        }
        // key present but no tag-compatible match → fall through to insert; any
        // stale keyed node keeps its slot in `keyed` and is removed below.
      } else if (isObj) {
        // Unkeyed positional reuse: reuse the old unkeyed element already sitting
        // at this slot if its tag matches — this is what preserves focus, scroll,
        // selection, IME and uncontrolled input values across plain list updates.
        const at = this.items[i];
        if (
          at instanceof ElementNode &&
          at.key == null &&
          at.tagName === tag &&
          oldSet.has(at) &&
          !claimed.has(at)
        ) {
          at.parent = this.owner as any;
          at.patch(input as DomphyElement);
          claimed.add(at);
          continue;
        }
      } else {
        // Text positional reuse: a string/number at this slot whose old node is a
        // TextNode is patched in place (mutate nodeValue) instead of recreating
        // the DOM text node — this keeps reactive text like `(l) => "n:" +
        // s.get(l)` cheap and stable across updates.
        const at = this.items[i];
        if (at instanceof TextNode && oldSet.has(at) && !claimed.has(at)) {
          at.setText(input == null ? "" : (input as string | number));
          claimed.add(at);
          continue;
        }
      }

      claimed.add(this.insert(input, i, updateDom, true));
    }

    // Remove leftover nodes beyond the new length. Iterate a SNAPSHOT (not a
    // `while length > inputs.length` loop): a removal may defer (async exit
    // animation), leaving the node in `items`, so a length-based loop would spin.
    const extras = this.items.slice(inputs.length);
    for (const node of extras) this.remove(node, updateDom, true);
    keyed.forEach((node) => this.remove(node, updateDom, true));
    if (!silent) this.owner._hooks?.Update?.(this.owner);
  }

  insert(
    input: ElementInput,
    index?: number,
    updateDom = true,
    silent = false,
  ): NodeItem {
    const length = this.items.length;
    const finalIndex =
      typeof index !== "number" ||
      Number.isNaN(index) ||
      index < 0 ||
      index > length
        ? length
        : index;
    const item = this._createNode(input);
    this.items.splice(finalIndex, 0, item);

    if (item instanceof ElementNode) {
      //Parent always insert/mount before children
      item._hooks.Insert && item._hooks.Insert(item);

      const domElement = this.owner.domElement;
      if (updateDom && domElement) {
        if (item._portal) {
          const domElement = item._portal!(this.owner.getRoot());
          domElement && item.render(domElement);
        } else {
          const domNode = item._createDOMNode();
          const ref = domElement.childNodes[finalIndex] ?? null;
          domElement.insertBefore(domNode, ref);
          const root = domElement.getRootNode();
          const styleParent = root instanceof ShadowRoot ? root : document.head;
          const domStyle = ensureDomStyle(styleParent);
          item.styles.render(domStyle as HTMLStyleElement);
          item._hooks.Mount && item._hooks.Mount(item);
          item.children.items.forEach((child) => {
            if (child instanceof ElementNode && child._portal) {
              const dom = child._portal!(child.getRoot());
              dom && child.render(dom);
            } else {
              child.render(domNode);
            }
          });
        }
      }
    } else {
      const domElement = this.owner.domElement;
      if (updateDom && domElement) {
        const domNode = item._createDOMNode();
        const ref = domElement.childNodes[finalIndex] ?? null;
        domElement.insertBefore(domNode, ref);
      }
    }
    !silent &&
      this.owner.domElement &&
      this.owner._hooks.Update &&
      this.owner._hooks.Update(this.owner);
    return item;
  }

  remove(item: NodeItem, updateDom = true, silent = false): void {
    const index = this.items.indexOf(item);
    if (index < 0) return;

    if (item instanceof ElementNode) {
      // Guard against re-entrant removal of a node whose (deferred) removal is
      // already in flight — otherwise update()'s extras + keyed passes could
      // fire its BeforeRemove/animation twice. Synchronous removals are already
      // guarded by the indexOf check above (the node is spliced before re-entry).
      if (item._beforeRemoveFired) return;
      const done = () => {
        const el = item.domElement;
        // Re-resolve position at completion time — a deferred (animated) removal
        // may run after other inserts/removes have shifted indices.
        const i = this.items.indexOf(item);
        if (i >= 0) this.items.splice(i, 1);
        updateDom && el && el.remove();
        item._dispose(); // _dispose fires Remove + releases subscriptions for the whole subtree
      };
      if (item._hooks.BeforeRemove && item.domElement) {
        let doneCalled = false;
        const onceDone = () => {
          if (!doneCalled) {
            doneCalled = true;
            done();
          }
        };
        item._beforeRemoveFired = true; // prevent _dispose from re-firing BeforeRemove
        item._hooks.BeforeRemove(item, onceDone);
        // Auto-complete only for sync cleanup hooks. A hook that declares `done`
        // (arity >= 2, e.g. an exit animation) owns completion and defers removal.
        if ((item._hooks.BeforeRemove as Function).length < 2 && !doneCalled)
          onceDone();
        else if (__DEV__ && !doneCalled) {
          setTimeout(() => {
            if (!doneCalled)
              console.warn(
                "[Domphy] _onBeforeRemove declared a `done` parameter (e.g. an exit animation) but did not call it within 5s — the element will stay in the DOM. Call done() when cleanup finishes.",
              );
          }, 5000);
        }
      } else {
        done();
      }
    } else {
      const el = item.domText;
      this.items.splice(index, 1);
      updateDom && el && el.remove();
      item._dispose();
    }

    !silent &&
      this.owner.domElement &&
      this.owner._hooks.Update &&
      this.owner._hooks.Update(this.owner);
  }

  clear(updateDom = true, silent = false): void {
    if (this.items.length === 0) return;
    const snapshot = this.items.slice();

    for (const item of snapshot) {
      this.remove(item, updateDom, true);
    }
    !silent &&
      this.owner.domElement &&
      this.owner._hooks.Update &&
      this.owner._hooks.Update(this.owner);
  }

  _dispose(): void {
    this.items.forEach((child) => child._dispose());
    this.items = [];
  }

  swap(aIndex: number, bIndex: number, updateDom = true, silent = false) {
    if (
      aIndex < 0 ||
      bIndex < 0 ||
      aIndex >= this.items.length ||
      bIndex >= this.items.length ||
      aIndex === bIndex
    )
      return;

    const itemA = this.items[aIndex];
    const itemB = this.items[bIndex];

    this.items[aIndex] = itemB;
    this.items[bIndex] = itemA;

    if (updateDom) this._swapDomElement(itemA, itemB);

    !silent &&
      this.owner.domElement &&
      this.owner._hooks.Update &&
      this.owner._hooks.Update(this.owner);
  }

  move(
    fromIndex: number,
    toIndex: number,
    updateDom = true,
    silent = false,
  ): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.items.length ||
      toIndex < 0 ||
      toIndex >= this.items.length ||
      fromIndex === toIndex
    )
      return;

    const item = this.items[fromIndex];

    this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);

    if (updateDom) this._moveDomElement(item, toIndex);

    !silent &&
      this.owner.domElement &&
      this.owner._hooks.Update &&
      this.owner._hooks.Update(this.owner);
  }

  generateHTML(): string {
    let html = "";
    for (const item of this.items) html += item.generateHTML();
    return html;
  }
}
