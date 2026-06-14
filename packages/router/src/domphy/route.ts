// Port of @tanstack/react-router's route.tsx without the React layer:
// no use* hooks, no Link components, no component-related option extensions.
// Class and function signatures mirror upstream so TanStack Router docs
// apply as-is.
import { BaseRootRoute, BaseRoute, BaseRouteApi } from '../route'
import type {
  AnyContext,
  AnyRoute,
  ResolveFullPath,
  ResolveId,
  ResolveParams,
  RootRoute as RootRouteCore,
  RootRouteOptions,
  RouteConstraints,
  Route as RouteCore,
  RouteMask,
  RouteOptions,
} from '../route'
import type {
  AnyRouter,
  Register,
  RegisteredRouter,
  RouterCore,
} from '../router'
import type { ConstrainLiteral } from '../utils'
import type { RouteIds } from '../routeInfo'
import type { ToMaskOptions } from '../link'

/**
 * Returns a route-specific API bound to a single route ID, for consuming
 * a route's typed match data from files where the route object isn't
 * directly imported.
 */
export function getRouteApi<
  const TId,
  TRouter extends AnyRouter = RegisteredRouter,
>(id: ConstrainLiteral<TId, RouteIds<TRouter['routeTree']>>) {
  return new RouteApi<TId, TRouter>({ id })
}

export class RouteApi<
  in out TId,
  in out TRouter extends AnyRouter = RegisteredRouter,
> extends BaseRouteApi<TId, TRouter> {
  /**
   * @deprecated Use the `getRouteApi` function instead.
   */
  constructor({ id }: { id: TId }) {
    super({ id })
  }
}

export class Route<
    in out TRegister = unknown,
    in out TParentRoute extends RouteConstraints['TParentRoute'] = AnyRoute,
    in out TPath extends RouteConstraints['TPath'] = '/',
    in out TFullPath extends RouteConstraints['TFullPath'] = ResolveFullPath<
      TParentRoute,
      TPath
    >,
    in out TCustomId extends RouteConstraints['TCustomId'] = string,
    in out TId extends RouteConstraints['TId'] = ResolveId<
      TParentRoute,
      TCustomId,
      TPath
    >,
    in out TSearchValidator = undefined,
    in out TParams = ResolveParams<TPath>,
    in out TRouterContext = AnyContext,
    in out TRouteContextFn = AnyContext,
    in out TBeforeLoadFn = AnyContext,
    in out TLoaderDeps extends Record<string, any> = {},
    in out TLoaderFn = undefined,
    in out TChildren = unknown,
    in out TFileRouteTypes = unknown,
    in out TSSR = unknown,
    in out TServerMiddlewares = unknown,
    in out THandlers = undefined,
  >
  extends BaseRoute<
    TRegister,
    TParentRoute,
    TPath,
    TFullPath,
    TCustomId,
    TId,
    TSearchValidator,
    TParams,
    TRouterContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TLoaderDeps,
    TLoaderFn,
    TChildren,
    TFileRouteTypes,
    TSSR,
    TServerMiddlewares,
    THandlers
  >
  implements
    RouteCore<
      TRegister,
      TParentRoute,
      TPath,
      TFullPath,
      TCustomId,
      TId,
      TSearchValidator,
      TParams,
      TRouterContext,
      TRouteContextFn,
      TBeforeLoadFn,
      TLoaderDeps,
      TLoaderFn,
      TChildren,
      TFileRouteTypes,
      TSSR,
      TServerMiddlewares,
      THandlers
    >
{
  /**
   * @deprecated Use the `createRoute` function instead.
   */
  constructor(
    options?: RouteOptions<
      TRegister,
      TParentRoute,
      TId,
      TCustomId,
      TFullPath,
      TPath,
      TSearchValidator,
      TParams,
      TLoaderDeps,
      TLoaderFn,
      TRouterContext,
      TRouteContextFn,
      TBeforeLoadFn,
      TSSR,
      TServerMiddlewares,
      THandlers
    >,
  ) {
    super(options)
  }
}

/**
 * Creates a non-root Route instance for code-based routing.
 *
 * Use this to define a route that will be composed into a route tree
 * (typically via a parent route's `addChildren`).
 */
export function createRoute<
  TRegister = unknown,
  TParentRoute extends RouteConstraints['TParentRoute'] = AnyRoute,
  TPath extends RouteConstraints['TPath'] = '/',
  TFullPath extends RouteConstraints['TFullPath'] = ResolveFullPath<
    TParentRoute,
    TPath
  >,
  TCustomId extends RouteConstraints['TCustomId'] = string,
  TId extends RouteConstraints['TId'] = ResolveId<
    TParentRoute,
    TCustomId,
    TPath
  >,
  TSearchValidator = undefined,
  TParams = ResolveParams<TPath>,
  TRouteContextFn = AnyContext,
  TBeforeLoadFn = AnyContext,
  TLoaderDeps extends Record<string, any> = {},
  TLoaderFn = undefined,
  TChildren = unknown,
  TSSR = unknown,
  const TServerMiddlewares = unknown,
>(
  options: RouteOptions<
    TRegister,
    TParentRoute,
    TId,
    TCustomId,
    TFullPath,
    TPath,
    TSearchValidator,
    TParams,
    TLoaderDeps,
    TLoaderFn,
    AnyContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TSSR,
    TServerMiddlewares
  >,
): Route<
  TRegister,
  TParentRoute,
  TPath,
  TFullPath,
  TCustomId,
  TId,
  TSearchValidator,
  TParams,
  AnyContext,
  TRouteContextFn,
  TBeforeLoadFn,
  TLoaderDeps,
  TLoaderFn,
  TChildren,
  TSSR,
  TServerMiddlewares
> {
  return new Route<
    TRegister,
    TParentRoute,
    TPath,
    TFullPath,
    TCustomId,
    TId,
    TSearchValidator,
    TParams,
    AnyContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TLoaderDeps,
    TLoaderFn,
    TChildren,
    TSSR,
    TServerMiddlewares
  >(options as any)
}

export type AnyRootRoute = RootRoute<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

/**
 * Creates a root route factory that requires a router context type.
 *
 * The returned function behaves like `createRootRoute` but enforces a
 * context type provided to `createRouter`.
 */
export function createRootRouteWithContext<TRouterContext extends {}>() {
  return <
    TRegister = Register,
    TRouteContextFn = AnyContext,
    TBeforeLoadFn = AnyContext,
    TSearchValidator = undefined,
    TLoaderDeps extends Record<string, any> = {},
    TLoaderFn = undefined,
    TSSR = unknown,
    TServerMiddlewares = unknown,
  >(
    options?: RootRouteOptions<
      TRegister,
      TSearchValidator,
      TRouterContext,
      TRouteContextFn,
      TBeforeLoadFn,
      TLoaderDeps,
      TLoaderFn,
      TSSR,
      TServerMiddlewares
    >,
  ) => {
    return createRootRoute<
      TRegister,
      TSearchValidator,
      TRouterContext,
      TRouteContextFn,
      TBeforeLoadFn,
      TLoaderDeps,
      TLoaderFn,
      TSSR,
      TServerMiddlewares
    >(options)
  }
}

/**
 * @deprecated Use the `createRootRouteWithContext` function instead.
 */
export const rootRouteWithContext = createRootRouteWithContext

export class RootRoute<
    in out TRegister = unknown,
    in out TSearchValidator = undefined,
    in out TRouterContext = {},
    in out TRouteContextFn = AnyContext,
    in out TBeforeLoadFn = AnyContext,
    in out TLoaderDeps extends Record<string, any> = {},
    in out TLoaderFn = undefined,
    in out TChildren = unknown,
    in out TFileRouteTypes = unknown,
    in out TSSR = unknown,
    in out TServerMiddlewares = unknown,
    in out THandlers = undefined,
  >
  extends BaseRootRoute<
    TRegister,
    TSearchValidator,
    TRouterContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TLoaderDeps,
    TLoaderFn,
    TChildren,
    TFileRouteTypes,
    TSSR,
    TServerMiddlewares,
    THandlers
  >
  implements
    RootRouteCore<
      TRegister,
      TSearchValidator,
      TRouterContext,
      TRouteContextFn,
      TBeforeLoadFn,
      TLoaderDeps,
      TLoaderFn,
      TChildren,
      TFileRouteTypes,
      TSSR,
      TServerMiddlewares,
      THandlers
    >
{
  /**
   * @deprecated `RootRoute` is now an internal implementation detail. Use `createRootRoute()` instead.
   */
  constructor(
    options?: RootRouteOptions<
      TRegister,
      TSearchValidator,
      TRouterContext,
      TRouteContextFn,
      TBeforeLoadFn,
      TLoaderDeps,
      TLoaderFn,
      TSSR,
      TServerMiddlewares,
      THandlers
    >,
  ) {
    super(options)
  }
}

/**
 * Creates a root Route instance used to build your route tree.
 *
 * Typically paired with `createRouter({ routeTree })`. If you need to
 * require a typed router context, use `createRootRouteWithContext` instead.
 */
export function createRootRoute<
  TRegister = Register,
  TSearchValidator = undefined,
  TRouterContext = {},
  TRouteContextFn = AnyContext,
  TBeforeLoadFn = AnyContext,
  TLoaderDeps extends Record<string, any> = {},
  TLoaderFn = undefined,
  TSSR = unknown,
  const TServerMiddlewares = unknown,
  THandlers = undefined,
>(
  options?: RootRouteOptions<
    TRegister,
    TSearchValidator,
    TRouterContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TLoaderDeps,
    TLoaderFn,
    TSSR,
    TServerMiddlewares,
    THandlers
  >,
): RootRoute<
  TRegister,
  TSearchValidator,
  TRouterContext,
  TRouteContextFn,
  TBeforeLoadFn,
  TLoaderDeps,
  TLoaderFn,
  unknown,
  unknown,
  TSSR,
  TServerMiddlewares,
  THandlers
> {
  return new RootRoute<
    TRegister,
    TSearchValidator,
    TRouterContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TLoaderDeps,
    TLoaderFn,
    unknown,
    unknown,
    TSSR,
    TServerMiddlewares,
    THandlers
  >(options)
}

/**
 * Creates a route mask used to display a different location than the one
 * actually being navigated to.
 */
export function createRouteMask<
  TRouteTree extends AnyRoute,
  TFrom extends string,
  TTo extends string,
>(
  opts: {
    routeTree: TRouteTree
  } & ToMaskOptions<RouterCore<TRouteTree, 'never', boolean>, TFrom, TTo>,
): RouteMask<TRouteTree> {
  return opts as any
}

export class NotFoundRoute<
  TRegister,
  TParentRoute extends AnyRootRoute,
  TRouterContext = AnyContext,
  TRouteContextFn = AnyContext,
  TBeforeLoadFn = AnyContext,
  TSearchValidator = undefined,
  TLoaderDeps extends Record<string, any> = {},
  TLoaderFn = undefined,
  TChildren = unknown,
  TSSR = unknown,
  TServerMiddlewares = unknown,
> extends Route<
  TRegister,
  TParentRoute,
  '/404',
  '/404',
  '404',
  '404',
  TSearchValidator,
  {},
  TRouterContext,
  TRouteContextFn,
  TBeforeLoadFn,
  TLoaderDeps,
  TLoaderFn,
  TChildren,
  TSSR,
  TServerMiddlewares
> {
  constructor(
    options: Omit<
      RouteOptions<
        TRegister,
        TParentRoute,
        string,
        string,
        string,
        string,
        TSearchValidator,
        {},
        TLoaderDeps,
        TLoaderFn,
        TRouterContext,
        TRouteContextFn,
        TBeforeLoadFn,
        TSSR,
        TServerMiddlewares
      >,
      | 'caseSensitive'
      | 'parseParams'
      | 'stringifyParams'
      | 'path'
      | 'id'
      | 'params'
    >,
  ) {
    super({
      ...(options as any),
      id: '404',
    })
  }
}
