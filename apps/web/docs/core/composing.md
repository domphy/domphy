---
title: "Composing Elements"
description: "How to build reusable, composable UI components as plain objects — props patterns, slots, and element composition."
---

# Composing Elements

## Elements are values

A Domphy element is a plain object — you can store it in a variable, pass it as a function argument, return it from a function, or put it in an array:

```ts
const Icon = { span: "✓", style: { color: "green" } }

const Row = {
  div: [Icon, { span: "Done" }],
  style: { display: "flex", gap: "8px" },
}
```

No instantiation, no lifecycle — just values.

## Component functions

Create parameterized components as functions that return elements:

```ts
interface AlertProps {
  type: "info" | "success" | "warning" | "error"
  message: string
  onDismiss?: () => void
}

function Alert({ type, message, onDismiss }: AlertProps) {
  const icons = { info: "ℹ", success: "✓", warning: "⚠", error: "✕" }

  return {
    div: [
      { span: icons[type] },
      { p: message },
      onDismiss
        ? { button: "✕", onClick: onDismiss, "aria-label": "Dismiss" }
        : null,
    ].filter(Boolean),
    role: "alert",
    class: `alert alert-${type}`,
  }
}

// Usage
const ErrorAlert = Alert({ type: "error", message: "Something went wrong", onDismiss: () => {} })
```

## Reactive components

A component function returns a new element every time it's called — for reactive components, use a listener-based render function:

```ts
function Counter(label: string) {
  const count = toState(0)

  return {
    div: [
      { span: (l) => `${label}: ${count.get(l)}` },
      { button: "+", onClick: () => count.set(n => n + 1) },
      { button: "-", onClick: () => count.set(n => n - 1) },
    ],
  }
}

const App = {
  div: [
    Counter("Apples"),
    Counter("Oranges"),   // each has its own independent count state
  ],
}
```

Each call to `Counter()` creates a new `toState` — the two counters are independent.

## Slot pattern (children-like content)

Pass child elements via a prop:

```ts
function Card({
  title,
  children,
  footer,
}: {
  title: string
  children: DomphyElement | DomphyElement[]
  footer?: DomphyElement
}) {
  return {
    div: [
      { h3: title },
      { div: children },
      footer ? { div: footer } : null,
    ].filter(Boolean),
    class: "card",
  }
}

const ProfileCard = Card({
  title: "Alice",
  children: { p: "Software engineer" },
  footer: { button: "Follow" },
})
```

## Spreading and merging elements

Merge partial elements to extend a base component:

```ts
const base = {
  button: "Click",
  style: { padding: "8px 16px" },
}

// Extend with additional style
const primary = {
  ...base,
  style: { ...base.style, background: "blue", color: "white" },
}

// Add a patch
const iconButton = {
  ...base,
  $: [...(base.$ ?? []), tooltip({ content: "Submit form" })],
}
```

## Element arrays and conditionals

```ts
function UserMenu(user: User | null) {
  if (!user) {
    return [
      { a: "Log in", href: "/login" },
      { a: "Sign up", href: "/signup" },
    ]
  }

  return [
    { span: user.name },
    { a: "Profile", href: `/profile/${user.id}` },
    { button: "Log out", onClick: logout },
  ]
}

const Nav = {
  nav: (l) => UserMenu(currentUser.get(l)),
}
```

## Render list with transforms

```ts
interface Post { id: string; title: string; published: boolean }

function PostList(posts: Post[]) {
  const published = posts.filter(p => p.published)

  return {
    ul: published.map(post => ({
      li: [
        { a: post.title, href: `/posts/${post.id}` },
        { span: "Published", class: "badge" },
      ],
      _key: post.id,
    })),
  }
}
```

## Composition vs patching

| Use | When |
|-----|------|
| **Function returning element** | Reusable component with props |
| **Patch (`$`)** | Behavior/style that applies on top of any native element |
| **Spread (`...base`)** | Extend a specific element shape |
| **Array of elements** | Multiple sibling elements |

Patches are stateless and composable — prefer them for behaviors. Functions are better when you need encapsulated state or complex DOM structure.

## Lazy rendering

Defer rendering of expensive elements until needed:

```ts
import { toState } from "@domphy/core"

const showChart = toState(false)

const Dashboard = {
  div: [
    { button: "Show chart", onClick: () => showChart.set(true) },
    // Chart only renders when showChart is true
    {
      div: (l) => showChart.get(l) ? HeavyChart : null,
    },
  ],
}
```

`null` renders nothing — the Chart component's `_onMount`/`_onRemove` lifecycle runs only when it's actually added to the DOM.
