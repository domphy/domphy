// Port of @tanstack/react-router's router.ts without the React layer
// (no component-related RouterOptionsExtensions augmentation). On the
// client the constructor also wires the headless transitioner, which
// upstream mounts as a React component inside RouterProvider.
import { RouterCore } from '../router'
import { getStoreFactory } from './stores'
import { setupTransitioner } from './transitioner'
import type { AnyRouter } from '../router'
import type { RouterHistory } from '@tanstack/history'
import type { AnyRoute } from '../route'
import type { TransitionerHandle } from './transitioner'
import type {
  CreateRouterFn,
  RouterConstructorOptions,
  TrailingSlashOption,
} from '../router'

/**
 * Creates a Router from a route tree and router options.
 *
 * The router drives matching, navigation, loaders, and SSR. Subscribe to
 * its events (`onResolved`, `onBeforeLoad`, ...) to mirror `router.state`
 * into Domphy states.
 */
export const createRouter: CreateRouterFn = (options) => {
  return new Router(options)
}

export class Router<
  in out TRouteTree extends AnyRoute,
  in out TTrailingSlashOption extends TrailingSlashOption = 'never',
  in out TDefaultStructuralSharingOption extends boolean = false,
  in out TRouterHistory extends RouterHistory = RouterHistory,
  in out TDehydrated extends Record<string, any> = Record<string, any>,
> extends RouterCore<
  TRouteTree,
  TTrailingSlashOption,
  TDefaultStructuralSharingOption,
  TRouterHistory,
  TDehydrated
> {
  private transitioner?: TransitionerHandle

  constructor(
    options: RouterConstructorOptions<
      TRouteTree,
      TTrailingSlashOption,
      TDefaultStructuralSharingOption,
      TRouterHistory,
      TDehydrated
    >,
  ) {
    super(options, getStoreFactory)

    // RouterCore.update is an instance field (not a prototype method), so
    // it can't be reached through `super.update` from an override. Capture
    // the base implementation this instance already got from super() and
    // wrap it instead.
    const baseUpdate = this.update
    this.update = (newOptions) => {
      const previousHistory = this.history
      baseUpdate(newOptions)
      if (this.transitioner && this.history !== previousHistory) {
        this.transitioner.rebindHistory()
      }
    }

    if (!this.isServer) {
      this.transitioner = setupTransitioner(this as unknown as AnyRouter)
    }
  }

  /**
   * Releases the transitioner's history/store subscriptions. Call this when
   * discarding a Router instance (HMR, locale-switch patterns) so it stops
   * reacting to history and store changes.
   */
  destroy(): void {
    this.transitioner?.cleanup()
    this.transitioner = undefined
  }
}
