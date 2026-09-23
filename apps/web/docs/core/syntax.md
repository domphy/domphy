# Syntax

A Domphy element is a plain JavaScript object. The first key is the tag name; the value of that key is the element content.

<img alt="Syntax" src="/figures/syntax.png" style="display:block;margin:auto" />

```ts
{
  div: "Hello",
  class: "hero",
  style: { color: "red" },
  onClick: (event, node) => console.log(node.tagName),
}
```

## Tag And Content

The first key must be a valid lowercase HTML tag name such as `div`, `button`, `input`, `ul`, or `svg`.

```ts
{ div: "Hello" }
{ button: "Save" }
{ ul: [{ li: "One" }, { li: "Two" }] }
```

The tag value is the content:

- `string` or `number` becomes a child text node
- `array` becomes children — one child still needs its brackets: `{ button: [{ span: "Save" }] }`
- `function(listener)` becomes reactive content
- `null` is used for void tags such as `input` or `img` — and is the only value they accept, since a void element cannot have children (`{ hr: "" }` builds a child text node the client renders and SSR omits, so it warns in development)

```ts
{ p: "Static text" }
{ p: 42 }
{ button: [{ span: "Save" }] }
{ ul: [{ li: "A" }, { li: "B" }] }
{ p: (listener) => `Count: ${count.get(listener)}` }
{ input: null, type: "text" }
```

If the content is reactive, the function is re-run whenever a subscribed state changes. See [Reactivity](./reactivity).

## Attributes

Any non-reserved key is treated as an attribute.

```ts
{ input: null, type: "text", placeholder: "Enter name" }
{ button: "Save", disabled: true }
{ div: "Panel", ariaLabel: "Settings panel" }
```

Attribute names are written in JavaScript-friendly form:

- standard HTML attributes use normal identifiers like `type`, `value`, `placeholder`
- attributes that are hyphenated in HTML are usually written as camelCase so you do not need string keys
- examples: `acceptCharset`, `ariaLabel`, `ariaControls`, `httpEquiv`, `tabindex`
- SVG-specific typed attributes that are naturally camelCase, such as `viewBox`, stay camelCase

```ts
{ form: null, acceptCharset: "utf-8" }
{ button: "Open", ariaControls: "menu-1" }
{ svg: [{ path: null, d: "..." }], viewBox: "0 0 24 24" }
```

For `data-*` attributes, prefer the camelCase object form:

```ts
{ div: "Item", dataState: "open" }
{ div: "Item", dataId: "123" }
```

Attribute values can also be reactive:

```ts
{ button: "Save", disabled: (listener) => loading.get(listener) }
```

For imperative attribute reads and writes after node creation, see [AttributeList API](./api/attribute-list).

## Style

`style` is a CSS-in-JS object using camelCase CSS properties plus nested selectors.

```ts
{
  div: "Hello",
  style: {
    color: "red",
    fontSize: "14px",
    "&:hover": { color: "blue" },
    "@media (max-width: 768px)": { fontSize: "12px" },
  },
}
```

Rules:

- CSS properties are camelCase, not kebab-case
- nested selectors use keys like `&:hover`, `& > span`, `&[data-open=true]`
- at-rules such as `@media`, `@supports`, `@container`, `@keyframes`, and `@font-face` are allowed
- style values can be reactive functions

```ts
{
  div: "Hello",
  style: {
    color: (listener) => active.get(listener) ? "red" : "gray",
    "& .label": { fontWeight: 600 },
    "@supports (backdrop-filter: blur(4px))": {
      backdropFilter: "blur(4px)",
    },
  },
}
```

Domphy handles style generation and mounting through `ElementNode`; `StyleList` is not the main public API path.

## Events

Native DOM events use the same names you expect from HTML and JSX-style APIs, but written as camelCase keys like `onClick`, `onInput`, `onKeyDown`, `onTransitionEnd`.

```ts
{
  button: "Save",
  onClick: (event, node) => {
    console.log(event.type)
    console.log(node.tagName)
  },
}
```

Rules from the source:

- the key must start with `on`
- the rest of the name must match a supported DOM event in camelCase form
- the handler receives the native event as the first argument
- the current `ElementNode` is passed as the second argument

That second `node` parameter is the main difference from raw DOM listeners.

```ts
{
  input: null,
  onInput: (event, node) => {
    const value = (event.target as HTMLInputElement).value
    node.setMetadata("lastValue", value)
  },
}
```

If you need to add listeners imperatively, see [ElementNode API](./api/element-node).

## Hooks

Hooks use the `_on` prefix to distinguish them from native DOM events.

```ts
{ div: "Hello", _onMount: (node) => console.log(node.domElement) }
```

This naming boundary is important:

- `onClick` is a DOM event
- `_onMount` is a Domphy lifecycle hook

Available hooks include `_onSchedule`, `_onInit`, `_onInsert`, `_onMount`, `_onBeforeUpdate`, `_onUpdate`, `_onBeforeRemove`, `_onRemove`, and `_onError` (error boundary for reactive children).

```ts
{
  div: "Hello",
  _onInsert: (node) => console.log(node.parent),
  _onBeforeRemove: (node, done) => {
    node.domElement!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).onfinish = done
  },
}
```

Hook timing, arguments, and usage are covered in [Lifecycle](./lifecycle).

## Patches

`$` applies one or more patches to the host element.

```ts
import { button, spinner } from "@domphy/ui"

{ button: "Submit", $: [button()] }
{ span: null, $: [spinner()] }
```

A patch is a function returning a `PartialElement`. Domphy merges patch output into the element before rendering.

Patch composition and merge rules are explained in [Overview](./).

## Custom Elements

A tag key that is a [valid custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) — lowercase, containing a hyphen, not one of the eight names the spec reserves (`annotation-xml`, `font-face`, …) — is rendered as that element. No registration with Domphy is needed; use any web component.

```ts
customElements.define("my-chart", MyChart)

const App = {
  div: [
    {
      "my-chart": null,
      "help-text": "Revenue by quarter",   // attribute
      data: { series: [1, 2, 3] },         // property on the instance
      "onmy-chart-select": (event) => console.log(event.detail),
    },
  ],
}
```

The custom element name must be the **first** key, and it may not sit in the `data-*` or `aria-*` namespaces. Both are attribute namespaces HTML and WAI-ARIA reserve, yet both match the custom-element-name production — without that rule `{ "aria-label": "Close", "my-widget": "…" }` would render an `<aria-label>` element instead of failing. Give a component an ordinary vendor prefix (`sl-`, `ion-`, `my-`), as every shipped web component library does.

### Props: property or attribute

Domphy applies the same rule as React 19 and Preact:

- if the key names a **property of the element instance** (`"data" in element`), it is assigned as a property — objects, arrays, `Map`s and functions reach the component intact
- if the value is an object or a function but the property is not there yet, it is *still* assigned as a property: the element is simply not upgraded, and a property set before upgrade is the documented hand-off (Lit picks it up when the definition lands)
- everything else is set as an attribute, with the same naming rules as a built-in tag (`helpText` → `help-text`)

Props on a custom element are passed **by reference**, not deep-cloned like the attribute values of a built-in tag — a web component compares prop identity (`!==`) to decide whether to re-render, and copying a dataset on every render would be wasteful anyway. Treat the object you pass as owned by the component.

Setting a prop to `null`/`undefined`, or dropping it in a later render, clears the property as well as the attribute.

A **function** value means the same thing here as on any other tag — a reactive value, called with a listener (`"help-text": (listener) => hint.get(listener)`). To pass a *callback* to a component, return it from that function: `renderItem: () => myCallback` resolves to the function itself, which is then assigned as the property.

### Events

`onX` still maps to the standard DOM event when `x` is one (`onClick` → `click`). Anything else keeps its **case** on a custom element, so the case-sensitive names web components dispatch are reachable:

```ts
{ "sl-input": null, "onsl-change": (event) => … }   // addEventListener("sl-change")
{ "my-widget": null, onMyEvent: (event) => … }      // addEventListener("MyEvent")
```

Handlers receive `(event, node)` like any other Domphy event, so `event.detail` is available directly.

### SSR

A custom element serializes like any other tag, with its primitive props as attributes. Object/array props have no attribute form, so they are **omitted** from the server HTML and assigned to the instance when `mount()` hydrates the node — server and client markup stay identical.

### TypeScript

`DomphyElement` accepts any hyphenated key, which covers the tag and kebab-case attributes. camelCase JS properties that no HTML element declares (`data`, `helpText`) are typed with `CustomElement<Props>`:

```ts
import type { CustomElement } from "@domphy/core"

const chart: CustomElement<{ data: ChartData }> = {
  "my-chart": null,
  data: { series: [] },
}
```

(A `[key: string]` index signature is deliberately not used: it would switch off excess-property checking for every element type, so a typo'd attribute on a `<div>` would stop being an error.)

## Internal Keys

These keys are reserved for Domphy runtime behavior:

```ts
{
  div: "Hello",
  _key: "user-1",
  _context: { role: "admin" },
  _metadata: { id: 123 },
  _portal: (root) => document.body,
}
```

- `_key`: stable identity for list reconciliation
- `_context`: inherited data for descendants
- `_metadata`: local data attached to this node only
- `_portal`: redirects DOM rendering to another mount target

For `_portal`, see [Portal](./portal).

## `_key`

`_key` is only for diffing during reactive child updates.

```ts
const List = {
  ul: (listener) => items.get(listener).map(item => ({
    li: item.name,
    _key: item.id,
  })),
}
```

When Domphy updates a child list, `_key` tells the reconciler which new input matches which existing child.

- it is not a DOM `id`
- it is not `node.nodeId`
- it is not general-purpose metadata
- it is only the reconciliation key for child diffing

If the key matches, Domphy reuses the existing node instance and DOM node instead of creating a new one.

Use `_key` when rendering dynamic lists whose items can reorder, insert, or remove during reactive updates.

## Not To Do

- Do not write deeply nested inline objects when the subtree is more than a small local fragment; extract child elements into named variables or functions and compose them in the parent array instead.

```ts
const Header = { header: "Title" }
const Body = { section: "Content" }

const App = {
  div: [Header, Body],
}
```

- Do not quote object keys unless the syntax really requires it; use normal identifiers such as `div`, `ariaLabel`, `dataId`, `onClick`, and `_onMount`, and only use quoted keys for CSS selectors or at-rules inside `style`.

```ts
{
  button: "Save",
  ariaLabel: "Save changes",
  dataId: "save-button",
  style: {
    "&:hover": { opacity: 0.8 },
  },
}
```

- Do not treat one large inline object as a template language; break repeated or meaningful subtrees into variables, functions, or components so the structure stays readable.

## Summary

| Key Pattern | Meaning |
| --- | --- |
| `[tag]` | HTML tag key, lowercase |
| `[attribute]` | HTML or SVG attribute |
| `style` | Nested CSS-in-JS object |
| `on[Event]` | Native DOM event handler |
| `_on[Hook]` | Domphy lifecycle hook |
| `$` | Patch list |
| `_key`, `_context`, `_metadata`, `_portal` | Reserved internal keys |
