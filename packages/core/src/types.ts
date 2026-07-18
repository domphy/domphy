import type { Properties } from "csstype";
import type { ElementNode } from "./classes/ElementNode.js";
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
) => BehaviorInstance<P> | void;

export type BehaviorSpec<P = any> = {
  attach: BehaviorAttach<P>;
  props: P;
};

export type PartialElement<T extends TagName = never> = {
  _key?: string | number;
  _portal?: (root: ElementNode) => Element;
  style?: StyleObject;
  _context?: Record<string, unknown>;
  _metadata?: Record<string, unknown>;
  // Keyed so multiple patches ($-composed) can each attach their own behavior
  // on one element without colliding — see `behavior()` in utils.ts.
  _behaviors?: Record<string, BehaviorSpec<any>>;
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

type PrimitiveInput = null | undefined | number | string;

export type ElementInput = PrimitiveInput | DomphyElement;

export type DomphyElement<T extends TagName = never> = [T] extends [never]
  ? {
      [K in TagName]: {
        [P in K]: K extends VoidTagName
          ? null
          : ReactiveProperty<
              PrimitiveInput | (PrimitiveInput | DomphyElement)[]
            >;
      } & PartialElement<K>;
    }[TagName]
  : {
      [K in T]: K extends VoidTagName
        ? null
        : ReactiveProperty<PrimitiveInput | (PrimitiveInput | DomphyElement)[]>;
    } & PartialElement<T>;
