import type { Properties } from "csstype";
import type { ElementNode } from "./classes/ElementNode.js";
import type { RawHTML } from "./classes/RawHTML.js";
import type { VoidTagName } from "./constants/VoidTags.js";
import type { EventProperties } from "./types/EventProperties.js";
import type { GlobalAttribute } from "./types/GlobalAttributes.js";
import type { AttributeMap } from "./types/HtmlAttributeMap.js";

export type Handler = ((...args: any[]) => any) & {
  onSubscribe?: (release: () => void) => void;
};
export type Listener = Handler & { elementNode: ElementNode; debug?: string };
export type { Properties };

export type ReactiveProperty<T> = T | ((listener: Listener) => T);

export type AttributeValue = ReactiveProperty<
  string | boolean | number | null | undefined
>;
export type StyleValue = ReactiveProperty<string | number>;

export type Selector =
  | TagName
  | `.${string}`
  | `#${string}`
  | `[${string}`
  | `@${string}`
  | `*${string}`;

export type StyleSheet = {
  [K in Selector]?: StyleObject | StyleSheet;
};

export type CSSProperties = Properties;
export type StyleBlock = {
  [K in keyof Properties]?: ReactiveProperty<Properties[K]>;
};
export type StyleObject = StyleBlock & {
  [selector in
    | `&${string}`
    | `${number}%${string}`
    | "from"
    | "to"
    | `@${string}`]?: StyleObject;
};

type EventProperty = (typeof EventProperties)[number];

export type EventName = {
  [K in EventProperty]: K extends `on${infer N}`
    ? Lowercase<N> & keyof HTMLElementEventMap
    : never;
}[EventProperty];

export type EventHandlerMap = {
  [K in EventProperty]: (
    event: HTMLElementEventMap[K extends `on${infer N}`
      ? Lowercase<N> & keyof HTMLElementEventMap
      : never],
    elementNode: ElementNode,
  ) => void;
};

export type EventHandler<T extends EventName = EventName> = {
  event: HTMLElementEventMap[T];
  elementNode: ElementNode;
};
export type TagName = keyof AttributeMap;

type TagAttributes = {
  [K in AttributeMap[TagName][number]]?: AttributeValue;
};

export type HookMap = {
  Schedule?: (node: ElementNode, rawElement: DomphyElement) => void;
  Init?: (node: ElementNode) => void;
  Insert?: (node: ElementNode) => void;
  Mount?: (node: ElementNode) => void;
  BeforeUpdate?: (
    node: ElementNode,
    children: Array<PrimitiveInput | DomphyElement>,
  ) => void;
  Update?: (node: ElementNode) => void;
  BeforeRemove?: (node: ElementNode, done: () => void) => void;
  Remove?: (node: ElementNode) => void;
  Error?: (node: ElementNode, error: unknown, reset: () => void) => void;
};

export type PropertyHookMap = {
  Update?: (value: string | number) => void;
  Remove?: () => void;
};

// Per-node behavior contract (Svelte "action"-like): `attach` runs ONCE for a
// real DOM node no matter how many times a reactive parent re-renders it (a
// patch factory gets a fresh closure per re-render, but the ElementNode is
// reused) — see the `behavior()` helper in utils.ts and ElementNode's
// `_processBehaviors`. Later re-renders route their fresh `props` into the
// SAME instance via `update`, so imperative state (document-level listeners,
// timers) never binds to an orphaned generation. `destroy` runs exactly once
// when the node leaves the DOM (composed onto BeforeRemove).
export type BehaviorInstance<P = any> = {
  update?: (props: P) => void;
  destroy?: () => void;
};

export type BehaviorAttach<P = any> = (
  node: ElementNode,
  props: P,
) => BehaviorInstance<P> | undefined;

export type BehaviorSpec<P = any> = {
  attach: BehaviorAttach<P>;
  props: P;
};

export type PartialElement<T extends TagName = never> = {
  _key?: string | number;
  /**
   * Prefix for every `nodeId` in this tree, read only on a ROOT descriptor.
   * Node ids are a per-root counter, so two roots rendered into ONE document
   * (a streamed shell and its content) would otherwise both start at `n0` and
   * produce duplicate DOM ids. Give each root its own prefix, and have a
   * hydrating client pass the same one the server used. Same role as React's
   * `identifierPrefix` for `useId`.
   */
  _idPrefix?: string;
  _portal?: (root: ElementNode) => Element;
  style?: StyleObject;
  _context?: Record<string, unknown>;
  _metadata?: Record<string, unknown>;
  // Keyed so multiple patches ($-composed) can each attach their own behavior
  // on one element without colliding — see `behavior()` in utils.ts.
  _behaviors?: Record<string, BehaviorSpec<any>>;
  /**
   * Suppress `@domphy/doctor` diagnostics on this element.
   * `true` silences all rules; a rule id or list of ids silences those only.
   * Used by design-system patches for intentional type/chrome defaults.
   */
  _doctorDisable?: true | string | string[];
  $?: PartialElement<T>[];
} & {
  [K in keyof HookMap as `_on${K}`]?: HookMap[K];
} & {
  [K in `data${Capitalize<string>}` | `data-${string}`]?: AttributeValue;
} & {
  [E in EventProperty]?: EventHandlerMap[E];
} & {
  [K in GlobalAttribute]?: AttributeValue;
} & ([T] extends [never]
    ? Partial<
        {
          [Tag in keyof AttributeMap]: {
            [Attr in AttributeMap[Tag][number]]: AttributeValue;
          };
        }[keyof AttributeMap]
      >
    : Pick<
        TagAttributes,
        Extract<AttributeMap[T][number], keyof TagAttributes>
      >);

// `RawHTML` (the `rawHtml("<b>x</b>")` opt-in) is accepted anywhere a string
// child is: a plain string always renders as TEXT, markup only renders as DOM
// when explicitly wrapped.
type PrimitiveInput = null | undefined | number | string | RawHTML;

// A tag key's value is a primitive, a reactive function, or an ARRAY of
// children — never a bare child object, which is what AGENTS.md and this type
// have always said.
//
// The single-element shorthand (`{ button: { span: null } }`, which the runtime
// silently accepted via `Array.isArray(c) ? c : [c]`) was implemented here and
// REVERTED, with the measurement: adding `DomphyElement` as a bare member of
// this union changes which branch TypeScript blames when something deeper in
// the object does not match, and an ordinary `style` block of
// `(listener) => string` values built inside a `.map()` stopped compiling —
// packages/ui/src/patches/datePicker.ts:473 went from 0 errors to 1. One pair
// of brackets costs less than that, so the array stays the contract and the
// runtime DEV-warns on a bare child instead of accepting it silently.

export type ElementInput = PrimitiveInput | DomphyElement;

// A custom element / web component host. Any key containing a hyphen is
// accepted, which covers both the tag itself (`"my-widget"`, `"sl-button"` —
// HTML Standard §4.13.4 requires the hyphen) and the kebab-case attributes
// web components publish (`"help-text"`). `PartialElement` still supplies the
// typed global attributes, `data-*`, events and lifecycle hooks.
//
// camelCase JS PROPERTIES that no HTML element declares (`config`, `helpText`)
// cannot be added here: a `[key: string]` index signature in any member of the
// `DomphyElement` union switches off excess-property checking for EVERY member,
// so a typo'd attribute on a `<div>` would stop being an error. Type those with
// the `CustomElement<Props>` helper below.
type CustomElementDescriptor = {
  // One signature for both roles a hyphenated key can play, so `boolean` (an
  // attribute value) is accepted alongside element content.
  [K in `${string}-${string}`]?: ReactiveProperty<
    PrimitiveInput | boolean | (PrimitiveInput | DomphyElement)[]
  >;
} & PartialElement;

/**
 * A custom element descriptor with extra JS properties declared.
 *
 * ```ts
 * const el: CustomElement<{ config: ChartConfig }> = {
 *   "my-chart": null,
 *   config: { series: [] },   // assigned as a PROPERTY on the instance
 * }
 * ```
 */
export type CustomElement<Props extends object = Record<never, never>> =
  CustomElementDescriptor & Props;

export type DomphyElement<T extends TagName = never> = [T] extends [never]
  ?
      | {
          [K in TagName]: {
            [P in K]: K extends VoidTagName
              ? null
              : ReactiveProperty<
                  PrimitiveInput | (PrimitiveInput | DomphyElement)[]
                >;
          } & PartialElement<K>;
        }[TagName]
      | CustomElementDescriptor
  : {
      [K in T]: K extends VoidTagName
        ? null
        : ReactiveProperty<PrimitiveInput | (PrimitiveInput | DomphyElement)[]>;
    } & PartialElement<T>;
