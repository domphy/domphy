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
  matchRouteSuffix,
  type RouteMatch,
  urlPartCount,
} from "./matcher.js";
import {
  applyHeadTags,
  metadataToHeadTags,
  renderHeadTags,
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
  /** Cache keys backing the current render, used to drive stale-while-revalidate re-renders. */
  private currentRenderKeys = new Set<string>();
  /** Per-route compiled parallel-route slots: hard (no interception) and soft (with). */
  private slotCompiled = new Map<
    Route,
    Record<string, { soft: CompiledRoute[]; hard: CompiledRoute[] }>
  >();
  /** Metadata resolved for the current route, exposed for server rendering. */
  metadata: ResolvedMetadata = {};
  /** The last redirect followed during a transition, exposed for server rendering. */
  lastRedirect: { to: string; permanent: boolean } | null = null;
  /** Loader data of the latest render keyed by cache key, used for SSR payloads. */
  lastData: Record<string, unknown> = {};

  constructor(routes: Route[], options: RouterOptions = {}) {
    this.routes = compileRoutes(routes);
    this.compileSlots(routes);
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
    // Stale-while-revalidate: when a displayed loader entry refreshes in the
    // background, re-render the current route so the fresh data appears.
    this.cache.onRevalidated((key) => this.onRevalidated(key));
    defaultRouter = this;
  }

  /** Precompiles parallel-route slots for every segment (recursively). */
  private compileSlots(routes: Route[]): void {
    for (const route of routes) {
      if (route.slots) {
        const entry: Record<
          string,
          { soft: CompiledRoute[]; hard: CompiledRoute[] }
        > = {};
        for (const name of Object.keys(route.slots)) {
          const slotRoutes = route.slots[name];
          entry[name] = {
            soft: compileRoutes(slotRoutes),
            hard: compileRoutes(slotRoutes.filter((route) => !route.intercept)),
          };
          this.compileSlots(slotRoutes);
        }
        this.slotCompiled.set(route, entry);
      }
      if (route.children) this.compileSlots(route.children);
    }
  }

  /** Runs a match's loaders and returns one result per chain segment (no loading UI). */
  private async loadMatch(
    match: RouteMatch,
    url: URL,
  ): Promise<SegmentResult[]> {
    const { chain, chainIds } = match.route;
    const context = this.loaderContext(url, match);
    const results: SegmentResult[] = chain.map(() => ({ status: "pending" }));
    await Promise.all(
      chain.map((route, index) => {
        if (!route.loader) {
          results[index] = { status: "success", data: undefined };
          return Promise.resolve();
        }
        const key = this.cacheKey(chainIds[index], url);
        return this.cache
          .load(key, route.loader, context, route.revalidate)
          .then(
            (data) => {
              results[index] = { status: "success", data };
            },
            (error) => {
              if (error instanceof NotFoundSignal) {
                results[index] = { status: "notfound" };
              } else {
                results[index] = {
                  status: "error",
                  error:
                    error instanceof Error ? error : new Error(String(error)),
                };
              }
            },
          );
      }),
    );
    return results;
  }

  /** Renders the parallel-route slots declared on chain segment `chainIndex`. */
  private async renderSlots(
    chainIndex: number,
    match: RouteMatch,
    url: URL,
    soft: boolean,
  ): Promise<Record<string, DomphyElement>> {
    const route = match.route.chain[chainIndex];
    const compiledSlots = this.slotCompiled.get(route);
    if (!compiledSlots) return {};

    let prefixParts = 0;
    for (let i = 0; i <= chainIndex; i++) {
      prefixParts += urlPartCount(match.route.chain[i].path);
    }

    const slots: Record<string, DomphyElement> = {};
    for (const name of Object.keys(compiledSlots)) {
      const compiled = soft
        ? compiledSlots[name].soft
        : compiledSlots[name].hard;
      const slotMatch = matchRouteSuffix(compiled, url.pathname, prefixParts);
      if (!slotMatch) continue;
      slotMatch.pathname = url.pathname;
      slotMatch.params = { ...match.params, ...slotMatch.params };
      const results = await this.loadMatch(slotMatch, url);
      slots[name] = buildTree({
        match: slotMatch,
        baseContext: this.baseContext(url, slotMatch),
        results,
        retry: () => void this.refresh(),
        defaultError: this.errorBlock,
        defaultNotFound: this.notFoundBlock,
      }).element;
    }
    return slots;
  }

  private onRevalidated(key: string): void {
    // Only on the client and only when the refreshed key backs the current view.
    if (!this.history || !this.currentRenderKeys.has(key)) return;
    void this.transition(this.currentUrl(), {
      replace: true,
      scroll: false,
      fromHistory: true,
    });
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

  /**
   * Two-phase server render for streaming SSR: returns the shell (layouts +
   * loading fallbacks) synchronously, plus a promise for the resolved content,
   * head and loader data once the loaders settle. The caller streams the shell
   * first for a fast TTFB, then the content chunk when `rest` resolves.
   */
  async renderStream(url: URL): Promise<{
    shell: DomphyElement;
    status: number;
    redirect: string | null;
    rest: Promise<{
      content: DomphyElement;
      data: Record<string, unknown>;
      head: string;
    }>;
  }> {
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

    const match = matchRoute(this.routes, renderPathname);
    if (!match) {
      const built = buildNotFoundTree(this.notFoundBlock);
      return {
        shell: built.element,
        status: 404,
        redirect: null,
        rest: Promise.resolve({ content: built.element, data: {}, head: "" }),
      };
    }

    const leaf = match.route.chain[match.route.chain.length - 1];
    if (leaf.redirect) {
      return {
        shell: { div: "" },
        status: leaf.permanent ? 308 : 307,
        redirect: leaf.redirect,
        rest: Promise.resolve({ content: { div: "" }, data: {}, head: "" }),
      };
    }

    const baseContext = this.baseContext(url, match);
    // Only loader-bearing segments are pending in the shell; the rest render now.
    const pending = match.route.chain.map((route) =>
      route.loader
        ? ({ status: "pending" } as SegmentResult)
        : ({ status: "success", data: undefined } as SegmentResult),
    );
    const shell = buildTree({
      match,
      baseContext,
      results: pending,
      retry: () => {},
      defaultError: this.errorBlock,
      defaultNotFound: this.notFoundBlock,
    }).element;

    const rest = (async () => {
      const results = await this.loadMatch(match, url);
      const slots: Record<number, Record<string, DomphyElement>> = {};
      await Promise.all(
        match.route.chain.map(async (route, index) => {
          if (this.slotCompiled.has(route)) {
            slots[index] = await this.renderSlots(index, match, url, false);
          }
        }),
      );
      const content = buildTree({
        match,
        baseContext,
        results,
        retry: () => {},
        defaultError: this.errorBlock,
        defaultNotFound: this.notFoundBlock,
        slots,
      }).element;

      const data: Record<string, unknown> = {};
      match.route.chain.forEach((route, index) => {
        if (route.loader && results[index].status === "success") {
          data[this.cacheKey(match.route.chainIds[index], url)] =
            results[index].data;
        }
      });

      let head = "";
      try {
        const metadata = await resolveMetadata(
          match.route.chain.map((route) => route.metadata),
          this.loaderContext(url, match),
        );
        head = renderHeadTags(metadataToHeadTags(metadata));
      } catch {
        head = "";
      }

      return { content, data, head };
    })();

    return { shell, status: 200, redirect: null, rest };
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

    // Parallel routes: render each segment's slots ((.)intercept routes match
    // only on soft navigation, i.e. not the initial hard load).
    const soft = !options.initial;
    const slots: Record<number, Record<string, DomphyElement>> = {};
    await Promise.all(
      chain.map(async (route, index) => {
        if (this.slotCompiled.has(route)) {
          slots[index] = await this.renderSlots(index, match, url, soft);
        }
      }),
    );
    if (token !== this.navigationToken) return;

    const built = buildTree({
      match,
      baseContext: this.baseContext(url, match),
      results,
      retry: () => void this.refresh(),
      defaultError: this.errorBlock,
      defaultNotFound: this.notFoundBlock,
      slots,
    });

    const dataRecord: Record<string, unknown> = {};
    chain.forEach((route, index) => {
      if (route.loader && results[index].status === "success") {
        dataRecord[this.cacheKey(chainIds[index], url)] = results[index].data;
      }
    });
    this.lastData = dataRecord;
    this.currentRenderKeys = new Set(Object.keys(dataRecord));

    this.currentMatch = match;
    await this.applyMetadata(match, context);
    if (token !== this.navigationToken) return;

    this.commit(url, match, built.element, built.status, options);
    // Kick off stale-while-revalidate refetches now that the route is committed,
    // so onRevalidated re-renders against the current view.
    this.cache.flushRevalidations();
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
