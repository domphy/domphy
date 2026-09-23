import {
  BooleanAttributes,
  CamelAttributes,
  HtmlAttributeNames,
} from "../constants.js";
import { camelToKebab, escapeHTML, hasOwn } from "../helpers.js";
import type { AttributeValue } from "../types.js";
import type { ElementNode } from "./ElementNode.js";
import { Notifier } from "./Notifier.js";

// Enumerated (not boolean) HTML attributes whose missing-value default is the
// truthy state — unlike BooleanAttributes, omitting them does NOT mean "off",
// so a `true`/`false` input must map to the real keyword instead of being
// dropped from the DOM.
const EnumeratedBooleanAttributes: Record<string, readonly [string, string]> = {
  translate: ["yes", "no"],
  autoCapitalize: ["on", "off"],
  // Both inherit from the nearest ancestor when absent, so `false` MUST emit
  // the explicit "false" keyword — dropping the attribute would leave a child
  // of a contenteditable/spellchecked root still editable/checked. Keeping
  // them non-boolean also preserves other keywords verbatim, notably
  // contenteditable="plaintext-only".
  contentEditable: ["true", "false"],
  spellCheck: ["true", "false"],
};

export class ElementAttribute {
  readonly name: string;
  // The key exactly as the descriptor declared it, before the HTML attribute
  // rename/kebab-casing below. Only a custom element reads it: the web-component
  // property to assign is the key as written (`helpText`), not its attribute
  // spelling (`help-text`).
  readonly propertyName: string;
  // Whether the last render assigned `propertyName` on the DOM element instead
  // of setting an attribute (custom elements only).
  setAsProperty = false;
  readonly isBoolean: boolean;
  private readonly enumeratedBoolean?: readonly [string, string];
  value: any;
  // The value exactly as declared by the caller, kept verbatim (a reactive
  // function stays a function here) — unlike `value`, which always holds the
  // current RESOLVED primitive. AttributeList.addClass() reads this to detect
  // whether the existing "class" binding is reactive and, if so, to compose
  // with the original function instead of freezing at its last-resolved
  // string.
  declaredValue: AttributeValue = undefined;
  parent: ElementNode;
  _notifier = new Notifier();
  // Release handles for the reactive listener's state subscriptions, so a
  // re-set (e.g. patch() replacing a reactive value) can drop the old listener
  // instead of leaking it on the long-lived State until node removal.
  private _releases: (() => void)[] = [];
  // Whether the BeforeRemove hook that drains _releases has been registered.
  // It must register at most ONCE per attribute: patch() re-sets every
  // reactive attribute on every reuse, and ElementNode.addHook COMPOSES hooks,
  // so an unguarded registration would grow the node's BeforeRemove chain by
  // one closure per subscription per patch for the node's whole life.
  private _removeHooked = false;
  // Release handles for addListener() subscriptions, drained by a SINGLE
  // BeforeRemove hook — see _listenerRemoveHooked.
  private _listenerReleases: (() => void)[] = [];
  // Handlers whose `onSubscribe` this attribute has already composed onto, so
  // a repeat registration cannot build a chain of closures (see addListener).
  private _wrappedHandlers = new WeakSet<object>();
  // Same once-per-attribute guard as _removeHooked: without it every
  // addListener() call composes another BeforeRemove hook onto the node
  // (ElementNode.addHook COMPOSES), growing the chain per subscription.
  private _listenerRemoveHooked = false;

  constructor(name: string, value: any, parent: any) {
    this.parent = parent;
    this.propertyName = name;
    this.isBoolean = (BooleanAttributes as readonly string[]).includes(name);
    this.enumeratedBoolean = EnumeratedBooleanAttributes[name];
    if (CamelAttributes.includes(name)) {
      this.name = name;
    } else if (hasOwn(HtmlAttributeNames, name)) {
      this.name = HtmlAttributeNames[name];
    } else {
      this.name = camelToKebab(name);
    }
    this.value = undefined;
    this.set(value);
  }

  private normalize(value: any): any {
    if (this.enumeratedBoolean && typeof value === "boolean") {
      return value ? this.enumeratedBoolean[0] : this.enumeratedBoolean[1];
    }
    return value;
  }

  // Boolean attributes accept a keyword string (download="file.pdf",
  // hidden="until-found") — Boolean() would flatten those to `true` and
  // drop the value. Only coerce non-strings.
  private resolve(value: any): any {
    if (this.isBoolean && typeof value !== "string") return Boolean(value);
    return this.normalize(value);
  }

  render(): void {
    if (!this.parent || !this.parent.domElement) return;
    const domElement = this.parent.domElement;

    if (this.parent.isCustomElement && this._renderCustomElementProperty()) {
      return;
    }

    // IDL properties the user can dirty independently of the content attribute.
    // setAttribute() will not retick a user-unchecked box / unselected option.
    const mutateAttrs = ["value", "checked", "selected"];
    if (this.isBoolean) {
      if (this.value === false || this.value == null) {
        domElement.removeAttribute(this.name);
      } else {
        domElement.setAttribute(
          this.name,
          this.value === true ? "" : this.value,
        );
      }
      if (mutateAttrs.includes(this.name)) {
        (domElement as any)[this.name] = !!this.value;
      }
    } else if (this.value == null) {
      domElement.removeAttribute(this.name);
    } else if (mutateAttrs.includes(this.name)) {
      (domElement as any)[this.name] = this.value;
    } else {
      domElement.setAttribute(this.name, this.value);
    }
  }

  // Custom-element prop rule, as React 19 and Preact apply it: when the key
  // names a property of the element INSTANCE, assign the property — that is
  // the only channel that carries objects, arrays and functions, which an
  // attribute would flatten to "[object Object]". Returns false when the value
  // belongs on the attribute after all, so render() continues.
  // A value that is an object/function but whose property is missing is still
  // assigned: the element is simply not upgraded yet (defined later, or
  // hydrating before its module loads), and an own property set before upgrade
  // is the documented hand-off — Lit captures it in `_$changeProperties` when
  // the definition lands. Stringifying it onto an attribute would lose it.
  private _renderCustomElementProperty(): boolean {
    const domElement = this.parent.domElement as any;
    if (this.value == null) {
      // Falls through to removeAttribute — but a property assigned by an
      // earlier render would survive it and keep serving a stale object.
      this.clearCustomProperty();
      return false;
    }
    const type = typeof this.value;
    if (
      this.propertyName in domElement ||
      type === "object" ||
      type === "function"
    ) {
      domElement[this.propertyName] = this.value;
      this.setAsProperty = true;
      return true;
    }
    return false;
  }

  // Undo a property assignment when the prop goes away (patch removal or a
  // null value). Attribute removal alone cannot clear a property.
  clearCustomProperty(): void {
    if (!this.setAsProperty) return;
    this.setAsProperty = false;
    const domElement = this.parent?.domElement as any;
    if (domElement) domElement[this.propertyName] = undefined;
  }

  set(value: AttributeValue): void {
    const prev = this.value;
    this.declaredValue = value;

    // Drop any previous reactive subscription before (re)binding.
    if (this._releases.length) {
      for (const release of this._releases) release();
      this._releases = [];
    }

    if (value == null) {
      this.value = null;
    } else if (typeof value === "function") {
      let listener: any = () => {
        if (!this.parent || this.parent._disposed) return;
        try {
          const p = this.value;
          // Re-pass `listener` so states read only on a later run (conditional
          // dependencies) get subscribed too — matching children/style paths.
          this.value = this.resolve((value as Function)(listener));
          this.render();
          if (p !== this.value) this._notifier.notify(this.name, this.value);
        } catch (error) {
          this.parent?._handleError(error);
        }
      };

      listener.elementNode = this.parent!;
      listener.debug = `class:${this.parent?.tagName}_${this.parent?.nodeId} attribute:${this.name}`;

      listener.onSubscribe = (release: () => void) => {
        this._releases.push(release);
        // One hook per attribute (see _removeHooked) — it drains whatever the
        // CURRENT release list holds at removal time, so a single registration
        // covers every later re-set/subscription.
        if (this.parent && !this._removeHooked) {
          this._removeHooked = true;
          this.parent.addHook("BeforeRemove", () => {
            for (const releaseSubscription of this._releases) {
              releaseSubscription();
            }
            this._releases = [];
            listener = null;
          });
        }
      };

      try {
        this.value = this.resolve(value(listener));
      } catch (error) {
        this.parent?._handleError(error);
      }
    } else {
      this.value = this.resolve(value);
    }

    this.render();
    if (prev !== this.value) this._notifier.notify(this.name, this.value);
  }

  // Drain every addListener() subscription. The array is swapped out FIRST:
  // the handles prune themselves, so draining the live array in place would
  // splice under the iteration and skip every other entry.
  private _drainListeners(): void {
    const pending = this._listenerReleases;
    this._listenerReleases = [];
    for (const release of pending) release();
  }

  addListener(callback: (value: any) => void): void {
    const handler = callback as any;
    // COMPOSE the caller's `onSubscribe`, never replace it — the same rule
    // lifecycle hooks follow. `Notifier.addListener` invokes exactly one
    // `onSubscribe`, so overwriting the caller's left it with no release handle
    // and therefore no way to unsubscribe: its subscription lived until the
    // node was removed, which for a cached or long-lived node is never.
    // Measured by @domphy/doctor with forced GC on both sides — 40k
    // resolutions against a cached surface node retained 51.3 MB, versus
    // 0.0 MB for the identical run with no attribute subscription — and worked
    // around there by scoping those nodes to a single diagnose() call.
    //
    // Wrapped at most once per handler per attribute: one handler may be
    // registered on several attributes (each must collect its own release, and
    // the chain ends at the caller's own hook), but re-registering the same
    // handler on the SAME attribute must not grow a chain of closures that
    // `Notifier` will never call, since it ignores a duplicate registration.
    if (!this._wrappedHandlers.has(handler)) {
      this._wrappedHandlers.add(handler);
      const callerOnSubscribe =
        typeof handler.onSubscribe === "function" ? handler.onSubscribe : null;
      handler.onSubscribe = (release: () => void) => {
        // The handle handed out PRUNES itself from `_listenerReleases`, and is
        // the one the caller gets. Without that, unsubscribing was only half a
        // release: `Notifier` dropped the handler, but this array still held a
        // closure that captured it, so the handler — and everything it closed
        // over — stayed reachable until the node was removed. Measured with
        // --expose-gc: 200 subscribe/release cycles on one long-lived node
        // retained all 200 handlers before this, and 0 after.
        const prune = () => {
          const index = this._listenerReleases.indexOf(prune);
          if (index >= 0) this._listenerReleases.splice(index, 1);
          release();
        };
        this._listenerReleases.push(prune);
        // One hook per attribute (the _removeHooked pattern) — it drains
        // whatever the CURRENT release list holds at removal time, so a single
        // registration covers every later addListener() call.
        if (this.parent && !this._listenerRemoveHooked) {
          this._listenerRemoveHooked = true;
          this.parent.addHook("BeforeRemove", () => this._drainListeners());
        }
        callerOnSubscribe?.call(handler, prune);
      };
    }
    this._notifier.addListener(this.name, handler);
  }

  remove(): void {
    if (this.parent && this.parent.attributes) {
      this.parent.attributes.remove(this.name);
    }
    this._dispose();
  }

  _dispose(): void {
    // Release state subscriptions immediately — an attribute removed
    // individually (AttributeList.remove) must not stay subscribed until the
    // whole node's eventual removal.
    for (const releaseSubscription of this._releases) releaseSubscription();
    this._releases = [];
    this._drainListeners();
    this._notifier._dispose();
    this.value = null;
    this.parent = null as any;
  }

  generateHTML(): string {
    const { name, value } = this;
    if (this.isBoolean) {
      if (value === false || value == null) return "";
      if (value === true) return name;
      return `${name}="${escapeHTML(String(value))}"`;
    }
    // Match render()'s live-DOM behavior (removeAttribute on null/undefined):
    // an attribute whose reactive value resolves to null/undefined is OMITTED,
    // not stringified as the literal text "null"/"undefined" — that literal
    // text is a real value to a screen reader (e.g. any non-token
    // aria-current is read as "true"), so it must never be emitted.
    if (value == null) return "";
    // A custom element's non-primitive props are PROPERTIES on the client
    // (see _renderCustomElementProperty) — there is no attribute form to
    // serialize, and stringifying one would emit "[object Object]" for the
    // server-rendered markup to then hydrate against. Omit it; the client
    // assigns the real value at mount.
    if (this.parent?.isCustomElement && typeof value === "object") return "";
    const val = Array.isArray(value) ? JSON.stringify(value) : value;
    return `${name}="${escapeHTML(String(val))}"`;
  }
}
