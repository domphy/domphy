import type {
  ErrorBlock,
  LayoutBlock,
  Loader,
  LoadingBlock,
  MetadataValue,
  Middleware,
  PageBlock,
  Route,
  RouteModule,
} from "./types.js";

/**
 * Code-splitting support for route definitions.
 *
 * A route may declare `lazy: () => import("./heavy.js")` (or any function
 * returning a `Promise<RouteModule>`). The heavy parts of the route — usually
 * its `page`, but also `layout`, `loading`, `error`, `metadata`, `loader` and
 * `middleware` — then live in a separately bundled module that is fetched on
 * demand the first time the route is rendered or navigated to.
 *
 * Resolution is memoized per `Route` object: the import runs at most once for
 * the whole application, regardless of how many renders, prefetches or server
 * routers touch the route. The resolved module is merged with the route's eager
 * fields so a route can mix the two freely.
 *
 * Precedence: eager fields declared directly on the route win over the lazy
 * module on conflict. The recommended split is therefore that the lazy module
 * supplies the heavy `page` (and optionally `layout`/`loading`), while eager
 * fields on the route stay for cheap configuration such as `path`, `metadata`,
 * `revalidate` and `redirect`. Eager-wins keeps that configuration statically
 * inspectable and lets a route override a single block from a shared module.
 */

/** Module-level fields a lazy route may resolve to. */
const MODULE_KEYS: (keyof RouteModule)[] = [
  "page",
  "layout",
  "loading",
  "error",
  "notFound",
  "metadata",
  "loader",
  "middleware",
];

/** The merged module of a route once its lazy import has resolved. */
const resolved = new WeakMap<Route, RouteModule>();
/** In-flight imports, keyed by route, so concurrent callers share one promise. */
const inflight = new WeakMap<Route, Promise<RouteModule>>();

/** Whether a route still has an unresolved lazy import. */
export function hasPendingLazy(route: Route): boolean {
  return route.lazy !== undefined && !resolved.has(route);
}

/**
 * Resolves a route's lazy import exactly once and merges it with the eager
 * fields (eager wins). Returns immediately for routes without `lazy`. The
 * import promise is shared across concurrent callers and never re-run after it
 * resolves. A rejected import is not cached, so a later attempt can retry, and
 * the rejection propagates to the caller (the router routes it to the nearest
 * error boundary).
 */
export function resolveLazyRoute(route: Route): Promise<RouteModule> {
  if (route.lazy === undefined) return Promise.resolve({});
  const existing = resolved.get(route);
  if (existing) return Promise.resolve(existing);
  const pending = inflight.get(route);
  if (pending) return pending;

  const promise = Promise.resolve(route.lazy()).then(
    (module) => {
      const merged = mergeModule(route, module);
      resolved.set(route, merged);
      inflight.delete(route);
      return merged;
    },
    (error) => {
      // Do not cache failures: a retry (e.g. a later navigation) re-imports.
      inflight.delete(route);
      throw error instanceof Error ? error : new Error(String(error));
    },
  );
  inflight.set(route, promise);
  return promise;
}

/** The lazy module merged into the route, or `{}` if it has not resolved yet. */
function effectiveModule(route: Route): RouteModule {
  return resolved.get(route) ?? {};
}

/**
 * Builds the merged view of a resolved route: eager fields override the lazy
 * module so eager always wins on conflict.
 */
function mergeModule(route: Route, module: RouteModule): RouteModule {
  const merged: RouteModule = {};
  for (const key of MODULE_KEYS) {
    const eager = route[key as keyof Route];
    const lazy = module[key];
    // Eager wins; fall back to the lazy module when the route omits the field.
    (merged as Record<string, unknown>)[key] =
      eager !== undefined ? eager : lazy;
  }
  return merged;
}

// Effective-field accessors. Each prefers the eager field on the route and
// falls back to the resolved lazy module, matching `mergeModule`'s precedence.

export function routePage(route: Route): PageBlock | undefined {
  return (route.page ?? effectiveModule(route).page) as PageBlock | undefined;
}

export function routeLayout(route: Route): LayoutBlock | undefined {
  return (route.layout ?? effectiveModule(route).layout) as
    | LayoutBlock
    | undefined;
}

export function routeLoading(route: Route): LoadingBlock | undefined {
  return route.loading ?? effectiveModule(route).loading;
}

export function routeError(route: Route): ErrorBlock | undefined {
  return route.error ?? effectiveModule(route).error;
}

export function routeNotFound(route: Route) {
  return route.notFound ?? effectiveModule(route).notFound;
}

export function routeMetadata(route: Route): MetadataValue | undefined {
  return route.metadata ?? effectiveModule(route).metadata;
}

export function routeLoader(route: Route): Loader | undefined {
  return (route.loader ?? effectiveModule(route).loader) as Loader | undefined;
}

export function routeMiddleware(route: Route): Middleware[] | undefined {
  return route.middleware ?? effectiveModule(route).middleware;
}

/**
 * Test-only: forgets every cached lazy resolution so a fresh import runs again.
 * Used by the test suite to assert single-resolution and retry-after-failure.
 */
export function __resetLazyCache(routes: Route[]): void {
  const walk = (list: Route[]) => {
    for (const route of list) {
      resolved.delete(route);
      inflight.delete(route);
      if (route.children) walk(route.children);
      if (route.slots) {
        for (const name of Object.keys(route.slots)) walk(route.slots[name]);
      }
    }
  };
  walk(routes);
}
