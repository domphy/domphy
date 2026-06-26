---
title: "Navigation Blocking"
description: "Prevent navigation away from unsaved forms, confirm before leaving, and handle beforeunload."
---

# Navigation Blocking

Prevent accidental navigation away from a page with unsaved changes — show a confirmation dialog before the user leaves.

## `useBlocker` — block programmatic navigation

`useBlocker` halts all navigation (back button, router.navigate, link clicks) when a condition is true:

```ts
import { useBlocker } from "@domphy/router"
import { toState } from "@domphy/core"

const formDirty = toState(false)

const { proceed, reset, status } = useBlocker({
  shouldBlockFn: () => formDirty.get(),
  withResolver: true,
})
```

When `shouldBlockFn` returns `true`, navigation is blocked. `status` becomes `"blocked"`. Your UI can then show a confirmation:

```ts
const UnsavedChangesDialog = {
  div: [
    { h2: "Unsaved changes" },
    { p: "You have unsaved changes. Leave anyway?" },
    {
      div: [
        { button: "Stay", onClick: () => reset() },
        { button: "Leave", onClick: () => proceed() },
      ],
    },
  ],
  hidden: (l) => status(l) !== "blocked",
  style: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
}
```

- `proceed()` — allow the navigation to continue
- `reset()` — cancel the blocked navigation, stay on current page

## Wiring with form state

```ts
import { createForm } from "@domphy/form/domphy"
import { useBlocker } from "@domphy/router"

const form = createForm<EditInput>({
  defaultValues: { title: "", body: "" },
  onSubmit: async ({ value }) => {
    await savePost(value)
    // After successful save, isDirty becomes false — blocker relaxes
  },
})

const { proceed, reset, status } = useBlocker({
  shouldBlockFn: () => form.isDirty(),
  withResolver: true,
})

const EditPage = {
  div: [
    EditForm,
    UnsavedChangesDialog,   // shows when status === "blocked"
  ],
}
```

## `beforeunload` for browser navigation

`useBlocker` only intercepts router navigation. To block browser-level navigation (refresh, closing tab, navigating to external URL), also wire `beforeunload`:

```ts
import { effect } from "@domphy/core"

// Show native browser dialog when closing/refreshing with unsaved changes
effect(() => {
  const dirty = formDirty.get()

  if (dirty) {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""   // Chrome requires this
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }
})
```

Note: modern browsers show their own generic message — you can't customize the text in `beforeunload`.

## Auto-save (alternative to blocking)

Instead of blocking navigation, auto-save the form periodically so there's never unsaved work:

```ts
import { effect } from "@domphy/core"

// Auto-save every 10 seconds when the form is dirty
effect(() => {
  const dirty = form.isDirty()
  if (!dirty) return

  const timer = setInterval(async () => {
    if (form.isDirty()) {
      await saveDraft(form.form.state.values)
    }
  }, 10_000)

  return () => clearInterval(timer)
})
```

Or save on `visibilitychange` (user switches tabs):

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden && form.form.state.isDirty) {
    saveDraft(form.form.state.values)
  }
})
```

## Blocking state machine

The blocker state transitions:

```
idle → (navigation attempted, shouldBlockFn = true) → blocked
blocked → proceed() → unblocked (navigation continues)
blocked → reset() → idle (navigation cancelled)
```

Access the full state:

```ts
const blocker = useBlocker({ shouldBlockFn: () => isDirty })

// blocker.state → "idle" | "blocked"
// blocker.location → the location the user tried to navigate to (when blocked)
// blocker.proceed() → allow navigation
// blocker.reset() → cancel navigation
```

## Multiple blockers

Multiple `useBlocker` calls coexist — navigation is blocked if ANY returns `true`:

```ts
const videoBlocker = useBlocker({
  shouldBlockFn: () => videoPlaying.get(),
  withResolver: true,
})

const formBlocker = useBlocker({
  shouldBlockFn: () => form.isDirty(),
  withResolver: true,
})

// Both must be resolved / reset before navigation proceeds
```
