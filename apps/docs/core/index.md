
<script setup lang="ts">
import DomphyPreview from "../preview/index.vue"
import Counting from "../demos/core/counting.js"
</script>

# Core

`@domphy/core` covers what other frameworks split into separate concerns: **DOM rendering + SSR + CSS-in-JS** — one package, one model.

```ts
import { ElementNode, toState, merge } from "@domphy/core"
```

These three imports are all you need for most cases. `ElementNode` renders. `toState` makes values reactive. `merge` composes patches. Everything else is accessed via instance properties inside lifecycle hooks.

---

## Core Workflow

```mermaid
flowchart TB
    A["DomphyElement / raw object"] --> B["new ElementNode(App)"]
    B --> C["deepClone + validate + mergePartial"]
    C --> D["_onSchedule(node, raw)"]
    D --> E["merge patches, attributes, styles, events, hooks"]
    E --> F{"children value"}
    F -->|static| G["children.update([...children])"]
    F -->|reactive fn| H["create listener and subscribe via state.get(listener)"]
    H --> G
    G --> I["_onInit(node)"]

    I --> J{"entry mode"}
    J -->|CSR render| K["render(target)"]
    J -->|SSR| L["generateHTML() + generateCSS()"]
    L --> M["send HTML/CSS to client"]
    M --> N["mount(existing DOM)"]

    K --> O["_createDOMNode() + attributes + DOM events"]
    O --> P["render scoped styles to #domphy-style"]
    P --> Q["render children"]
    Q --> R["_onMount(node)"]

    N --> S["bind existing DOM + attach events + walk children"]
    S --> T["_onMount(node)"]

    R --> U["interactive tree"]
    T --> U

    U --> V{"change source"}
    V -->|state.set()| W["reactive listener reruns"]
    V -->|children.insert()| X["_onInsert -> create child DOM -> child _onMount"]
    V -->|children.remove() / node.remove()| Y["_onBeforeRemove(node, done)"]

    W --> Z["_onBeforeUpdate(node, rawChildren)"]
    Z --> AA["children.update(): keyed reuse, move, insert, remove"]
    AA --> AB["_onUpdate(node)"]
    AB --> U
    X --> U

    Y --> AC["done()"]
    AC --> AD["remove DOM + _onRemove(node) + dispose hooks, styles, events"]
    AD --> AE["subscriptions released"]
```

This is the full runtime loop of `@domphy/core`: parse once, render or mount, react to state, diff children, and dispose cleanly on removal.

## Element Syntax

A Domphy element is a plain JavaScript object. The HTML tag is the key; its value is the content.

<img alt="Syntax" src="/figures/syntax.png" style="display:block;margin:auto" />

```ts
// tag — value is children (string, number, array, or reactive function)
{ div: "Hello" }
{ ul: [{ li: "item 1" }, { li: "item 2" }] }
{ p: (listener) => `Count: ${count.get(listener)}` }

// attribute — any non-reserved key
{ input: null, type: "text", placeholder: "Enter name" }
{ button: "Click", disabled: (listener) => isLoading.get(listener) }

// style — camelCase, supports pseudo-classes and media queries
{
  div: "Hello",
  style: {
    color: "red",
    "&:hover": { color: "blue" },
    "@media (max-width: 768px)": { fontSize: "14px" }
  }
}

// events
{ button: "Click", onClick: (event) => count.set(count.get() + 1) }

// patches
{ button: "Submit", $: [button()] }

// lifecycle hooks
{ div: "Hello", _onMount: (node) => console.log(node.domElement) }

// internal
{
  div: "Hello",
  _key: "unique-id",           // identity for list reconciliation
  _context: { role: "admin" }, // pass data down to descendants
  _metadata: { id: 123 },      // attach data to this node only
  _portal: () => document.getElementById("modal-root")!
}
```

Full key reference:

| Key | Example | Description |
| --- | --- | --- |
| `[tag]` | `div: [...]` | HTML tag — value is children |
| `[attribute]` | `class: "btn"` | HTML attribute (reactive supported) |
| `style` | `style: { color: "red" }` | CSS-in-JS object |
| `on[Event]` | `onClick: (e) => ...` | DOM event handler |
| `$` | `$: [button()]` | Apply patches |
| `_key` | `_key: "id"` | List reconciliation key |
| `_context` | `_context: { x: 1 }` | Context inherited by descendants |
| `_metadata` | `_metadata: { id: 1 }` | Internal data (not inherited) |
| `_portal` | `_portal: () => el` | Redirect mount target |
| `_onSchedule` | `_onSchedule: (node, raw) => ...` | Before parsing |
| `_onInit` | `_onInit: (node) => ...` | After parsing, before insertion |
| `_onInsert` | `_onInsert: (node) => ...` | On tree insertion |
| `_onMount` | `_onMount: (node) => ...` | After DOM element created |
| `_onUpdate` | `_onUpdate: (node) => ...` | After update cycle |
| `_onBeforeRemove` | `_onBeforeRemove: (node, done) => ...` | Before removal — must call `done()` |
| `_onRemove` | `_onRemove: (node) => ...` | After fully removed |

---

## Reactivity

Reactivity is listener-based. Any value can be a function that receives a `listener` — when state changes, that value re-evaluates and the DOM updates automatically.

<img alt="Reactivity" src="/figures/reactivity.png" width="500" style="display:block;margin:auto" />

```ts
const count = toState(0)

const counter = {
  button: (listener) => `Count: ${count.get(listener)}`,
  //                                        ↑ subscribe — rerenders when count changes
  onClick: () => count.set(count.get() + 1)
}
```

`count.get(listener)` does two things: returns the current value and subscribes the element to future changes. Subscriptions are released automatically when the node is removed — no manual cleanup needed.

<DomphyPreview :element="Counting"/>

<<< @/demos/core/counting.ts

Domphy does not enforce a state architecture. Any system that can call a function works:

```ts
store.subscribe(() => listener())   // Zustand
atom.subscribe(() => listener())    // Nanostores
count$.subscribe(() => listener())  // RxJS
```

→ [State API](./api/state)

---

## Project Structure

Domphy has no framework-enforced file structure. The recommended convention:

```
src/
  app.ts           ← entry point: apply theme + mount root
  components/      ← app-level components
    Sidebar.ts
    Header.ts
    Panel.ts
  pages/           ← top-level views
    Home.ts
    Settings.ts
```

**`app.ts`** initializes the theme and mounts the root element:

```ts
import { ElementNode } from "@domphy/core"
import { themeApply } from "@domphy/theme"
import { Root } from "./components/Root.ts"

themeApply()
new ElementNode(Root).render(document.getElementById("app")!)
```

---

### Components

A **component** is an app-level concept — a function that returns a `DomphyElement`. It is not a UI framework primitive. Components live in your application code, not in `@domphy/ui`.

```ts
import { type DomphyElement } from "@domphy/core"
import { heading, paragraph } from "@domphy/ui"

function Panel(props: { title: string; content: string }): DomphyElement<"section"> {
    return {
        section: [
            { h2: props.title,   $: [heading()] },
            { p:  props.content, $: [paragraph()] },
        ],
    }
}
```

Usage — call like a regular function and pass the result as a child:

```ts
import { type DomphyElement } from "@domphy/core"
import { Panel } from "./Panel.ts"

const App: DomphyElement<"main"> = {
    main: [
        Panel({ title: "Overview",  content: "Summary of the project." }),
        Panel({ title: "Details",   content: "In-depth breakdown." }),
        Panel({ title: "Resources", content: "Links and references." }),
    ],
}
```

**A component is just a function.** No decorator, no class, no special lifecycle — it returns a plain object that Domphy renders. Props are plain function arguments. Reuse is plain function calls.

The distinction from patches:

| | Patch | Component |
|---|---|---|
| Returns | `PartialElement` | `DomphyElement` |
| Purpose | Add behavior/style to an element | Define a subtree of the UI |
| Layer | `@domphy/ui` | Your app code |
| Example | `button()`, `tooltip()` | `Sidebar()`, `Panel()` |

---

## Render

```ts
// CSR
new ElementNode(App).render(document.body)
```

Call once at the app root.

---

## SSR

The same element definition runs on both server and client — no duplicate templates.

<img alt="SSR" src="/figures/ssr.png" width="500" style="display:block;margin:auto" />

::: code-group
```ts [server.js]
import { ElementNode } from "@domphy/core"
import { themeCSS } from "@domphy/theme"
import App from "./app.js"

const node = new ElementNode(App)

const page = `<!DOCTYPE html>
<html>
  <head>
    <style>${themeCSS()}${node.generateCSS()}</style>
  </head>
  <body>
    <div id="app">${node.generateHTML()}</div>
    <script type="module" src="/client.js"></script>
  </body>
</html>`
```

```ts [client.js]
import { ElementNode } from "@domphy/core"
import App from "./app.js"

new ElementNode(App).mount(document.getElementById("app")!)
```
:::

`mount()` binds to existing DOM — attaches reactivity and events without re-rendering.

---

## Patches

A Patch is a function that returns a partial element descriptor. Patches compose with the host element, and when the same key exists on both sides, the element definition wins.

<img alt="Patch" src="/figures/patch.png" style="display:block;margin:auto" />

```ts
// applying patches
{
  button: "Submit",
  style: { width: "120px" },  // element styles always win over patch
  $: [button(), loading(isLoading)]
}
```

Merge rules:

| Property | Strategy | Winner |
| --- | --- | --- |
| `style`, attributes | Deep merge | **Element wins** |
| `class`, `transform` | Space-joined | Both kept |
| `animation`, `transition` | Comma-joined | Both kept |
| `onClick`, `onInput`... | Chained | Both run |
| `_onMount`, `_onBeforeRemove`... | Chained | Both run |
| `_key`, `_portal`, `_context`, `_metadata` | Override | **Element wins** |

Writing a patch — use `merge` to compose:

```ts
import { merge, toState, ValueOrState } from "@domphy/core"

function myPatch(props: { open?: ValueOrState<boolean> } = {}): PartialElement {
  const state = toState(props.open ?? false)
  //            ↑ normalize — works whether caller passes true, false, or a State
  return {
    style: { padding: "0.5em 1em", borderRadius: "4px" },
    _onMount: (node) => {
      state.onChange((val) => { /* react to open changes */ })
      node.addHook("Remove", () => { /* cleanup */ })
    }
  }
}

// usage
{ button: "Click", $: [myPatch({ open: isOpen })] }
```

`ValueOrState<T>` is the convention for patch props — always normalize with `toState()` so the patch works whether the caller passes a raw value or a reactive state.

---

## Lifecycle Hooks

Hooks fire in a fixed linear sequence — each exposes more of the node as it progresses.

<img alt="Lifecycle Hooks" src="/figures/hooks.png" width="500" style="display:block;margin:auto" />


```ts
import { DomphyElement, merge } from '@domphy/core'

const App: DomphyElement<"div"> = {
    div: "Hello",

    // Mutate element before node is created — merge patches or read parent context
    _onSchedule: (node, rawElement) => {
        const theme = node.getContext("theme")
        merge(rawElement, { style: { color: theme === "dark" ? "#fff" : "#000" } })
    },

    // Node added to parent.children.items — read position or siblings
    _onInsert: (node) => {
        const index = node.parent!.children.items.indexOf(node)
        node.setMetadata("index", index)
    },

    // DOM element created — attach third-party libs or read dimensions
    _onMount: (node) => {
        const observer = new ResizeObserver(() => {
            console.log(node.domElement!.offsetWidth)
        })
        observer.observe(node.domElement!)
        node.addHook("BeforeRemove", () => observer.disconnect())
    },

    // Before children diff — intercept or modify incoming children
    _onBeforeUpdate: (node, rawChildren) => {
        console.log("incoming:", rawChildren.length)
    },

    // After children reconciled
    _onUpdate: (node) => {
        console.log("children updated:", node.children.items.length)
    },

    // Before removal — run exit animation, call done() to proceed
    _onBeforeRemove: (node, done) => {
        node.domElement!.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 300 }
        ).onfinish = done
    },

    // After removal and disposal
    _onRemove: (node) => {
        console.log("removed")
    },
}
```

| Hook | When | What's available |
| --- | --- | --- |
| `_onSchedule(node, raw)` | Before parsing — mutate `raw` via `merge` | `parent`, `_context`, `_metadata` |
| `_onInit(node)` | After parsing, before insertion | node properties, no siblings yet |
| `_onInsert(node)` | Added to parent's children | siblings, position in tree |
| `_onMount(node)` | DOM element created | `domElement` — all properties |
| `_onUpdate(node)` | After update cycle | `domElement` |
| `_onBeforeRemove(node, done)` | Before removal — **must call `done()`** | `domElement` |
| `_onRemove(node)` | After fully removed | `domElement` may be detached |

`_onSchedule` is the right place to apply context-aware patches — unlike inline `$:[patches]` which are stateless, it can read `parent` context before parsing begins.

→ [ElementNode API](./api/element-node)

---

## Portal

`_portal` redirects where an element's DOM renders — the element stays in the logical Domphy tree, but its DOM node is appended to a different parent.

```ts
{
  div: "Tooltip content",
  _portal: (rootNode) => document.body,
}
```

`rootNode` is the app root `ElementNode`. Use it to query or insert overlay containers:

```ts
{
  div: "...",
  _portal: (rootNode) => {
    let overlay = rootNode.domElement!.querySelector("#my-overlay")
    if (!overlay) {
      overlay = document.createElement("div")
      overlay.id = "my-overlay"
      rootNode.domElement!.appendChild(overlay)
    }
    return overlay
  },
}
```

**Why this matters:** Without `_portal`, fixed/absolute overlays (tooltips, dropdowns, toasts) inherit `overflow: hidden` or `z-index` stacking from ancestor elements, causing clipping or layering bugs. Portaling to a top-level container avoids this entirely.

**Key properties:**
- The element's **logic** (reactivity, events, lifecycle hooks, context) remains tied to its position in the Domphy tree
- Only the **DOM node** moves — parent/child relationships in the logical tree are unchanged
- CSS generated by the element is still injected into `<head>` normally
- `_portal` is evaluated once at mount time — it does not re-evaluate reactively

**When to use:** Any overlay that must escape ancestor stacking context — tooltip, dropdown, toast container, modal backdrop.

---

## Adding Content

There are five patterns for adding content. Each has a distinct trade-off.

### 1. CSS `::before` / `::after`

For purely decorative or static text content, use pseudo-elements in style — no extra DOM nodes.

```ts
{
  div: "Saved",
  style: {
    "&::before": { content: '"✓ "' },
    "&::after":  { content: '" !"' },
  },
}
```

**When to use:** Icons, decorative symbols, labels, badges, separators — any content that is purely visual and requires no interactivity or reactivity.

---

### 2. Declare in tree + hide (state controls visibility)

Declare the element upfront and toggle its visibility via state. The element is always in the logical tree.

```ts
const open = toState(false)

const App = {
  div: [
    { button: "Open", onClick: () => open.set(true) },
    {
      dialog: "...",
      $: [dialog({ open })],
    },
  ],
}
```

**When to use:** Singletons that persist between shows — dialog, drawer, popover, dropdown. The element is stateful and needs to remember position, scroll, or form input between open/close cycles.

---

### 3. Imperative insert (`children.insert()`)

Insert a new element at runtime. Call `.remove()` when done.

```ts
const successToast: DomphyElement<"div"> = {
  div: "Saved successfully",
  $: [toast({ placement: "bottom-left" })],
}

const App = {
  div: [{
    button: "Show Toast",
    $: [button()],
    onClick: (_, node) => {
      const toastNode = node.parent!.children.insert(successToast) as ElementNode
      setTimeout(() => toastNode.remove(), 3000)
    },
  }],
}
```

**When to use:** Ephemeral elements that are created, shown, then destroyed — toast, notification, snackbar. No persistent state needed; each occurrence is independent.

---

### 4. Reactive children (lists from data)

Derive the child list from state. The parent re-diffs its children whenever state changes.

```ts
const items = toState<Item[]>([])

const App = {
  ul: (listener) => items.get(listener).map(item => ({
    li: item.name,
    _key: item.id,
  })),
}
```

**When to use:** Lists driven by external data — filtered results, paginated rows, dynamic tabs. Every item is structurally identical and keyed by data identity.

**Caveat:** The reactive function wraps children in an extra node layer. Avoid for single-element toggling — use pattern 2 or 3 instead.

---

### 5. DOM API in `_onMount`

Use the browser DOM API directly inside `_onMount` to insert content **outside the Domphy tree** — e.g. injecting a `<style>` tag into `<head>`, appending a script, or writing to a portal target that Domphy does not manage.

```ts
{
  div: "App",
  _onMount: (node) => {
    const style = document.createElement("style")
    style.textContent = `.theme { color: red }`
    document.head.appendChild(style)

    node.addHook("Remove", () => style.remove())
  },
}
```

**When to use:** Inserting into nodes outside the app root — `<head>`, `<body>` attributes, third-party containers. **Never use this to manage content inside the Domphy tree** — bypassing the reconciler breaks synchronization and causes stale DOM.

---

### Summary

| Pattern | Best for | DOM nodes |
| --- | --- | --- |
| CSS `::before`/`::after` | Decorative icons, labels, separators | None |
| Declare + hide | Dialog, drawer, popover | Always present |
| Imperative insert | Toast, notification | Created on demand |
| Reactive children | Lists from data | Created on demand |
| DOM API in `_onMount` | Outside root — `<head>`, third-party | Unmanaged |


