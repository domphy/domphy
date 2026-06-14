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
    if (!this.isServer) {
      setupTransitioner(this as unknown as AnyRouter)
    }
  }
}
