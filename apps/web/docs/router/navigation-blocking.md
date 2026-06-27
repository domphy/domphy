---
title: "Navigation Blocking"
description: "Prevent navigation away from unsaved forms, confirm before leaving, and handle beforeunload."
---

# Navigation Blocking

## Blocking with `beforeunload`

The simplest pattern — show the native browser dialog when the user tries to close/refresh the tab with unsaved changes:

```ts
import { effect } from "@domphy/core"
import { toState } from "@domphy/core"

const formDirty = toState(false)

effect(() => {
  const dirty = formDirty.get()

  if (dirty) {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""   // Chrome requires this to show the dialog
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }
})
```

Note: modern browsers show their own generic message in `beforeunload` — you cannot customize the text.

## Blocking router navigation with a confirmation dialog

For in-app navigation (router.navigate, Link clicks, back button), register a blocker via `router.history.block`. The `blockerFn` returns `true` to allow or `false` to cancel, or shows a custom dialog asynchronously:

```ts
import { toState } from "@domphy/core"

const formDirty = toState(false)
const showConfirm = toState(false)

// Block navigation when the form is dirty
const unblock = router.history.block({
  blockerFn: ({ nextLocation }) => {
    if (!formDirty.get()) return true    // allow
    // Show a custom dialog and wait for the user's choice
    showConfirm.set(true)
    return false                          // block for now
  },
  enableBeforeUnload: () => formDirty.get(),
})

const ConfirmDialog = {
  div: [
    { h2: "Unsaved changes" },
    { p: "You have unsaved changes. Leave anyway?" },
    {
      div: [
        {
          button: "Stay",
          onClick: () => showConfirm.set(false),
        },
        {
          button: "Leave",
          onClick: () => {
            formDirty.set(false)     // clear dirty state so the blocker passes
            showConfirm.set(false)
            unblock()                // remove the blocker
            router.history.back()   // or router.navigate({ to: pendingPath })
          },
        },
      ],
    },
  ],
  hidden: (l) => !showConfirm.get(l),
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

// Remove the blocker when the form is saved
function onFormSaved() {
  unblock()
}
```

## Auto-save (alternative to blocking)

Instead of blocking navigation, auto-save periodically so there's never unsaved work to lose:

```ts
import { effect } from "@domphy/core"
import { createForm } from "@domphy/form/domphy"

const form = createForm<EditInput>({
  defaultValues: { title: "", body: "" },
  onSubmit: async ({ value }) => saveFinal(value),
})

// Auto-save every 10 seconds when dirty
effect(() => {
  const dirty = form.state().isDirty
  if (!dirty) return

  const timer = setInterval(() => {
    if (form.state().isDirty) saveDraft(form.form.state.values)
  }, 10_000)

  return () => clearInterval(timer)
})

// Also save on tab hide (user switches to another tab)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && form.state().isDirty) {
    saveDraft(form.form.state.values)
  }
})
```

## "Leave" link with confirmation

For a specific link that should confirm before leaving:

```ts
import { toState } from "@domphy/core"

const showConfirm = toState(false)
const targetHref = toState("")

const SafeLink = (href: string, label: string) => ({
  a: label,
  href,
  onClick: (e: MouseEvent) => {
    if (formDirty.get()) {
      e.preventDefault()
      targetHref.set(href)
      showConfirm.set(true)
    }
  },
})

const LeaveConfirmDialog = {
  div: [
    { h2: "Unsaved changes" },
    { p: "Leave without saving?" },
    {
      div: [
        { button: "Cancel", onClick: () => showConfirm.set(false) },
        {
          button: "Leave",
          onClick: () => {
            formDirty.set(false)
            showConfirm.set(false)
            router.navigate({ to: targetHref.get() })
          },
        },
      ],
    },
  ],
  hidden: (l) => !showConfirm.get(l),
}
```

## `ignoreBlocker` — bypass confirmation

Some navigations should never be blocked (e.g., logout, error recovery):

```ts
router.navigate({
  to: "/login",
  ignoreBlocker: true,   // skip any blocking logic
  replace: true,
})
```
