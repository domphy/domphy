import { SvgTags, VoidTags } from "../constants.js";
import { __DEV__ } from "../dev.js";
import {
  cloneDescriptor,
  collectCSSRules,
  ensureDomStyle,
  getTagName,
  hasOwn,
  isCustomElementName,
  mergePartial,
  normalizeSelectorKey,
  validate,
} from "../helpers.js";
import { eventNameMap } from "../types/EventProperties.js";
import type {
  BehaviorInstance,
  BehaviorSpec,
  DomphyElement,
  EventName,
  HookMap,
  Listener,
  PartialElement,
  TagName,
} from "../types.js";
import { hashString, merge } from "../utils.js";
import { AttributeList } from "./AttributeList.js";
import { ElementList } from "./ElementList.js";
import { isRawHTML } from "./RawHTML.js";
import { StyleList } from "./StyleList.js";
import { RawTextParents } from "./TextNode.js";

// Per-instance node id, handed out by the ROOT of each tree in document
// (construction) order.
//
// It used to be a hash of the node's PATH from the root plus its style object,
// so it identified a POSITION rather than an instance: two occurrences of the
// same component in one tree collided, and everything built on the id went with
// them (`domphy-popover-${nodeId}`, menu/tab item ids, aria-controls). A
// counter makes every node of a tree distinct while staying deterministic
// between SSR and hydration, because both construct the same nodes in the same
// order — the same reason React's `useId` is position-based rather than random.
// Collisions ACROSS trees are a separate question, answered by `_idPrefix`
// below.
//
// The counter belongs to the ROOT, not to the module. A module-global counter
// needs a per-request reset, and no reset can be made safe: renderToStream()
// flushes its shell root, AWAITS the loaders, then builds its content root, so
// any other request resetting the counter during that await made the content
// root re-issue the ids its own shell had already used — duplicate `id` and
// cross-wired `aria-controls` inside ONE document, under nothing more exotic
// than two concurrent requests. Per-root state removes the shared mutable
// counter entirely: concurrent renders cannot see each other, and server and
// client still agree because both build the same nodes in the same order from
// the same root.
//
// Several roots in ONE document still have to be told apart, since each counts
// from zero. `_idPrefix` on the root descriptor is the explicit way — React's
// `identifierPrefix`, and what `@domphy/app` uses to label the two roots of a
// streamed response "s" and "c".
//
// An unlabelled root is discriminated automatically, and the counter it reads
// is the one thing that is actually relevant: how many roots have already
// JOINED A LIVE DOCUMENT (`liveRoots`, bumped by render()/mount(), never by
// generateHTML()). Process history is the wrong measure and was the bug in an
// earlier attempt — a static-site build renders many page roots from one
// process, a server many requests, a test file many cases per realm, and the
// browser that later hydrates any one of them shares none of that history. The
// number of roots occupying a document is different in kind: it is a property
// of the id space itself, and it is zero in every server process, because a
// server only ever serializes. So:
//
//   generateHTML() on any number of roots  -> every root unprefixed, always
//   SSR then hydrate (mount) in one realm  -> both sides see the same count
//   a browser mounting several apps        -> "", "r1", "r2", … no collisions
//
// The residue, documented rather than hidden: constructing several roots BEFORE
// rendering any of them gives them all the same prefix, because a root's prefix
// is fixed when it is built and nothing has entered the document yet. Build and
// render each root together (`new ElementNode(x).render(host)`), or label them.
let liveRoots = 0;

// Selector stand-in used while a node's rules are being built, before the
// content hash that names its scope class is known. Replaced by
// `_applyScope()` before anything reaches the DOM, so it is never inserted or
// serialized — it only has to be a prefix no author selector starts with.
const SCOPE_PLACEHOLDER = "\u0000";

// DEV-only (call sites guard with __DEV__, so production builds drop it):
// void elements (img/br/input/…) cannot serialize children — SSR emits no
// closing tag, so declared content is silently dropped server-side while the
// client renders it, drifting the two trees. Runtime counterpart of the
// doctor's void-content rule.
//
// `""` is content like any other and warns too. It used to be exempt, as "the
// documented way to declare a childless void element", but nothing documented
// it: AGENTS.md says a void tag's value is `null`, `DomphyElement` types it as
// `null`, and doctor's void-content rule reports `{ hr: "" }` as an error — the
// exemption was the only source that disagreed. It is also not harmless:
// `{ input: "" }` builds a real (empty) child text node on the client while
// SSR emits none, which is exactly the drift this warning exists to catch.
// DEV-only: a tag's content is a primitive, a reactive function, an array of
// children, or a rawHtml() value. A BARE child object (`{ div: { span: "x" } }`)
// is not part of the contract — AGENTS.md and `DomphyElement` both say array —
// and it was only ever reaching the DOM because the coercion below wraps
// whatever it is given. Silently accepting an unsupported shape is how it ended
// up in core's own JSDoc and in test fixtures behind `as DomphyElement` casts,
// while every one of those call sites failed a real typecheck.
function devWarnBareChild(tagName: string): void {
  console.warn(
    `[Domphy] <${tagName}> was given a single child object as its content. Wrap it in an array — { ${tagName}: [child] } — which is what the type and the docs declare; a bare object happens to work today but is not part of the contract.`,
  );
}

function devWarnVoidContent(tagName: string): void {
  console.warn(
    `[Domphy] <${tagName}> is a void element and cannot have children — SSR output omits the declared content while the client renders it, so hydration drifts. Remove the content or use a non-void tag.`,
  );
}

export class ElementNode {
  _disposed = false;
  _beforeRemoveFired = false;
  // True when inserted imperatively (a direct children.insert() by app/patch
  // code, e.g. a floating panel or an _onInit-inserted subtree) rather than by
  // declared-inputs reconciliation — see ElementList.update()/insert().
  _imperative = false;
  type = "ElementNode";
  parent: ElementNode | null = null;
  _childrenRelease?: () => void;
  // Whether the BeforeRemove hook that releases `_childrenRelease` has been
  // registered for this node. It must register at most ONCE per node: patch()
  // re-runs _setupFunctionChildren on every reuse, and addHook COMPOSES hooks,
  // so an unguarded registration would grow the hook chain by one closure per
  // patch for the node's whole life.
  _childrenReleaseHooked = false;
  _portal?: (root: ElementNode) => HTMLElement;
  // Per-node behavior contract (see `behavior()` in utils.ts). Attached
  // instances, keyed the same as their declaring `_behaviors` record.
  _behaviorInstances = new Map<string, BehaviorInstance>();
  // Specs declared before the DOM element exists (construction-time merge()),
  // held until the Mount hook can actually attach them.
  _pendingBehaviors = new Map<string, BehaviorSpec>();
  _behaviorMountHooked = false;
  _behaviorTeardownHooked = false;
  tagName: TagName;
  // True when `tagName` is a custom element name (HTML Standard §4.13.4).
  // Such a host takes the web-component prop/event rules: a key matching a
  // property on the upgraded instance is assigned as a PROPERTY (so objects,
  // arrays and functions survive), and an unknown `onX` key listens to the
  // event name with its case preserved.
  isCustomElement: boolean;
  // The class this node's CSS rules are scoped to, or null when the node
  // declares no style. It is a hash of the node's RESOLVED rule text, so every
  // node with the same computed style lands on the same class and shares one
  // set of CSSOM rules. `_scopeShared` records that the class still means
  // exactly that text; the first declaration that actually changes moves the
  // node to its own `${tagName}_${nodeId}` class (see _detachStyleScope).
  scopeClass: string | null = null;
  _scopeShared = true;
  children = new ElementList(this);
  styles = new StyleList(this);
  attributes = new AttributeList(this);
  domElement?: HTMLElement | null = null;
  _hooks: HookMap = {};
  _events?:
    | { [K in EventName]?: (event: Event, node: ElementNode) => void }
    | null = null;
  _boundEvents = new Set<EventName>();
  _context?: Record<string, any> = {};
  _metadata?: Record<string, any> = {};
  key?: string | number | null = null;
  nodeId: string;
  // Id bookkeeping. Only a ROOT (`parent === null`) uses its own `_idSerial`
  // and `_idPrefix`; every other node hands out ids from `_idRoot`, which is
  // cached at construction so this costs no parent walk per node.
  _idRoot: ElementNode;
  _idSerial = 0;
  _idPrefix = "";
  // Whether this root has already been counted into `liveRoots` — render() and
  // mount() must claim the id space once per root, not once per call.
  _idSpaceClaimed = false;
  // The RAW descriptor object this node was last constructed/patched from
  // (before cloning), retained for exactly one purpose: patch()'s
  // reference-equality fast path. Never read otherwise.
  _descriptor: DomphyElement | null = null;

  constructor(
    domphyElement: DomphyElement,
    _parent: ElementNode | null = null,
    // Sibling index. It used to feed the tree-path hash that produced both the
    // node id and the style class; both are derived differently now (a counter
    // and a content hash), so nothing reads it — the parameter stays only
    // because it is part of the public constructor signature.
    _index = 0,
  ) {
    validate(domphyElement);
    this._descriptor = domphyElement;
    this.parent = _parent;
    this.tagName = getTagName(domphyElement) as TagName;
    this.isCustomElement = isCustomElementName(this.tagName);
    // Clone for the node's own retained state, passing the children content
    // through by reference — each child node clones its own descriptor (see
    // cloneDescriptor), so deep-cloning the subtree here too would clone
    // every descendant once per ancestor.
    let element = cloneDescriptor(
      domphyElement,
      this.tagName,
      this.isCustomElement,
    );
    element.style = element.style || {};
    element = mergePartial(element) as DomphyElement;

    this.key = (element as any)._key ?? null;
    this._context = element._context || {};
    this._metadata = element._metadata || {};

    // A root owns the counter; a child draws from its root's. Set before the
    // id is taken, so the root's own id already carries the prefix.
    if (_parent) {
      this._idRoot = _parent._idRoot;
    } else {
      this._idRoot = this;
      const declared = (domphyElement as PartialElement)._idPrefix;
      this._idPrefix =
        declared !== undefined
          ? String(declared)
          : liveRoots === 0
            ? ""
            : `r${liveRoots}`;
    }
    this.nodeId = `${this._idRoot._idPrefix}n${this._idRoot._idSerial++}`;

    if (element._onSchedule) element._onSchedule(this, element);

    this.merge(element);

    const children = (element as any)[this.tagName];

    if (
      __DEV__ &&
      children != null &&
      (VoidTags as readonly string[]).includes(this.tagName)
    ) {
      devWarnVoidContent(this.tagName);
    }

    if (children != null) {
      if (typeof children === "function") {
        this._setupFunctionChildren(children);
      } else {
        if (
          __DEV__ &&
          typeof children === "object" &&
          !Array.isArray(children) &&
          !isRawHTML(children)
        ) {
          devWarnBareChild(this.tagName);
        }
        this.children!.update(Array.isArray(children) ? children : [children]);
      }
    }
    this._hooks.Init && this._hooks.Init(this);
  }

  _setupFunctionChildren(fn: (listener: any) => any): void {
    let listener: any = () => {
      if (this._disposed) return;
      try {
        const input = fn(listener);
        this.children!.update(Array.isArray(input) ? input : [input]);
      } catch (error) {
        this._handleError(error);
      }
    };
    listener!.elementNode = this;
    listener!.debug = `class:${this.tagName}_${this.nodeId} children`;
    // onSubscribe fires once per Notifier the listener subscribes to — a
    // children function reading N states yields N release handles. Keeping
    // only the last one leaked the others: the stale subscriptions kept
    // re-running an OLD generation's closure after patch() re-setup.
    const releases: Array<() => void> = [];
    listener!.onSubscribe = (release: () => void) => {
      releases.push(release);
      this._childrenRelease = () => {
        for (const releaseSubscription of releases) releaseSubscription();
        releases.length = 0;
        listener = null;
      };
      // Register the releasing hook once per NODE, not once per subscription
      // or per patch() re-setup — addHook composes, so repeats would grow the
      // BeforeRemove chain unboundedly on frequently re-rendered nodes. The
      // hook body reads the CURRENT _childrenRelease dynamically, so one
      // registration covers every later re-setup.
      if (!this._childrenReleaseHooked) {
        this._childrenReleaseHooked = true;
        this.addHook("BeforeRemove", () => {
          this._childrenRelease?.();
          this._childrenRelease = undefined;
        });
      }
    };
    listener();
  }

  _createDOMNode() {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const node = SvgTags.includes(this.tagName)
      ? document.createElementNS(svgNamespace, this.tagName)
      : document.createElement(this.tagName);

    this.domElement = node as HTMLElement;

    if (this._events) {
      for (const key in this._events) this._bindEvent(key as EventName);
    }

    if (this.attributes) {
      Object.values(this.attributes.items!).forEach((attr) => attr.render());
    }
    return node;
  }

  // Map an `onX` descriptor key to the DOM event name to listen for.
  // Standard events always lowercase (`onClick` -> "click"), matching the
  // `EventProperties` table. On a custom element an unknown name keeps its
  // case instead — this is Preact's rule (diff/props.js: known handler
  // property -> lowercase, otherwise `name.slice(2)` verbatim), and it is the
  // only way to reach the case-sensitive events web components dispatch:
  // `"onsl-change"` -> "sl-change", `onMyEvent` -> "MyEvent". Built-in tags
  // keep lowercasing unconditionally, since a `CustomEvent` on those is rare
  // and the old behavior is the documented one.
  _eventName(key: string): EventName {
    const raw = key.substring(2);
    const lower = raw.toLowerCase();
    if (this.isCustomElement && !hasOwn(eventNameMap, lower)) {
      return raw as EventName;
    }
    return lower as EventName;
  }

  // Bind a DOM listener that dispatches LIVE from this._events, so patch() can
  // swap the handler (e.g. a list item's onClick closure after its data changes)
  // without detaching/reattaching the DOM listener.
  _bindEvent(eventName: EventName): void {
    if (!this.domElement || this._boundEvents.has(eventName)) return;
    this._boundEvents.add(eventName);
    let fn: any = (event: Event) => this._events?.[eventName]?.(event, this);
    this.domElement.addEventListener(eventName, fn);
    this.addHook("BeforeRemove", (n) => {
      n.domElement?.removeEventListener(eventName, fn);
      fn = null;
    });
  }

  _dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    // Fire BeforeRemove so reactive-listener releases (registered as BeforeRemove
    // hooks via onSubscribe) actually run for this node. Descendants are torn
    // down through this recursive _dispose — not through ElementList.remove — so
    // without this their subscriptions to long-lived State/RecordState leak.
    // Skip if the async-removal path in ElementList already fired it.
    if (!this._beforeRemoveFired) {
      this._beforeRemoveFired = true;
      try {
        this._hooks.BeforeRemove?.(this, () => {});
      } catch (error) {
        // A throwing BeforeRemove must not abort disposal halfway (leaking the
        // rest of the subtree's teardown) — route the error and continue.
        this._handleError(error);
      }
    }

    // Always release children subscriptions and destroy behaviors, even when
    // BeforeRemove already fired and a composed hook threw before later
    // composed cleanup (the _childrenRelease / behavior.destroy hooks).
    try {
      this._childrenRelease?.();
    } catch (error) {
      this._handleError(error);
    }
    this._childrenRelease = undefined;
    for (const instance of this._behaviorInstances.values()) {
      try {
        instance.destroy?.();
      } catch (error) {
        this._handleError(error);
      }
    }
    this._behaviorInstances.clear();

    if (this.children) {
      this.children._dispose();
    }

    if (this.styles) {
      this.styles.items!.forEach((rule) => rule.remove());
      this.styles._dispose();
    }

    if (this.attributes) {
      this.attributes._dispose();
    }

    // _onRemove fires for every node in the subtree, not just the directly-removed one.
    this._hooks.Remove?.(this);

    this.domElement = null;
    this._hooks = {};
    this._events = null;
    this._context = {};
    this._metadata = {};
    this._descriptor = null;
    this.parent = null;
  }
  merge(part: PartialElement) {
    merge(this._context, part._context);
    merge(this._metadata, part._metadata);
    this._processBehaviors(part._behaviors);

    const keys = Object.keys(part);
    for (let i = 0; i < keys.length; i++) {
      const originalKey = keys[i];
      const value = (part as any)[originalKey];
      if (
        [
          "$",
          "_onSchedule",
          "_key",
          "_context",
          "_metadata",
          "_behaviors",
          "style",
          this.tagName,
        ].includes(originalKey)
      ) {
      } else if (
        [
          "_onInit",
          "_onInsert",
          "_onMount",
          "_onBeforeUpdate",
          "_onUpdate",
          "_onBeforeRemove",
          "_onRemove",
          "_onError",
        ].includes(originalKey)
      ) {
        this.addHook(originalKey.substring(3) as keyof HookMap, value);
      } else if (originalKey.startsWith("on")) {
        this.addEvent(this._eventName(originalKey), value);
      } else if (originalKey === "_portal") {
        this._portal = value;
      } else if (originalKey.charCodeAt(0) === 95) {
        // `_`-prefixed keys are framework-internal descriptor props, never DOM
        // attributes. Anything not claimed by a branch above (`_doctorDisable`,
        // and whatever is added next) used to fall through to attributes.set()
        // and shipped to the browser — a real `_doctor-disable="missing-color"`
        // was observed on a <stop> in production markup, in SSR output too.
      } else if (originalKey === "class") {
        // A `class` must MERGE with (not replace) the auto-generated per-node
        // style class set at construction (line ~67) — replacing it outright
        // orphans this element's own `style: {}` object, since the CSS rule
        // is scoped to that auto class name. This applies to string/function
        // values (via AttributeList.addClass) AND to a nullish value (e.g. an
        // element passing through `class: props.className` with `className`
        // left unset) — the latter must be a no-op, NOT fall through to the
        // generic `attributes.set("class", undefined)` below, which clears
        // the attribute and silently drops the auto class token.
        if (typeof value === "string" || typeof value === "function") {
          this.attributes!.addClass(value);
        }
      } else {
        this.attributes!.set(originalKey, value);
      }
    }
    if (part.style && Object.keys(part.style).length) {
      this._scopeStyles(part.style);
    }
  }

  // Build this node's rules under a placeholder scope, hash the rule text they
  // produce, and use that hash as the scope class.
  //
  // The hash covers the selectors AND the RESOLVED values, so nodes whose
  // computed style is identical land on the same class and share one set of
  // CSSOM rules, while two nodes that merely look alike in source but resolve
  // differently get different classes. The old scope class was a hash of the
  // tree PATH with reactive values stubbed out, which got both of those
  // backwards: structurally identical siblings each got a private class (one
  // rule per element), and two mounts of one component got the SAME class, so
  // whichever rule was inserted last won for both of them.
  //
  // A node that declares no style gets no class at all — it needs no scope.
  //
  // The hash is necessarily taken from PRE-activation values: a reactive
  // declaration has no live value yet (there is no listener to subscribe
  // until the node actually mounts), so this is the only text there is to
  // hash. When activation resolves a reactive declaration to something else,
  // `_detachStyleScope` below re-hashes from the now-settled text and renames
  // to THAT — the same algorithm, run again once the truth is known — so a
  // node whose activated style turns out to match another node's (or its own
  // stale hash, on a rare collision) still converges on one shared class
  // instead of being stuck with whichever class its unresolved snapshot
  // happened to produce.
  // This dedupe registry cuts the CSSOM rule count 62-70% at page scale, but
  // that is a rule-count/SSR-bytes/CSSOM-size win, not a rendering-speed fix
  // on its own: DOM construction dominates wall time, not rule insertion
  // (see packages/core/CHANGELOG.md for the measurement).
  _scopeStyles(styleObject: Record<string, any>): void {
    this.styles.addCSS(styleObject, SCOPE_PLACEHOLDER);
    if (!this.styles.items.length) return;
    this.scopeClass = `${this.tagName}_${hashString(this.styles.cssText())}`;
    this.styles._applyScope(SCOPE_PLACEHOLDER, `.${this.scopeClass}`);
    this.attributes!.addClass(this.scopeClass);
  }

  // Move this node off its current content class and onto the class its
  // NOW-settled style text actually hashes to. The content class is a promise
  // that the rules under it are exactly the text that was hashed, and other
  // nodes may be relying on it — so the first declaration that really changes
  // (a reactive value resolving to something new on activation, a patch
  // writing a new value) has to leave the shared class before writing the new
  // value anywhere. Measured as rare: a theme flip moves no values at all,
  // because themeColor() resolves to a `var(--…)` reference that is itself
  // constant.
  //
  // The new class name is a content hash — the same algorithm `_scopeStyles`
  // uses, computed from the node's rules AS THEY STAND right now (this
  // property's new value already assigned, every other property holding
  // whatever it last resolved to) — not an arbitrary serial. Two nodes that
  // detach to the same real content land on the same class and genuinely
  // share the CSSOM rule again (`_reliveScope` re-inserts through the same
  // dedupe registry `StyleList.render()` uses); a serial could only ever
  // produce a class no one else would ever match. `_scopeShared` is set back
  // to `true` once the rename lands, so a LATER change on this node goes
  // through this same check again instead of writing straight into whatever
  // rule it now shares — the failure mode a permanently-`false` flag would
  // have hidden.
  //
  // A content hash carries no positional information, so two separately-
  // mounted roots that produce the SAME text are meant to collide — that is
  // exactly the sharing this method exists to restore after activation.
  //
  // The hash is taken with the selector text put back at SCOPE_PLACEHOLDER
  // first, the same state `_scopeStyles` hashes from. `cssText()` embeds
  // `selectorText` (StyleRule.cssText: `${selectorText} { ... }`), so hashing
  // it while the rule still carried `.previous` folded that PAST class name
  // into the hash — two nodes leaving the SAME old class for the SAME new
  // content still matched each other (both carried the same past-selector
  // text), but a node freshly constructed straight to that content never
  // could, since it hashes from the placeholder like every other node built
  // from scratch. Hashing both cases from the placeholder is what makes the
  // two paths produce the same class for the same content.
  _detachStyleScope(): void {
    if (!this._scopeShared || !this.scopeClass) return;
    this._scopeShared = false;
    const previous = this.scopeClass;
    this.styles._applyScope(`.${previous}`, SCOPE_PLACEHOLDER);
    const next = `${this.tagName}_${hashString(this.styles.cssText())}`;
    this.scopeClass = next;
    this.styles._reliveScope(SCOPE_PLACEHOLDER, `.${next}`);
    if (previous !== next) {
      this.attributes?.removeClass(previous);
      this.attributes?.addClass(next);
    }
    this._scopeShared = true;
  }

  // Update this live node IN PLACE from a fresh element description, preserving
  // its DOM element (and thus focus/scroll/selection/uncontrolled value) and its
  // children's identity. Used by list reconciliation to reuse a node by key
  // (keyed) or position (unkeyed) while reflecting new data, instead of
  // destroying and recreating the DOM. Flat style properties ARE reconciled (see
  // styles.patchCSS below) — a reused node's newly-computed static style must
  // reach the DOM, e.g. a factory function like `FilterButton(label, active,
  // onClick)` called again with new args from a reactive parent. Nested selector
  // blocks (&:hover, @media, …) are NOT reconciled — set once at construction,
  // assumed stable across reuse. Lifecycle hooks are NOT re-run (reused items
  // share structure; hooks already ran). Reactive content (a function child)
  // keeps its own listener and is left untouched.
  patch(rawElement: DomphyElement): void {
    // Reference-equality fast path: re-patching with the EXACT same descriptor
    // object is a no-op by construction — every attribute, event, style and
    // child of this node already came from that object, and any reactive
    // function inside it (children/attribute/style value) keeps its own state
    // subscriptions and re-evaluates without a re-patch. This is what makes a
    // list mutation that reuses memoized item descriptors (reorder/remove of
    // siblings) O(changed) instead of re-rebuilding every surviving row.
    //
    // The one input pattern this deliberately does not observe: mutating a
    // descriptor IN PLACE between renders and re-rendering the same object.
    // Descriptors are one-way render snapshots — produce a fresh object (or
    // use state) when the data changes; identity means "nothing changed".
    if (rawElement === this._descriptor) return;
    this._descriptor = rawElement;

    let element: any = cloneDescriptor(
      rawElement,
      this.tagName,
      this.isCustomElement,
    );
    element.style = element.style || {};
    element = mergePartial(element);

    // Children / content — recurse so grandchildren are reused/patched too.
    // Always drop the previous function-children subscription first: otherwise
    // a function → static (or nullish) patch would leave the old listener live
    // and overwriting the new children. Nullish content still means "no
    // children declared" — same as the constructor — NOT "remove all children".
    // Treating it as [] here used to wipe children that a patch inserted
    // imperatively (node.children.insert in _onInit, e.g. selectBox/combobox's
    // inner tag list + input) on every ancestor re-render, since lifecycle
    // hooks don't re-run on a reused node to put them back.
    const content = element[this.tagName];
    if (
      __DEV__ &&
      content != null &&
      (VoidTags as readonly string[]).includes(this.tagName)
    ) {
      devWarnVoidContent(this.tagName);
    }
    this._childrenRelease?.();
    this._childrenRelease = undefined;
    if (typeof content === "function") {
      this._setupFunctionChildren(content);
    } else if (content != null) {
      const next = Array.isArray(content) ? content : [content];
      this.children.update(next, !!this.domElement, true);
    }

    if (element._context) merge(this._context, element._context);
    if (element._metadata) merge(this._metadata, element._metadata);
    this._processBehaviors(element._behaviors, true);

    // A node that declared no style at construction has no scope class, so a
    // patch that introduces one has to build the scope from scratch; otherwise
    // reconcile in place under the class this node already wears. A property
    // whose value really changes takes the node out of the shared scope first
    // (StyleProperty), so an in-place update can never rewrite a rule another
    // node is relying on.
    if (this.scopeClass) {
      this.styles.patchCSS(element.style || {}, `.${this.scopeClass}`);
    } else if (element.style && Object.keys(element.style).length) {
      this._scopeStyles(element.style);
      const sheet = this.styles.domStyle?.sheet;
      if (sheet) this.styles.render(this.styles.domStyle!);
    }

    // Rebuild attributes and events. Events are replaced (live dispatch in
    // _bindEvent reads this._events, so swapping the map is enough); attributes
    // present before but absent now are removed; the scope class is kept.
    const autoClass = this.scopeClass;
    // `_`-prefixed keys are filtered by the loop below; only the three
    // non-underscore descriptor props need naming here.
    const reserved = ["$", "style", this.tagName];
    const keep = new Set<string>(["class"]);
    let userClass: string | ((listener: Listener) => string) | null = null;

    this._events = {};
    for (const key of Object.keys(element)) {
      // Same rule as merge(): `_`-prefixed keys are framework-internal props,
      // never attributes (reserved/hookKeys/_portal are all of that shape).
      if (key.charCodeAt(0) === 95 || reserved.includes(key)) continue;
      const value = element[key];
      if (key.startsWith("on") && typeof value === "function") {
        this.addEvent(this._eventName(key), value);
      } else if (
        key === "class" &&
        (typeof value === "string" || typeof value === "function")
      ) {
        userClass = value;
      } else {
        this.attributes!.set(key, value);
        keep.add(key);
      }
    }

    // A reactive userClass must stay reactive here too — a plain string
    // combine (as if it were static) would freeze it at whatever the
    // function happened to return on this one patch call, and never update
    // again since patch() doesn't re-run per listener tick.
    if (typeof userClass === "function") {
      const userClassFn = userClass;
      this.attributes!.set("class", (listener: Listener) =>
        autoClass
          ? `${autoClass} ${userClassFn(listener)}`
          : userClassFn(listener),
      );
    } else if (autoClass) {
      this.attributes!.set(
        "class",
        userClass ? `${autoClass} ${userClass}` : autoClass,
      );
    } else if (userClass) {
      this.attributes!.set("class", userClass);
    } else {
      this.attributes!.remove("class");
      keep.delete("class");
    }

    if (this.attributes!.items) {
      for (const name of Object.keys(this.attributes!.items)) {
        if (!keep.has(name)) this.attributes!.remove(name);
      }
    }

    if (this._events) {
      for (const key in this._events) this._bindEvent(key as EventName);
    }
  }

  // Walk ancestors to find the nearest Error hook. The boundary node receives
  // the error and a `reset` callback that clears its children (allowing it to
  // re-render with fresh data or a fallback). If no handler is found, log to
  // console so errors in reactive children are never silently swallowed.
  _handleError(error: unknown): void {
    let node: ElementNode | null = this;
    while (node) {
      if (node._hooks.Error) {
        const boundary = node;
        node._hooks.Error(boundary, error, () => {
          boundary.children.update([]);
        });
        return;
      }
      node = node.parent;
    }
    console.error("[Domphy] Unhandled error in reactive child:", error);
  }

  addEvent(
    name: EventName,
    callback: (event: Event, node: ElementNode) => void,
  ): void {
    this._events = this._events || {};

    const current = this._events[name];
    if (typeof current === "function") {
      this._events[name] = (event: Event, node: ElementNode) => {
        current!(event, node);
        callback(event, node);
      };
    } else {
      this._events[name] = callback;
    }
  }

  addHook<K extends keyof HookMap>(name: K, callback: HookMap[K]): void {
    const current = this._hooks[name];

    if (typeof current === "function") {
      const composed = ((...args: any[]) => {
        let firstError: unknown;
        try {
          (current as Function)(...args);
        } catch (error) {
          firstError = error;
        }
        try {
          (callback as Function)(...args);
        } catch (error) {
          if (firstError === undefined) firstError = error;
          else this._handleError(error);
        }
        if (firstError !== undefined) throw firstError;
      }) as HookMap[K];
      // Preserve the maximum declared arity across composed hooks. Removal logic
      // inspects BeforeRemove.length (>= 2 means the hook owns `done()`, e.g. an
      // exit animation); a naive (...args) wrapper would report 0 and break that.
      try {
        Object.defineProperty(composed, "length", {
          value: Math.max(
            (current as Function).length,
            (callback as Function).length,
          ),
          configurable: true,
        });
      } catch {
        /* length non-configurable on some engines — best effort */
      }
      this._hooks[name] = composed;
    } else {
      this._hooks[name] = callback;
    }
  }
  getRoot(): ElementNode {
    let root: ElementNode = this;
    while (root && root instanceof ElementNode && root.parent) {
      root = root.parent;
    }
    return root;
  }

  // Route a `_behaviors` record declared by THIS generation's PartialElement
  // into their per-node instances: an already-attached key gets its fresh
  // `props` forwarded via update() (the cross-generation fix — the instance,
  // not the closure that declared it, is what persists); a not-yet-attached
  // key attaches immediately if the DOM element already exists (the patch()/
  // reused-node path), or is queued for the node's one-time Mount hook
  // (the merge()/construction path, where domElement doesn't exist yet).
  _processBehaviors(
    behaviors?: Record<string, BehaviorSpec>,
    prune = false,
  ): void {
    if (!behaviors && !prune) return;
    const next = behaviors ?? {};
    for (const key of Object.keys(next)) {
      const spec = next[key];
      const instance = this._behaviorInstances.get(key);
      if (instance) {
        instance.update?.(spec.props);
      } else if (this.domElement) {
        this._attachBehaviorNow(key, spec);
      } else {
        this._pendingBehaviors.set(key, spec);
        this._ensureBehaviorMountHook();
      }
    }
    if (!prune) return;
    for (const key of [...this._behaviorInstances.keys()]) {
      if (hasOwn(next, key)) continue;
      const instance = this._behaviorInstances.get(key);
      this._behaviorInstances.delete(key);
      try {
        instance?.destroy?.();
      } catch (error) {
        this._handleError(error);
      }
    }
    for (const key of [...this._pendingBehaviors.keys()]) {
      if (!hasOwn(next, key)) this._pendingBehaviors.delete(key);
    }
  }

  _attachBehaviorNow(key: string, spec: BehaviorSpec): void {
    try {
      const instance = spec.attach(this, spec.props) || {};
      this._behaviorInstances.set(key, instance);
      this._ensureBehaviorTeardownHook();
    } catch (error) {
      // An attach() throw must not escape the Mount hook uncaught — route it
      // to the nearest error boundary, the same contract reactive children
      // errors follow (_handleError falls back to console.error without one).
      this._handleError(error);
    }
  }

  // Registered at most once per node (Mount itself only ever fires once per
  // real DOM node) — flushes whatever was queued by merge() at construction,
  // by then reading domElement/getRoot() safely.
  _ensureBehaviorMountHook(): void {
    if (this._behaviorMountHooked) return;
    this._behaviorMountHooked = true;
    this.addHook("Mount", () => {
      if (this._pendingBehaviors.size === 0) return;
      const pending = this._pendingBehaviors;
      this._pendingBehaviors = new Map();
      pending.forEach((spec, key) => this._attachBehaviorNow(key, spec));
    });
  }

  // Registered at most once per node — addHook COMPOSES, so a per-attach
  // registration would grow the BeforeRemove chain by one closure per
  // behavior key. The body reads the CURRENT instance map dynamically, so
  // one registration covers every key attached over the node's whole life.
  _ensureBehaviorTeardownHook(): void {
    if (this._behaviorTeardownHooked) return;
    this._behaviorTeardownHooked = true;
    this.addHook("BeforeRemove", () => {
      for (const instance of this._behaviorInstances.values()) {
        try {
          instance.destroy?.();
        } catch (error) {
          this._handleError(error);
        }
      }
      this._behaviorInstances.clear();
    });
  }

  // Look up a behavior instance by key, walking up from this node through its
  // ancestors (same pattern as getContext/getMetadata) — a behavior is
  // declared on the element that owns the concern (e.g. a combobox's outer
  // anchor), but the event that needs it often fires on a DESCENDANT (e.g.
  // the combobox's inner input on focus). Returns undefined if the key was
  // never declared on this node or an ancestor, or was declared but hasn't
  // attached yet (construction-time, pre-Mount).
  getBehavior<T extends BehaviorInstance = BehaviorInstance>(
    key: string,
  ): T | undefined {
    let node: ElementNode | null = this;
    while (node) {
      const instance = node._behaviorInstances.get(key);
      if (instance) return instance as T;
      node = node.parent;
    }
    return undefined;
  }

  getContext(name: string): any {
    let node: ElementNode | null = this;
    while (node && (!node._context || !hasOwn(node._context, name))) {
      node = node.parent;
    }
    return node && node._context ? node._context[name] : undefined;
  }

  setContext(name: string, value: any) {
    this._context = this._context || {};
    this._context[name] = value;
  }

  getMetadata(name: string): any {
    return this._metadata ? this._metadata[name] : undefined;
  }

  setMetadata(key: string, value: any) {
    this._metadata = this._metadata || {};
    this._metadata[key] = value;
  }

  // `emitted` carries the rule texts already serialized by this call, so a
  // stylesheet never repeats a byte-identical rule — the SSR counterpart of the
  // client's shared-rule registry (StyleRule). Two mounts of the same tree, or
  // any two nodes whose auto class and declarations both match, produce the
  // identical rule text and now ship it once. Internal parameter: callers pass
  // nothing and get a fresh set per root. Page-scale byte savings measured
  // against the real (un-deduped) counterfactual in
  // tests/style-dedupe.test.ts ("SSR byte savings at page scale").
  generateCSS(emitted: Set<string> = new Set()): string {
    if (!this.styles || !this.children) return "";
    // Root only: the same base rule `ensureDomStyle()` inserts on the client.
    // Without it the server stylesheet and the client stylesheet differ, and an
    // SSR-rendered `hidden` element that also declares a `display` (flex, grid,
    // block…) stays VISIBLE until hydration.
    //
    // The `!important` is load-bearing, not caution. Cascade origins first: the
    // UA's `[hidden] { display: none }` loses to ANY author declaration, at any
    // specificity, so the rule has to be re-stated in the author sheet. Inside
    // the author sheet, `[hidden]` is (0,1,0) — exactly the specificity of the
    // per-node class Domphy generates (`.div_u90bf05c2`) — and this rule is
    // inserted at index 0, so on a tie the LATER per-node rule wins and the
    // element is visible. Raising it to `[hidden][hidden]` (0,2,0) only moves
    // the tie to `&:hover` / `&.active` blocks, which are also (0,2,0) and also
    // come later. An important author declaration is the one formulation that
    // outranks every non-important author rule regardless of specificity or
    // order. Bootstrap 5's Reboot ships the identical `[hidden] { display: none
    // !important; }` for the same reason.
    //
    // Known consequence: doctor's Layer 4 `declaration-no-important` flags it on
    // every audited tree, and a page that serializes several roots into separate
    // stylesheets (`@domphy/app` emits a shell sheet and a content sheet) repeats
    // it. Both are accepted — the rule is ~40 bytes and identical copies cascade
    // identically, and the alternative is a tree serializer that is only correct
    // when some other layer remembers to prepend the base rule.
    let css =
      this.parent === null ? "[hidden] { display: none !important; } " : "";
    for (const rule of this.styles.items) {
      const text = rule.cssText();
      if (emitted.has(text)) continue;
      emitted.add(text);
      css += text;
    }
    css += this.children.items
      .map((child) =>
        child instanceof ElementNode ? child.generateCSS(emitted) : "",
      )
      .join("");
    return css;
  }

  generateHTML(): string {
    if (!this.children || !this.attributes) return "";
    const attributes = this.attributes.generateHTML();
    // Void elements must not emit a closing tag — `<br></br>` is parsed by the
    // HTML tokenizer as two <br>, which corrupts hydration child alignment.
    if ((VoidTags as readonly string[]).includes(this.tagName)) {
      return `<${this.tagName}${attributes}>`;
    }
    let content = this.children.generateHTML();
    // HTML Standard §4.4.3/§4.10.11: "A single newline may be placed
    // immediately after the start tag of pre and textarea elements. This does
    // not affect the processing of the element." The parser eats that first
    // newline, so serializing content that BEGINS with one loses it — the
    // server showed "first\nsecond" where the client's createTextNode path
    // showed "\nfirst\nsecond". Emit the escape newline the spec provides for
    // exactly this case (the same thing React's server renderer does).
    if (
      (this.tagName === "pre" || this.tagName === "textarea") &&
      content.charCodeAt(0) === 10
    ) {
      content = `\n${content}`;
    }
    return `<${this.tagName}${attributes}>${content}</${this.tagName}>`;
  }

  mount(domElement: HTMLElement, domStyle?: HTMLStyleElement): void {
    if (!domElement) throw new Error("Missing dom node on bind");
    this._claimIdSpace();
    if (
      __DEV__ &&
      this.parent === null &&
      domElement.tagName &&
      domElement.tagName.toLowerCase() !== this.tagName
    ) {
      console.warn(
        `[Domphy] Hydration mismatch at mount root: expected <${this.tagName}> but found <${domElement.tagName.toLowerCase()}>. The server-rendered DOM does not match the client tree — check that mount() receives the element generated for THIS component.`,
      );
    }
    if (
      __DEV__ &&
      !domStyle &&
      this.parent === null &&
      domElement.childNodes.length > 0
    ) {
      console.warn(
        "[Domphy] mount() was called without a style element on already-rendered DOM. Reactive style updates after hydration will be dropped — pass the server-rendered <style> element as the second argument to mount().",
      );
    }
    this.domElement = domElement;

    // Hydration trusts the server-rendered attributes and does not re-render
    // them — but a custom element's object/array/function props have no
    // attribute form, so generateHTML() omitted them entirely. Apply this
    // node's props now or a hydrated web component starts with no data.
    if (this.isCustomElement && this.attributes?.items) {
      for (const name in this.attributes.items) {
        this.attributes.items[name].render();
      }
    }

    if (this._events) {
      for (const key in this._events) this._bindEvent(key as EventName);
    }

    if (this.children) {
      // Bind server DOM by a running cursor, not by logical index: a
      // multi-root rawHtml() child spans several DOM siblings, so
      // childNodes[i] would drift for every child after it. The cursor
      // advances by each child's real DOM span (SSR emits the same markup,
      // so the spans agree when server and client trees match).
      let domIndex = 0;
      this.children.items.forEach((child, i) => {
        const childNode = domElement.childNodes[domIndex];
        if (child instanceof ElementNode) {
          domIndex++;
          if (!childNode) return;
          if (__DEV__) this._devCheckHydrationMatch(child, childNode, i);
          child.mount(childNode as HTMLElement);
        } else if (child.html) {
          // A rawHtml() child may expand to several sibling roots: bind the
          // first as the slot anchor and track the rest so later reactive
          // updates can replace/remove the whole group.
          const span = child._domSpan();
          if (childNode) {
            child.domText = childNode;
            child._domExtras = [];
            for (let k = 1; k < span; k++) {
              const extra = domElement.childNodes[domIndex + k];
              if (extra) child._domExtras.push(extra);
            }
          }
          domIndex += span;
        } else if (childNode) {
          // Bind the server-rendered text/inline-HTML node so that reactive
          // child updates after hydration can locate and replace it.
          // An empty text child is served as a comment anchor (see
          // TextNode.generateHTML), so node type 8 is expected there — the
          // first reactive update swaps it for a real text node in place.
          if (
            __DEV__ &&
            childNode.nodeType !== 3 &&
            !(childNode.nodeType === 8 && child.text === "")
          ) {
            console.warn(
              `[Domphy] Hydration mismatch at <${this.tagName}> child ${i}: expected a text node ("${child.text.slice(0, 40)}") but found ${childNode.nodeType === 1 ? `<${(childNode as HTMLElement).tagName.toLowerCase()}>` : `node type ${childNode.nodeType}`}. The server-rendered DOM does not match the client tree — check the component producing this subtree.`,
            );
          }
          child.domText = childNode;
          domIndex++;
        } else if (RawTextParents.has(this.tagName)) {
          // Raw-text parents (textarea/title/script/style) get no comment
          // anchor for an empty child — a comment there would be literal
          // characters, and in a <textarea> it would be the control's value
          // (see TextNode.generateHTML). So the server output has nothing for
          // the parser to give back: materialize the slot node here, or
          // post-hydration updates would have nothing to patch.
          child.render(domElement);
        } else {
          // No server node for this slot — keep the cursor in step with the
          // logical index the same way the old childNodes[i] binding did.
          domIndex++;
        }
      });
    }

    // Attach reactive style declarations to the server-rendered stylesheet so
    // post-hydration updates mutate the existing CSSOM rules instead of being
    // silently dropped (StyleProperty._domUpdate needs a bound domRule). Done
    // once from the call that received the style element, walking the whole
    // subtree because per-node selectors are globally unique.
    if (domStyle) {
      const sheet = domStyle.sheet;
      if (sheet)
        this._hydrateStyles(collectCSSRules(sheet.cssRules, new Map()));
      // generateCSS() already emitted the `[hidden]` base rule into this
      // sheet — tell ensureDomStyle() so a later imperative insert does not
      // add a second copy.
      if (this.parent === null) domStyle.dataset.domphyBase = "true";
    }

    this._hooks.Mount && this._hooks.Mount(this);
  }

  // DEV-only hydration guard (guarded by __DEV__ at the call site, so
  // production builds fold the whole thing away — zero per-node cost in
  // production): server DOM is bound purely by position, so a server/client
  // tree drift would silently bind the wrong node. Compare the tag name (and
  // the id/class attributes where the client declares them) and warn with
  // expected vs actual.
  private _devCheckHydrationMatch(
    child: ElementNode,
    domNode: ChildNode,
    index: number,
  ): void {
    const at = `<${this.tagName}> child ${index}`;
    const advice =
      "The server-rendered DOM does not match the client tree — check the component producing this subtree.";
    if (domNode.nodeType !== 1) {
      console.warn(
        `[Domphy] Hydration mismatch at ${at}: expected <${child.tagName}> but found ${
          domNode.nodeType === 3
            ? `a text node ("${(domNode.textContent ?? "").slice(0, 40)}")`
            : `node type ${domNode.nodeType}`
        }. ${advice}`,
      );
      return;
    }
    const el = domNode as HTMLElement;
    const actualTag = el.tagName.toLowerCase();
    if (actualTag !== child.tagName) {
      console.warn(
        `[Domphy] Hydration mismatch at ${at}: expected <${child.tagName}> but found <${actualTag}>. ${advice}`,
      );
      return;
    }
    for (const name of ["id", "class"] as const) {
      const declared = child.attributes?.items?.[name];
      if (!declared || declared.value == null) continue;
      const expectedValue = String(declared.value);
      const actualValue = el.getAttribute(name) ?? "";
      if (expectedValue !== actualValue) {
        console.warn(
          `[Domphy] Hydration mismatch at ${at} <${child.tagName}>: expected ${name}="${expectedValue}" but found ${name}="${actualValue}". ${advice}`,
        );
      }
    }
  }

  _hydrateStyles(domRuleMap: Map<string, CSSRule[]>): void {
    if (this.styles?.items) {
      for (const rule of this.styles.items) {
        const key = normalizeSelectorKey(rule.selectorText);
        const queue = domRuleMap.get(key);
        if (!queue || queue.length === 0) continue;
        // generateCSS() emits a byte-identical rule ONCE, so several nodes can
        // legitimately need the same server rule. Consume while there are
        // spares; share the last one instead of leaving the later nodes
        // unbound (their reactive style updates would be dropped), and adopt
        // it through the refcounted registry so the first node's removal does
        // not delete a rule its siblings still use.
        const domRule = queue.length > 1 ? queue.shift()! : queue[0];
        // Adopt BEFORE mounting: mount() activates the reactive declarations,
        // and one of them changing detaches this node — which releases the
        // rule. Without the refcount already in place that release would
        // delete a rule the sibling nodes are still bound to.
        if (queue.length === 1) rule._adoptShared(domRule);
        rule.mount(domRule);
      }
    }
    if (this.children) {
      for (const child of this.children.items) {
        if (child instanceof ElementNode) child._hydrateStyles(domRuleMap);
      }
    }
  }

  // This root is entering a live document, so it now occupies part of that
  // document's id space. Bumped AFTER its own prefix was fixed at
  // construction, so the first root in a document stays unprefixed and each
  // later one is discriminated. generateHTML() deliberately does NOT call
  // this: a serialized tree joins no document in this process, which is what
  // keeps every server render and static-site page deterministic.
  private _claimIdSpace(): void {
    if (this.parent !== null || this._idSpaceClaimed) return;
    this._idSpaceClaimed = true;
    liveRoots++;
  }

  render(
    domElement: HTMLElement | SVGElement | DocumentFragment,
  ): HTMLElement | SVGElement {
    this._claimIdSpace();
    const newNode = this._createDOMNode();
    domElement.appendChild(newNode);
    let domStyle = this.getRoot().styles.domStyle;
    const root = domElement.getRootNode();
    const styleParent = root instanceof ShadowRoot ? root : document.head;
    domStyle ||= ensureDomStyle(styleParent);
    this.styles.render(domStyle as HTMLStyleElement);
    // Snapshot the child list: a Mount hook further down may insert into it
    // imperatively, and that insert renders its own DOM node.
    for (const child of this.children.items.slice()) {
      if (child instanceof ElementNode && child._portal) {
        const dom = child._portal!(this.getRoot());
        dom && child.render(dom);
      } else {
        child.render(newNode);
      }
    }
    // Mount fires bottom-up — children first, then this node — the same order
    // the hydration path (mount()) has always used, and the order every peer
    // (React/Vue/Svelte) fires its mounted callback in. Firing it before the
    // subtree rendered made `_onMount` see an empty `domElement` on a fresh
    // render but a full one after hydration, so any hook that measures or
    // queries its own subtree worked only on the hydrated path.
    this._hooks.Mount && this._hooks.Mount(this);
    return newNode;
  }

  remove() {
    if (this.parent) {
      this.parent.children.remove(this);
    } else {
      // Root removal must also run BeforeRemove/Remove (and release reactive
      // subscriptions across the whole tree via _dispose), honoring async done().
      const done = () => {
        this.domElement?.remove();
        this._dispose();
      };
      if (this._hooks.BeforeRemove && this.domElement) {
        let called = false;
        const once = () => {
          if (!called) {
            called = true;
            done();
          }
        };
        // Capture the hook reference (and thus its arity) before calling it — a
        // synchronous 2-arg hook (e.g. `motion()` with no `exit` frame) may call
        // `once()` inline, which runs `done()` -> `_dispose()` -> clears
        // `this._hooks` to `{}` before this line would otherwise re-read it.
        const beforeRemoveHook = this._hooks.BeforeRemove;
        this._beforeRemoveFired = true;
        try {
          beforeRemoveHook(this, once);
        } catch (error) {
          // Same anti-wedge contract as ElementList.remove: a throwing
          // BeforeRemove completes the removal instead of leaving the root
          // half-removed with _beforeRemoveFired already set.
          this._handleError(error);
          once();
        }
        if ((beforeRemoveHook as Function).length < 2 && !called) once();
        else if (__DEV__ && !called) {
          setTimeout(() => {
            if (!called)
              console.warn(
                "[Domphy] _onBeforeRemove declared a `done` parameter but did not call it within 5s — the element will stay in the DOM. Call done() when cleanup finishes.",
              );
          }, 5000);
        }
      } else {
        done();
      }
    }
  }
}
