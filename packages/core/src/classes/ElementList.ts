import { __DEV__ } from "../dev.js";
import { ensureDomStyle, getTagName } from "../helpers.js";
import type { DomphyElement } from "../types.js";
import { ElementNode } from "./ElementNode.js";
import { TextNode } from "./TextNode.js";

type ElementInput = DomphyElement | null | undefined | number | string;
type NodeItem = ElementNode | TextNode;

// DEV-only: call-sites that have already emitted the missing-`_key` reactive-list
// warning, so it fires at most once per site instead of every reactive frame.
// Keyed by the owner node's stable nodeId (same call-site → same id).
const _warnedKeylessSites = new Set<string>();

// Test-only: clear the once-per-site throttle so each test starts clean.
export function _resetKeylessWarnings(): void {
  _warnedKeylessSites.clear();
}

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

  // Resolve the first item at or after `index` whose DOM node is an ACTUAL
  // child of the owner's DOM element, for use as an insertBefore reference.
  // The logical `items` array and the real DOM child list diverge: a portal
  // item occupies a logical slot while its DOM lives wherever _portal() routed
  // it, so a positional `childNodes[i]` (or a blind `items[i].domElement`)
  // reference either points outside the owner (insertBefore throws
  // NotFoundError) or drifts by the number of preceding portals (silently
  // misplacing the node). Returns null when no such item exists (append).
  _domReferenceAfter(index: number): Node | null {
    const dom = this.owner.domElement;
    if (!dom) return null;
    for (let i = index; i < this.items.length; i++) {
      const item = this.items[i];
      const el = item instanceof ElementNode ? item.domElement : item.domText;
      if (el && el.parentNode === dom) return el;
    }
    return null;
  }

  _moveDomElement(node: NodeItem, index: number) {
    if (!this.owner || !this.owner.domElement) return;
    const dom = this.owner.domElement;

    const el = node instanceof ElementNode ? node.domElement : node.domText;
    if (!el) return;
    // `el` still occupies its old DOM slot when this runs, so a positional
    // `childNodes[index]` reference is off by one for a forward move. Reference
    // the node that should FOLLOW `el` in the new logical order by identity
    // instead — direction-agnostic and correct for forward and backward moves
    // (and for a move to the last slot, where there is no following node).
    const ref = this._domReferenceAfter(index + 1);
    if (el !== ref) dom.insertBefore(el, ref);
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
    // Imperatively-inserted nodes (a direct children.insert() by app/patch
    // code — e.g. a floating panel portaled under the root, or selectBox's
    // inner tag list) are NOT part of the declared `inputs` and must survive
    // reconciliation: from this method's point of view they'd otherwise be
    // indistinguishable from stale leftovers and get pruned by the extras
    // cleanup below on the very next unrelated re-render. Park them at the
    // logical tail so positional reuse and the extras slice only ever see
    // declared nodes (their real DOM position is untouched — logical order is
    // an internal bookkeeping detail for them).
    if (this.items.some((item) => item._imperative)) {
      const declared = this.items.filter((item) => !item._imperative);
      const imperative = this.items.filter((item) => item._imperative);
      this.items = declared.concat(imperative);
    }

    const oldItems = this.items.slice(); // snapshot for cleanup

    // Keyed lookup from old list. Skip imperative nodes (never reconciled) and
    // nodes whose async removal is still in flight (_beforeRemoveFired — an
    // exit animation awaiting done()): "resurrecting" a mid-removal node by
    // key would let the original deferred done() later rip the reused node out
    // of the live list and dispose it. A re-added key gets a FRESH node while
    // the old one finishes exiting.
    const keyed = new Map<string | number, NodeItem>();
    for (const item of oldItems) {
      if (
        item instanceof ElementNode &&
        item.key !== null &&
        item.key !== undefined &&
        !item._imperative &&
        !item._beforeRemoveFired
      ) {
        keyed.set(item.key, item);
      }
    }

    if (!silent && this.owner.domElement)
      this.owner._hooks?.BeforeUpdate?.(this.owner, inputs);

    const oldSet = new Set<NodeItem>(oldItems);
    const claimed = new Set<NodeItem>();

    // DEV-only footgun detection (warn-only — does NOT change reconciliation).
    // An unkeyed list that grows or shrinks may pair the wrong node with the
    // wrong data slot (DOM ordering issue). A fixed-length unkeyed list is safe.
    let unkeyedObjectInputs = 0;
    const lengthChanged =
      __DEV__ && oldItems.length > 0
        ? inputs.length !== oldItems.length
        : false;

    // build target order using existing ops (mutating this.items)
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const isObj = typeof input === "object" && input !== null;
      const key = isObj ? (input as any)._key : undefined;
      const tag = isObj ? getTagName(input as DomphyElement) : undefined;
      if (__DEV__ && isObj && key === undefined) unkeyedObjectInputs++;

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
          !claimed.has(at) &&
          !at._imperative &&
          !at._beforeRemoveFired
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
        if (
          at instanceof TextNode &&
          oldSet.has(at) &&
          !claimed.has(at) &&
          !at._imperative
        ) {
          at.setText(input == null ? "" : (input as string | number));
          claimed.add(at);
          continue;
        }
      }

      claimed.add(this.insert(input, i, updateDom, true, true));
    }

    // Remove leftover nodes beyond the new length. Iterate a SNAPSHOT (not a
    // `while length > inputs.length` loop): a removal may defer (async exit
    // animation), leaving the node in `items`, so a length-based loop would spin.
    // Imperative nodes (parked at the tail above) are exempt — they are managed
    // by whoever inserted them, not by this declared-inputs reconciliation.
    const extras = this.items.slice(inputs.length);
    for (const node of extras) {
      if (!node._imperative) this.remove(node, updateDom, true);
    }
    keyed.forEach((node) => this.remove(node, updateDom, true));

    // Warn (once per call-site) when an unkeyed list changes length — positional
    // reuse may pair the wrong DOM node with the wrong data slot (focus, scroll,
    // input value drift). A fixed-length unkeyed list never trips this.
    // Skips the first render (gated on oldItems.length > 0) and keyed lists.
    if (
      __DEV__ &&
      oldItems.length > 0 &&
      unkeyedObjectInputs > 0 &&
      lengthChanged
    ) {
      const siteId = this.owner.nodeId;
      if (!_warnedKeylessSites.has(siteId)) {
        _warnedKeylessSites.add(siteId);
        const msg = `[domphy] unkeyed list length changed — DOM nodes reused by position may not match their data slot (focus/scroll/input-value drift). Add _key to each item. (parent <${this.owner.tagName}>, ${unkeyedObjectInputs} unkeyed item${unkeyedObjectInputs === 1 ? "" : "s"})`;
        console.warn(msg);
      }
    }

    if (!silent) this.owner._hooks?.Update?.(this.owner);
  }

  insert(
    input: ElementInput,
    index?: number,
    updateDom = true,
    silent = false,
    declared = false,
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
    // A node inserted by anything other than update()'s declared-inputs
    // reconciliation (`declared` is only ever passed by update) is imperative:
    // reconciliation must neither positionally reuse it nor prune it as a
    // stale extra — see update().
    item._imperative = !declared;
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
          // Reference by logical successor, not childNodes[finalIndex] — a
          // portal item earlier in `items` has no DOM slot here, so a raw
          // positional index drifts and silently misplaces the new node.
          const ref = this._domReferenceAfter(finalIndex + 1);
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
        const ref = this._domReferenceAfter(finalIndex + 1);
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
        // Capture the hook reference (and thus its arity) before calling it — a
        // synchronous 2-arg hook (e.g. `motion()` with no `exit` frame) may call
        // `onceDone()` inline, which runs `done()` -> `item._dispose()` -> clears
        // `item._hooks` to `{}` before this line would otherwise re-read it.
        const beforeRemoveHook = item._hooks.BeforeRemove;
        item._beforeRemoveFired = true; // prevent _dispose from re-firing BeforeRemove
        beforeRemoveHook(item, onceDone);
        // Auto-complete only for sync cleanup hooks. A hook that declares `done`
        // (arity >= 2, e.g. an exit animation) owns completion and defers removal.
        if ((beforeRemoveHook as Function).length < 2 && !doneCalled)
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
