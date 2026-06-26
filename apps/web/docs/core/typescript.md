---
title: "TypeScript"
description: "Typing Domphy elements, state, patches, event handlers, and components."
---

# TypeScript

Domphy is written in TypeScript and ships full type definitions. This page covers patterns for getting full type safety in UI code.

## Element types

```ts
import type { DomphyElement } from "@domphy/core"

// A function returning a Domphy element
function heading(text: string): DomphyElement {
  return { h1: text }
}

// A plain element — no function wrapper needed for static content
const footer: DomphyElement = { footer: "© 2025 Acme" }
```

`DomphyElement` is the union of all valid element shapes:
- `{ tag: content }` — element with tag as key
- `string | number | boolean` — text node
- `DomphyElement[]` — array of elements
- `null | undefined` — renders nothing

## Typing state

```ts
import { toState, RecordState } from "@domphy/core"

// Simple state
const count = toState<number>(0)   // State<number>
const user = toState<User | null>(null)   // State<User | null>

// Record state — typed fields
interface FormData {
  name: string
  email: string
  age: number
}

const form = new RecordState<FormData>({ name: "", email: "", age: 0 })
// form.get(l, "name") → string
// form.set("age", 25) — type-checked
```

## Typing listener callbacks

Listener functions receive a `Listener` parameter:

```ts
import type { Listener } from "@domphy/core"

function renderCount(l: Listener): string {
  return `Count: ${count.get(l)}`
}

const Counter = {
  span: (l: Listener) => renderCount(l),
}
```

In practice, TypeScript infers the `Listener` type from context — explicit annotation is only needed for extracted functions.

## Typing event handlers

DOM event handlers are typed as `(event: Event) => void`. For specific event types, cast `event.target`:

```ts
const Input = {
  input: null,
  type: "text",
  value: (l) => name.get(l),
  onInput: (event: Event) => {
    const target = event.target as HTMLInputElement
    name.set(target.value)
  },
  onKeyDown: (event: KeyboardEvent) => {
    if (event.key === "Enter") submit()
  },
}
```

## Typing patches

When creating custom patches, type the `Patch` interface:

```ts
import type { Patch, ElementNode } from "@domphy/core"

interface TooltipOptions {
  text: string
  placement?: "top" | "bottom" | "left" | "right"
}

function tooltip(options: TooltipOptions): Patch {
  return {
    apply(node: ElementNode) {
      node.domElement.title = options.text
      // ... position logic
    },
    destroy(node: ElementNode) {
      node.domElement.title = ""
    },
  }
}
```

## Typing components

Components are just functions that return `DomphyElement`. Type their props explicitly:

```ts
import type { DomphyElement } from "@domphy/core"

interface CardProps {
  title: string
  body: string
  action?: DomphyElement
}

function Card({ title, body, action }: CardProps): DomphyElement {
  return {
    article: [
      { h2: title },
      { p: body },
      ...(action ? [action] : []),
    ],
  }
}

const MyCard = Card({
  title: "Hello",
  body: "World",
  action: { button: "Click me" },
})
```

## Generic state utilities

```ts
import { toState, computed } from "@domphy/core"
import type { State, Listener } from "@domphy/core"

// Generic async state pattern
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function createAsyncState<T>(initial: T | null = null): State<AsyncState<T>> {
  return toState<AsyncState<T>>({ data: initial, loading: false, error: null })
}

// Generic selector
function select<T, R>(state: State<T>, fn: (value: T, l: Listener) => R): (l: Listener) => R {
  return (l: Listener) => fn(state.get(l), l)
}

const userName = select(user, (u) => u?.name ?? "Guest")

const Header = {
  span: (l) => userName(l),   // (l: Listener) => string
}
```

## Typing @domphy/ui patches

UI patches are typed — TypeScript will catch invalid prop values:

```ts
import { button, inputText, label } from "@domphy/ui"
import type { Tone, Size, Density } from "@domphy/theme"

// Type-safe tone/size/density
const btn = button({
  tone: "shift-1",     // ✓
  size: 3,             // ✓
  density: 5,          // ✗ Error: density max is 4
})
```

## Path types for @domphy/form

Form field names are typed with `DeepKeys`:

```ts
import { createForm } from "@domphy/form/domphy"
import type { DeepKeys } from "@domphy/form"

interface UserForm {
  profile: { name: string; bio: string }
  notifications: { email: boolean; sms: boolean }
}

const form = createForm<UserForm>({
  defaultValues: {
    profile: { name: "", bio: "" },
    notifications: { email: true, sms: false },
  },
  onSubmit: ({ value }) => save(value),
})

// DeepKeys<UserForm> = "profile" | "notifications" | "profile.name" | "profile.bio" | "notifications.email" | "notifications.sms"
const nameField = form.field<string>("profile.name", {})   // ✓
const badField  = form.field<string>("profile.age", {})    // ✗ Error: not a valid key
```

## Strict mode

Enable strict TypeScript for the strongest guarantees:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

With `strict: true`, Domphy's listener callbacks will correctly require handling `T | undefined` when indexing arrays.

## Type utilities

```ts
import type {
  DomphyElement,   // any valid element
  Listener,        // listener callback argument
  State,           // toState return type
  Patch,           // patch definition
  ElementNode,     // DOM element wrapper
  TextNode,        // text node wrapper
  AttributeList,   // $-attribute list
  ElementList,     // element list in element.children
} from "@domphy/core"
```
