// Port of @tanstack/react-router's Transitioner.tsx without React:
// store subscriptions replace useStore, plain locals replace useState/
// usePrevious. Responsible for reloading on history changes and for the
// onLoad / onBeforeRouteMount / onResolved / onRendered event lifecycle.
import { batch } from '@tanstack/store'
import { getLocationChangeInfo } from '../router'
import { trimPathRight } from '../path'
import type { Readable } from '@tanstack/store'
import type { AnyRouter } from '../router'

// On the client, getStoreFactory builds the stores from @tanstack/store
// atoms, which are subscribable. The core store interfaces don't carry
// subscribe (see stores.ts), hence the local cast.
function asReadable<TValue>(store: { get: () => TValue }): Readable<TValue> {
  return store as Readable<TValue>
}

export function setupTransitioner(router: AnyRouter): () => void {
  let isTransitioning = false

  let previousIsLoading = router.stores.isLoading.get()
  let previousIsPagePending =
    previousIsLoading || router.stores.hasPending.get()
  let previousIsAnyPending = previousIsPagePending || isTransitioning

  const update = () => {
    const isLoading = router.stores.isLoading.get()
    const isPagePending = isLoading || router.stores.hasPending.get()
    const isAnyPending = isPagePending || isTransitioning

    // The router was loading and now it's not
    if (previousIsLoading && !isLoading) {
      router.emit({
        type: 'onLoad', // When the new URL has committed, when the new matches have been loaded into state.matches
        ...getLocationChangeInfo(
          router.stores.location.get(),
          router.stores.resolvedLocation.get(),
        ),
      })
    }

    if (previousIsPagePending && !isPagePending) {
      router.emit({
        type: 'onBeforeRouteMount',
        ...getLocationChangeInfo(
          router.stores.location.get(),
          router.stores.resolvedLocation.get(),
        ),
      })
    }

    if (previousIsAnyPending && !isAnyPending) {
      const changeInfo = getLocationChangeInfo(
        router.stores.location.get(),
        router.stores.resolvedLocation.get(),
      )
      router.emit({
        type: 'onResolved',
        ...changeInfo,
      })

      batch(() => {
        router.stores.status.set('idle')
        router.stores.resolvedLocation.set(router.stores.location.get())
      })

      // Upstream emits onRendered from its Match component after the UI
      // commits. The headless equivalent: emit on the next macrotask, after
      // onResolved subscribers have mirrored router state into Domphy
      // states and the DOM has updated. Scroll restoration relies on this.
      setTimeout(() => {
        router.emit({
          type: 'onRendered',
          ...changeInfo,
        })
      }, 0)
    }

    previousIsLoading = isLoading
    previousIsPagePending = isPagePending
    previousIsAnyPending = isAnyPending
  }

  router.startTransition = (fn) => {
    isTransitioning = true
    update()
    fn()
    isTransitioning = false
    update()
  }

  const subscriptions = [
    asReadable(router.stores.isLoading).subscribe(update),
    asReadable(router.stores.hasPending).subscribe(update),
  ]

  // Reload the route matches whenever the history changes (back/forward,
  // pushes from navigate, external history.push calls).
  const unsubscribeHistory = router.history.subscribe(router.load)

  // Check if the current URL matches the canonical form and correct it
  // (e.g. missing default search params).
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
    router.commitLocation({ ...nextLocation, replace: true })
  }

  return () => {
    for (const subscription of subscriptions) {
      subscription.unsubscribe()
    }
    unsubscribeHistory()
  }
}
