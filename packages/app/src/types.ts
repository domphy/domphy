import type { DomphyElement } from "@domphy/core";
import type { Metadata } from "./metadata.js";

/** Route params. Dynamic segments map to strings, catch-all segments to string arrays. */
export type Params = Record<string, string | string[]>;

/** Shared context given to pages, layouts, loaders, metadata functions and middleware. */
export interface RouteContext<TData = unknown> {
  /** Pathname actually rendered (after middleware rewrites). */
  pathname: string;
  /** Pathname shown in the address bar (before rewrites). */
  url: string;
  params: Params;
  searchParams: URLSearchParams;
  hash: string;
  /** Resolved loader data of the owning segment. */
  data: TData;
  /** Resolved loader data of every matched segment, keyed by segment id. */
  segmentData: Record<string, unknown>;
  /** Request headers, only present during server rendering. */
  headers?: Headers;
}

export type PageBlock<TData = unknown> = (
  context: RouteContext<TData>,
) => DomphyElement;

export type LayoutBlock<TData = unknown> = (
  children: DomphyElement,
  context: RouteContext<TData>,
  /** Rendered parallel-route slots declared on this segment, keyed by slot name. */
  slots: Record<string, DomphyElement>,
) => DomphyElement;

export type LoadingBlock = (context: RouteContext) => DomphyElement;

export type ErrorBlock = (error: Error, retry: () => void) => DomphyElement;

export type NotFoundBlock = () => DomphyElement;

export interface LoaderContext {
  pathname: string;
  url: string;
  params: Params;
  searchParams: URLSearchParams;
  headers?: Headers;
}

export type Loader<TData = unknown> = (
  context: LoaderContext,
) => TData | Promise<TData>;

export type MetadataValue =
  | Metadata
  | ((context: LoaderContext) => Metadata | Promise<Metadata>);

export interface MiddlewareContext {
  url: URL;
  pathname: string;
  searchParams: URLSearchParams;
  headers?: Headers;
}

/** A rewrite instruction returned from middleware. Create with `rewrite()`. */
export interface RewriteResult {
  __domphyRewrite: string;
}

/**
 * Middleware runs before every navigation and server render.
 * Return `rewrite(path)` to render another route under the same URL,
 * call `redirect(path)` / `notFound()` to interrupt, or return nothing to continue.
 */
export type Middleware = (
  context: MiddlewareContext,
) =>
  | RewriteResult
  | undefined
  | void
  | Promise<RewriteResult | undefined | void>;

/**
 * One route segment, the equivalent of one folder in the Next.js `app` directory.
 *
 * `path` uses Next.js conventions:
 * - `"about"` static segment (may contain several parts: `"docs/getting-started"`)
 * - `"[slug]"` dynamic segment
 * - `"[...slug]"` catch-all segment
 * - `"[[...slug]]"` optional catch-all segment
 * - `"(marketing)"` route group, organizes the tree without affecting the URL
 *
 * A segment is routable when it declares `page` or `redirect`.
 */
export interface Route {
  path: string;
  page?: PageBlock<any>;
  layout?: LayoutBlock<any>;
  loading?: LoadingBlock;
  error?: ErrorBlock;
  notFound?: NotFoundBlock;
  metadata?: MetadataValue;
  loader?: Loader<any>;
  /**
   * Loader cache lifetime in seconds, the equivalent of Next.js `revalidate`.
   * `undefined` re-runs the loader on every navigation, `Infinity` caches forever.
   */
  revalidate?: number;
  middleware?: Middleware[];
  /** Static redirect: navigating to this route immediately redirects to the target. */
  redirect?: string;
  /** Use a 308 redirect on the server when `redirect` is set. */
  permanent?: boolean;
  children?: Route[];
  /**
   * Parallel routes (Next.js `@slot` folders). Each slot is an independent route
   * tree matched against the path *below* this segment; the rendered element of
   * each is passed to `layout`'s third argument. A slot route with `intercept`
   * set captures a matching URL during client navigation (intercepting routes).
   */
  slots?: Record<string, Route[]>;
  /**
   * Intercepting route marker (Next.js `(.)`, `(..)`, `(...)`). When set, this
   * slot route only matches during client-side (soft) navigation, letting it
   * render an interception (e.g. a modal) over the previous page; a hard load of
   * the same URL renders the real route instead.
   */
  intercept?: boolean;
}

export type RouterStatus = "idle" | "loading" | "error" | "notfound";

export interface RouterStateRecord {
  pathname: string;
  search: string;
  hash: string;
  params: Params;
  status: RouterStatus;
  error: Error | null;

  [key: string]: unknown;
}

export interface NavigateOptions {
  replace?: boolean;
  /** Scroll to the top (or the URL hash) after navigation. Defaults to true. */
  scroll?: boolean;
}

export type RouterEventName =
  | "routeChangeStart"
  | "routeChangeComplete"
  | "routeChangeError";

/** Identity helper that keeps route literals fully typed. */
export function defineRoutes(routes: Route[]): Route[] {
  return routes;
}
