// Headless replacement for @tanstack/react-router's Transitioner.tsx.
//
// As of @tanstack/router-core 1.171.32 the core emits the whole lifecycle
// (onLoad / onBeforeRouteMount / onResolved / onRendered) itself from
// load-client.ts. What it asks a framework adapter for is `startTransition`:
// apply the commit, then resolve `true` once the UI has actually rendered
// those matches (core only emits `onRendered` when it resolves `true`; the
// core default resolves `false`). This module supplies that, plus the two
// other jobs upstream's component did: reloading on history changes and
// correcting the initial URL to its canonical form.
import { trimPathRight } from '../path'
import type { AnyRouter } from '../router'

export interface TransitionerHandle {
  cleanup: () => void
  // Router.update() re-runs this when router.history is replaced (the
  // history subscription otherwise stays bound to the stale instance).
  rebindHistory: () => void
}

export function setupTransitioner(router: AnyRouter): TransitionerHandle {
  let cleanedUp = false
  // "Rendered" is signalled from a macrotask; track pending timers so
  // cleanup() can cancel them instead of resolving after teardown.
  const renderTimeouts = new Set<ReturnType<typeof setTimeout>>()

  router.startTransition = async (fn) => {
    if (cleanedUp) {
      return false
    }
    fn()
    // Domphy has no render phase to await: subscribers mirror router state
    // into Domphy states synchronously from the store writes `fn()` performs,
    // and the DOM is updated by the end of the current task. Yielding one
    // macrotask is the headless equivalent of "the UI has committed" — which
    // is what onRendered (and therefore scroll restoration) relies on.
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        renderTimeouts.delete(timeout)
        resolve()
      }, 0)
      renderTimeouts.add(timeout)
    })
    return !cleanedUp
  }

  // Reload the route matches whenever the history changes (back/forward,
  // pushes from navigate, external history.push calls).
  let unsubscribeHistory = router.history.subscribe(router.load)

  // Check if the current URL matches the canonical form and correct it
  // (e.g. missing default search params). `ignoreBlocker: true` as upstream:
  // this is a normalization of the URL the app was opened at, not a user
  // navigation, so a registered blocker must not be able to veto it.
  const nextLocation = router.buildLocation({
    to: router.latestLocation.pathname,
    search: true,
    params: true,
    hash: true,
    state: true,
    _includeValidateSearch: true,
  })
  if (
    trimPathRight(router.latestLocation.publicHref) !==
    trimPathRight(nextLocation.publicHref)
  ) {
    router.commitLocation({
      ...nextLocation,
      replace: true,
      ignoreBlocker: true,
    })
  }

  return {
    cleanup: () => {
      if (cleanedUp) {
        return
      }
      cleanedUp = true
      unsubscribeHistory()
      for (const timeout of renderTimeouts) {
        clearTimeout(timeout)
      }
      renderTimeouts.clear()
    },
    rebindHistory: () => {
      unsubscribeHistory()
      unsubscribeHistory = router.history.subscribe(router.load)
    },
  }
}
