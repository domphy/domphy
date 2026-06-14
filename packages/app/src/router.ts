import {
  type DomphyElement,
  Notifier,
  RecordState,
  type State,
  toState,
} from "@domphy/core";
import { DataCache } from "./dataCache.js";
import { createBrowserHistory, type HistoryAdapter } from "./history.js";
import {
  type CompiledRoute,
  compileRoutes,
  matchRoute,
  type RouteMatch,
} from "./matcher.js";
import {
  applyHeadTags,
  metadataToHeadTags,
  type ResolvedMetadata,
  resolveMetadata,
} from "./metadata.js";
import { isRewrite, NotFoundSignal, RedirectSignal } from "./navigation.js";
import {
  buildNotFoundTree,
  buildTree,
  defaultErrorBlock,
  defaultNotFoundBlock,
  type SegmentResult,
} from "./tree.js";
import type {
  ErrorBlock,
  LoaderContext,
  Middleware,
  NavigateOptions,
  NotFoundBlock,
  Route,
  RouterEventName,
  RouterStateRecord,
} from "./types.js";

export interface RouterOptions {
  /** Defaults to the browser history in a DOM environment, otherwise none (SSR). */
  history?: HistoryAdapter | null;
  /** Global middleware, the equivalent of `middleware.ts`. */
  middleware?: Middleware[];
  /** App-level not-found block, the equivalent of the root `not-found.tsx`. */
  notFound?: NotFoundBlock;
  /** App-level error block, the equivalent of `global-error.tsx`. */
  error?: ErrorBlock;
  /** Request headers, forwarded to loaders and middleware during server rendering. */
  headers?: Headers;
}

interface TransitionOptions {
  replace?: boolean;
  scroll?: boolean;
  fromHistory?: boolean;
  initial?: boolean;
}

let defaultRouter: AppRouter | null = null;

/** The most recently created router, used by `navLink` when no router is passed explicitly. */
export function getRouter(): AppRouter {
  if (!defaultRouter) {
    throw new Error(
      "No router created yet. Call createApp() or new AppRouter() first.",
    );
  }
  return defaultRouter;
}

export class AppRouter {
  readonly routes: CompiledRoute[];
  readonly state: RecordState<RouterStateRecord>;
  readonly tree: State<DomphyElement>;
  readonly events = new Notifier();
  readonly cache = new DataCache();

  private history: HistoryAdapter | null;
  private middleware: Middleware[];
  private notFoundBlock: NotFoundBlock;
  private errorBlock: ErrorBlock;
  private headers?: Headers;
  private navigationToken = 0;
  private releaseHistory: (() => void) | null = null;
  private currentMatch: RouteMatch | null = null;
  /** Metadata resolved for the current route, exposed for server rendering. */
  metadata: ResolvedMetadata = {};
  /** The last redirect followed during a transition, exposed for server rendering. */
  lastRedirect: { to: string; permanent: boolean } | null = null;
  /** Loader data of the latest render keyed by cache key, used for SSR payloads. */
  lastData: Record<string, unknown> = {};

  constructor(routes: Route[], options: RouterOptions = {}) {
    this.routes = compileRoutes(routes);
    this.middleware = options.middleware ?? [];
    this.notFoundBlock = options.notFound ?? defaultNotFoundBlock;
    this.errorBlock = options.error ?? ((error) => defaultErrorBlock(error));
    this.headers = options.headers;
    this.history =
      options.history !== undefined
        ? options.history
        : typeof window !== "undefined"
          ? createBrowserHistory()
          : null;

    this.state = new RecordState<RouterStateRecord>({
      pathname: "/",
      search: "",
      hash: "",
      params: {},
      status: "idle",
      error: null,
    });
    this.tree = toState<DomphyElement>({ div: "" });
    defaultRouter = this;
  }

  /** Renders the current URL and starts listening to history navigation. */
  async start(): Promise<void> {
    if (this.history && !this.releaseHistory) {
      this.releaseHistory = this.history.listen((url) => {
        void this.transition(url, { fromHistory: true });
      });
    }
    const url = this.history
      ? this.history.url()
      : new URL("/", "http://localhost");
    await this.transition(url, { initial: true });
  }

  destroy(): void {
    this.releaseHistory?.();
    this.releaseHistory = null;
    if (defaultRouter === this) defaultRouter = null;
  }

  currentUrl(): URL {
    if (this.history) return this.history.url();
    const search = this.state.get("search");
    return new URL(
      `${this.state.get("pathname")}${search}`,
      "http://localhost",
    );
  }

  resolve(href: string): URL {
    return new URL(href, this.currentUrl());
  }

  async navigate(href: string, options: NavigateOptions = {}): Promise<void> {
    const url = this.resolve(href);
    if (
      typeof window !== "undefined" &&
      url.origin !== this.currentUrl().origin
    ) {
      window.location.assign(url.href);
      return;
    }
    await this.transition(url, options);
  }

  push(
    href: string,
    options: Omit<NavigateOptions, "replace"> = {},
  ): Promise<void> {
    return this.navigate(href, options);
  }

  replace(
    href: string,
    options: Omit<NavigateOptions, "replace"> = {},
  ): Promise<void> {
    return this.navigate(href, { ...options, replace: true });
  }

  back(): void {
    this.history?.go(-1);
  }

  forward(): void {
    this.history?.go(1);
  }

  /** Clears the loader cache and re-renders the current URL, like `router.refresh()`. */
  async refresh(): Promise<void> {
    this.cache.invalidate();
    await this.transition(this.currentUrl(), { replace: true, scroll: false });
  }

  /** Runs the loaders of a route ahead of navigation, like `router.prefetch()`. */
  async prefetch(href: string): Promise<void> {
    try {
      const url = this.resolve(href);
      const match = matchRoute(this.routes, url.pathname);
      if (!match) return;
      const context = this.loaderContext(url, match);
      await Promise.all(
        match.route.chain.map((route, index) => {
          if (!route.loader) return Promise.resolve();
          const key = this.cacheKey(match.route.chainIds[index], url);
          return this.cache.prefetch(
            key,
            route.loader,
            context,
            route.revalidate,
          );
        }),
      );
    } catch {
      // Prefetch failures are silent; the real navigation reports errors.
    }
  }

  searchParams(
    listener?: Parameters<RecordState<RouterStateRecord>["get"]>[1],
  ): URLSearchParams {
    return new URLSearchParams(this.state.get("search", listener) as string);
  }

  addEventListener(
    event: RouterEventName,
    callback: (...args: unknown[]) => void,
  ): () => void {
    return this.events.addListener(event, callback);
  }

  /** The match rendered by the latest completed transition, null when no route matched. */
  getMatch(): RouteMatch | null {
    return this.currentMatch;
  }

  private cacheKey(segmentId: string, url: URL): string {
    return `${segmentId}|${url.pathname}${url.search}`;
  }

  private loaderContext(url: URL, match: RouteMatch): LoaderContext {
    return {
      pathname: match.pathname,
      url: url.pathname + url.search,
      params: match.params,
      searchParams: url.searchParams,
      headers: this.headers,
    };
  }

  /** Core navigation pipeline: middleware -> match -> loaders -> tree -> history/scroll. */
  async transition(url: URL, options: TransitionOptions = {}): Promise<void> {
    const token = ++this.navigationToken;
    const href = url.pathname + url.search + url.hash;
    if (!options.fromHistory) this.lastRedirect = null;
    this.events.notify("routeChangeStart", href);
    this.saveScroll();

    try {
      let renderPathname = url.pathname;
      const middlewareContext = {
        url,
        pathname: url.pathname,
        searchParams: url.searchParams,
        headers: this.headers,
      };
      for (const middleware of this.middleware) {
        const result = await middleware(middlewareContext);
        if (isRewrite(result)) renderPathname = result.__domphyRewrite;
      }
      if (token !== this.navigationToken) return;

      const match = matchRoute(this.routes, renderPathname);

      if (match) {
        const leaf = match.route.chain[match.route.chain.length - 1];
        if (leaf.redirect) {
          throw new RedirectSignal(leaf.redirect, leaf.permanent ?? false);
        }
        for (const route of match.route.chain) {
          for (const middleware of route.middleware ?? []) {
            const result = await middleware(middlewareContext);
            if (isRewrite(result)) {
              await this.transition(
                new URL(result.__domphyRewrite, url),
                options,
              );
              return;
            }
          }
        }
        if (token !== this.navigationToken) return;
        await this.renderMatch(url, match, token, options);
      } else {
        await this.renderNotFound(url, token, options);
      }
    } catch (error) {
      if (token !== this.navigationToken) return;
      if (error instanceof RedirectSignal) {
        await this.transition(this.resolve(error.to), {
          ...options,
          replace: true,
        });
        // Set after the inner transition so its entry reset does not erase this.
        this.lastRedirect = { to: error.to, permanent: error.permanent };
        return;
      }
      if (error instanceof NotFoundSignal) {
        await this.renderNotFound(url, token, options);
        return;
      }
      const failure = error instanceof Error ? error : new Error(String(error));
      this.tree.set(this.errorBlock(failure, () => void this.refresh()));
      this.state.set("status", "error");
      this.state.set("error", failure);
      this.events.notify("routeChangeError", failure, href);
      return;
    }

    if (token === this.navigationToken) {
      this.events.notify("routeChangeComplete", href);
    }
  }

  private async renderMatch(
    url: URL,
    match: RouteMatch,
    token: number,
    options: TransitionOptions,
  ): Promise<void> {
    const { chain, chainIds } = match.route;
    const context = this.loaderContext(url, match);
    const results: SegmentResult[] = chain.map(() => ({ status: "pending" }));
    let redirectSignal: RedirectSignal | null = null;

    const promises = chain.map((route, index) => {
      if (!route.loader) {
        results[index] = { status: "success", data: undefined };
        return Promise.resolve();
      }
      const key = this.cacheKey(chainIds[index], url);
      return this.cache.load(key, route.loader, context, route.revalidate).then(
        (data) => {
          results[index] = { status: "success", data };
        },
        (error) => {
          if (error instanceof RedirectSignal) {
            redirectSignal = redirectSignal ?? error;
          } else if (error instanceof NotFoundSignal) {
            results[index] = { status: "notfound" };
          } else {
            results[index] = {
              status: "error",
              error: error instanceof Error ? error : new Error(String(error)),
            };
          }
        },
      );
    });

    let settled = false;
    const allSettled = Promise.all(promises).then(() => {
      settled = true;
    });

    // Give already-resolved (cached) loaders a chance to finish before showing loading UI.
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!settled && chain.some((route) => route.loading)) {
      const interim = buildTree({
        match,
        baseContext: this.baseContext(url, match),
        results: results.map((result) => ({ ...result })),
        retry: () => void this.refresh(),
        defaultError: this.errorBlock,
        defaultNotFound: this.notFoundBlock,
      });
      if (token === this.navigationToken && interim.status === "loading") {
        this.state.set("status", "loading");
        this.tree.set(interim.element);
      }
    }

    await allSettled;
    if (token !== this.navigationToken) return;
    if (redirectSignal) throw redirectSignal;

    const built = buildTree({
      match,
      baseContext: this.baseContext(url, match),
      results,
      retry: () => void this.refresh(),
      defaultError: this.errorBlock,
      defaultNotFound: this.notFoundBlock,
    });

    const dataRecord: Record<string, unknown> = {};
    chain.forEach((route, index) => {
      if (route.loader && results[index].status === "success") {
        dataRecord[this.cacheKey(chainIds[index], url)] = results[index].data;
      }
    });
    this.lastData = dataRecord;

    this.currentMatch = match;
    await this.applyMetadata(match, context);
    if (token !== this.navigationToken) return;

    this.commit(url, match, built.element, built.status, options);
  }

  private async renderNotFound(
    url: URL,
    token: number,
    options: TransitionOptions,
  ): Promise<void> {
    const built = buildNotFoundTree(this.notFoundBlock);
    this.currentMatch = null;
    this.metadata = {};
    applyHeadTags([]);
    if (token !== this.navigationToken) return;
    this.commit(url, null, built.element, "notfound", options);
  }

  private baseContext(url: URL, match: RouteMatch) {
    return {
      pathname: match.pathname,
      url: url.pathname + url.search,
      params: match.params,
      searchParams: url.searchParams,
      hash: url.hash,
      headers: this.headers,
    };
  }

  private async applyMetadata(
    match: RouteMatch,
    context: LoaderContext,
  ): Promise<void> {
    try {
      this.metadata = await resolveMetadata(
        match.route.chain.map((route) => route.metadata),
        context,
      );
    } catch {
      this.metadata = {};
    }
    applyHeadTags(metadataToHeadTags(this.metadata));
  }

  private commit(
    url: URL,
    match: RouteMatch | null,
    element: DomphyElement,
    status: RouterStateRecord["status"],
    options: TransitionOptions,
  ): void {
    if (this.history && !options.fromHistory && !options.initial) {
      const href = url.pathname + url.search + url.hash;
      if (options.replace) {
        this.history.replace(href);
      } else {
        this.history.push(href);
      }
    }

    this.state.set("pathname", url.pathname);
    this.state.set("search", url.search);
    this.state.set("hash", url.hash);
    this.state.set("params", match?.params ?? {});
    this.state.set("error", null);
    this.state.set("status", status);
    this.tree.set(element);

    this.restoreScroll(url, options);
  }

  private saveScroll(): void {
    if (typeof window === "undefined") return;
    this.history?.saveScroll?.({ x: window.scrollX, y: window.scrollY });
  }

  private restoreScroll(url: URL, options: TransitionOptions): void {
    if (
      typeof window === "undefined" ||
      options.scroll === false ||
      options.initial
    )
      return;
    if (options.fromHistory) {
      const position = this.history?.readScroll?.();
      window.scrollTo(position?.x ?? 0, position?.y ?? 0);
      return;
    }
    if (url.hash) {
      const target = document.getElementById(url.hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }
}
