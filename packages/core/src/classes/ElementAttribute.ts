import {
  BooleanAttributes,
  CamelAttributes,
  HtmlAttributeNames,
} from "../constants.js";
import { camelToKebab, escapeHTML } from "../helpers.js";
import type { AttributeValue } from "../types.js";
import type { ElementNode } from "./ElementNode.js";
import { Notifier } from "./Notifier.js";

// Enumerated (not boolean) HTML attributes whose missing-value default is the
// truthy state — unlike BooleanAttributes, omitting them does NOT mean "off",
// so a `true`/`false` input must map to the real keyword instead of being
// dropped from the DOM.
const EnumeratedBooleanAttributes: Record<string, readonly [string, string]> =
  {
    translate: ["yes", "no"],
    autoCapitalize: ["on", "off"],
  };

export class ElementAttribute {
  readonly name: string;
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

  constructor(name: string, value: any, parent: any) {
    this.parent = parent;
    this.isBoolean = (BooleanAttributes as readonly string[]).includes(name);
    this.enumeratedBoolean = EnumeratedBooleanAttributes[name];
    if (CamelAttributes.includes(name)) {
      this.name = name;
    } else if (Object.hasOwn(HtmlAttributeNames, name)) {
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

  render(): void {
    if (!this.parent || !this.parent.domElement) return;
    const domElement = this.parent.domElement;

    const mutateAttrs = ["value"];
    if (this.isBoolean) {
      if (this.value === false || this.value == null) {
        domElement.removeAttribute(this.name);
      } else {
        domElement.setAttribute(
          this.name,
          this.value === true ? "" : this.value,
        );
      }
    } else if (this.value == null) {
      domElement.removeAttribute(this.name);
    } else if (mutateAttrs.includes(this.name)) {
      (domElement as any)[this.name] = this.value;
    } else {
      domElement.setAttribute(this.name, this.value);
    }
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
        const p = this.value;
        // Re-pass `listener` so states read only on a later run (conditional
        // dependencies) get subscribed too — matching children/style paths.
        this.value = this.isBoolean
          ? Boolean((value as Function)(listener))
          : this.normalize((value as Function)(listener));
        this.render();
        if (p !== this.value) this._notifier.notify(this.name, this.value);
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

      this.value = this.isBoolean
        ? Boolean(value(listener))
        : this.normalize(value(listener));
    } else {
      this.value = this.isBoolean ? Boolean(value) : this.normalize(value);
    }

    this.render();
    if (prev !== this.value) this._notifier.notify(this.name, this.value);
  }

  addListener(callback: (value: any) => void): void {
    const handler = callback as any;
    handler.onSubscribe = (release: () => void) =>
      this.parent?.addHook("BeforeRemove", release);
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
    this._notifier._dispose();
    this.value = null;
    this.parent = null as any;
  }

  generateHTML(): string {
    const { name, value } = this;
    if (this.isBoolean) {
      return value ? `${name}` : "";
    }
    // Match render()'s live-DOM behavior (removeAttribute on null/undefined):
    // an attribute whose reactive value resolves to null/undefined is OMITTED,
    // not stringified as the literal text "null"/"undefined" — that literal
    // text is a real value to a screen reader (e.g. any non-token
    // aria-current is read as "true"), so it must never be emitted.
    if (value == null) return "";
    const val = Array.isArray(value) ? JSON.stringify(value) : value;
    return `${name}="${escapeHTML(String(val))}"`;
  }
}
