import { type DomphyElement, ElementNode } from "@domphy/core";
import type { HistoryAdapter } from "./history.js";
import { metadataToHeadTags, renderHeadTags } from "./metadata.js";
import { AppRouter, type RouterOptions } from "./router.js";
import type { Route } from "./types.js";

export interface AppOptions extends Omit<RouterOptions, "history" | "headers"> {
  history?: HistoryAdapter | null;
}

export interface RenderToStringOptions {
  headers?: Headers;
}

export interface SSRResult {
  /** Body markup of the app root, ready to place inside the mount element. */
  html: string;
  /** Scoped CSS of the rendered tree, place inside `<style id="domphy-style">`. */
  css: string;
  /** Serialized `<title>`, `<meta>` and `<link>` tags for the document head. */
  head: string;
  /** 200, 404, or the redirect status. */
  status: number;
  /** Set when a loader or middleware redirected. */
  redirect?: string;
  /** Loader data to embed for hydration, see `bootstrapScript`. */
  data: Record<string, unknown>;
  /** Inline script that exposes loader data to `hydrate()` on the client. */
  bootstrapScript: string;
}

const HYDRATION_GLOBAL = "__DOMPHY_APP_DATA__";

/**
 * The app shell: routing, rendering and server rendering in one object, the
 * Domphy equivalent of a Next.js application instance.
 */
export class DomphyApp {
  readonly routes: Route[];
  readonly options: AppOptions;
  readonly router: AppRouter;
  private node: ElementNode | null = null;

  constructor(routes: Route[], options: AppOptions = {}) {
    this.routes = routes;
    this.options = options;
    this.router = new AppRouter(routes, options);
  }

  /** The root element; the whole route tree re-renders through one reactive child. */
  element(): DomphyElement {
    const router = this.router;
    return {
      div: (listener) => [router.tree.get(listener)],
      style: { display: "contents" },
    };
  }

  /** Client-side render from scratch. */
  async render(target: HTMLElement): Promise<ElementNode> {
    await this.router.start();
    this.node = new ElementNode(this.element());
    this.node.render(target);
    return this.node;
  }

  /**
   * Hydrates server-rendered markup. Reads the loader data embedded by
   * `bootstrapScript` so loaders are not re-run and the tree matches the HTML.
   */
  async hydrate(
    target: HTMLElement,
    style?: HTMLStyleElement,
  ): Promise<ElementNode> {
    const seeded = (globalThis as Record<string, unknown>)[HYDRATION_GLOBAL];
    if (seeded && typeof seeded === "object") {
      this.router.cache.seed(seeded as Record<string, unknown>);
    }
    await this.router.start();
    this.node = new ElementNode(this.element());
    this.node.mount(target, style);
    return this.node;
  }

  destroy(): void {
    this.node?.remove();
    this.node = null;
    this.router.destroy();
  }

  /** Server rendering: runs middleware and loaders for `url`, returns markup + CSS + head. */
  async renderToString(
    url: string | URL,
    options: RenderToStringOptions = {},
  ): Promise<SSRResult> {
    const requestUrl =
      typeof url === "string" ? new URL(url, "http://localhost") : url;
    const serverRouter = new AppRouter(this.routes, {
      ...this.options,
      history: null,
      headers: options.headers,
    });

    await serverRouter.transition(requestUrl, { initial: true });

    const status = serverRouter.state.get("status");
    const redirect = serverRouter.lastRedirect;
    const node = new ElementNode({
      div: [serverRouter.tree.get()],
      style: { display: "contents" },
    });

    const data = serverRouter.lastData;

    const result: SSRResult = {
      html: node.generateHTML(),
      css: node.generateCSS(),
      head: renderHeadTags(metadataToHeadTags(serverRouter.metadata)),
      status: redirect
        ? redirect.permanent
          ? 308
          : 307
        : status === "notfound"
          ? 404
          : 200,
      redirect: redirect?.to,
      data,
      bootstrapScript: `<script>window.${HYDRATION_GLOBAL} = ${serializeData(data)};</script>`,
    };
    serverRouter.destroy();
    return result;
  }
}

/** JSON with `</script>`-safe escaping so the payload can be inlined. */
function serializeData(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function createApp(routes: Route[], options: AppOptions = {}): DomphyApp {
  return new DomphyApp(routes, options);
}
