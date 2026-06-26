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

For in-app navigation (router.navigate, Link clicks, back button), intercept via `router.subscribe("onBeforeNavigate", ...)` and show a custom dialog:

```ts
import { createRouter } from "@domphy/router"
import { toState } from "@domphy/core"

const formDirty = toState(false)
const pendingNavigation = toState<(() => void) | null>(null)

const router = createRouter({ routeTree })

router.subscribe("onBeforeNavigate", ({ event }) => {
  if (formDirty.get()) {
    // Store the navigation intent so we can resume it after confirmation
    pendingNavigation.set(() => event.preventDefault = false)
    event.preventDefault()   // block for now
  }
})

const ConfirmDialog = {
  div: [
    { h2: "Unsaved changes" },
    { p: "You have unsaved changes. Leave anyway?" },
    {
      div: [
        {
          button: "Stay",
          onClick: () => pendingNavigation.set(null),
        },
        {
          button: "Leave",
          onClick: () => {
            formDirty.set(false)                 // clear dirty state
            const resume = pendingNavigation.get()
            pendingNavigation.set(null)
            if (resume) resume()                 // retry the navigation
          },
        },
      ],
    },
  ],
  hidden: (l) => pendingNavigation.get(l) === null,
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
