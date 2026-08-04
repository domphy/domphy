import { type DomphyElement, ElementNode, getConfig } from "@domphy/core";
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

export interface RenderToStreamOptions extends RenderToStringOptions {
  /** Extra HTML for `<head>` (charset, viewport, fonts, a CSS link…), sent in the first flush. */
  head?: string;
  /** Markup appended before `</body>`, typically the client bundle `<script>` that calls `hydrate()`. */
  bootstrap?: string;
}

export interface StreamResult {
  /** A web `ReadableStream` of UTF-8 bytes: the shell flushes first, content follows. */
  stream: ReadableStream<Uint8Array>;
  status: number;
  redirect?: string;
}

/** Swaps the streamed content/head templates into place as soon as they arrive. */
const STREAM_SWAP_SCRIPT =
  "(function(){var h=document.getElementById('domphy-head');" +
  "if(h){document.head.appendChild(h.content.cloneNode(true));h.remove();}" +
  "var c=document.getElementById('domphy-content'),a=document.getElementById('domphy-app');" +
  "if(c&&a){a.replaceChildren(c.content.cloneNode(true));c.remove();}})();";

export interface SSRResult {
  /** Body markup of the app root, ready to place inside the mount element. */
  html: string;
  /** Scoped CSS of the rendered tree, place inside `<style id="domphy-style">`. */
  css: string;
  /** Serialized `<title>`, `<meta>` and `<link>` tags for the document head. */
  head: string;
  /** 200, 404, 500, or the redirect status. */
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
 * ` nonce="…"` attribute when `configure({ cspNonce })` is set, else "".
 * Stamped on every Domphy-injected inline `<style>`/`<script>` in SSR and
 * streaming output so a strict Content-Security-Policy admits them. Caller
 * markup (`options.head`, `options.bootstrap`) is the caller's own concern.
 */
function nonceAttr(): string {
  const nonce = getConfig().cspNonce;
  return nonce ? ` nonce="${nonce}"` : "";
}

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
          : status === "error"
            ? 500
            : 200,
      redirect: redirect?.to,
      data,
      bootstrapScript: `<script${nonceAttr()}>window.${HYDRATION_GLOBAL} = ${serializeData(data)};</script>`,
    };
    serverRouter.destroy();
    return result;
  }

  /**
   * Streaming server render. Flushes the shell (layouts + loading fallbacks)
   * immediately for a fast TTFB, then streams the resolved content, head and
   * hydration data once loaders settle. The content arrives in `<template>`s
   * that an inline script swaps into place; the client then calls `hydrate`.
   */
  async renderToStream(
    url: string | URL,
    options: RenderToStreamOptions = {},
  ): Promise<StreamResult> {
    const requestUrl =
      typeof url === "string" ? new URL(url, "http://localhost") : url;
    const serverRouter = new AppRouter(this.routes, {
      ...this.options,
      history: null,
      headers: options.headers,
    });

    let shell: DomphyElement;
    let status: number;
    let redirect: string | null;
    let rest: Promise<{
      content: DomphyElement;
      data: Record<string, unknown>;
      head: string;
    }>;
    try {
      ({ shell, status, redirect, rest } =
        await serverRouter.renderStream(requestUrl));
    } catch (error) {
      // renderStream() already converts RedirectSignal/NotFoundSignal into a
      // graceful result; only an unexpected error reaches here, so the
      // per-request router still needs releasing before it propagates.
      serverRouter.destroy();
      throw error;
    }

    const encoder = new TextEncoder();
    const shellNode = new ElementNode({
      div: [shell],
      style: { display: "contents" },
    });
    const nonce = nonceAttr();
    const open =
      `<!DOCTYPE html><html><head>${options.head ?? ""}` +
      `<style id="domphy-style"${nonce}>${shellNode.generateCSS()}</style>` +
      `</head><body><div id="domphy-app">${shellNode.generateHTML()}</div>`;
    const bootstrap = options.bootstrap ?? "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(open));
        try {
          const { content, data, head } = await rest;
          const contentNode = new ElementNode({
            div: [content],
            style: { display: "contents" },
          });
          const chunk =
            `<style${nonce}>${contentNode.generateCSS()}</style>` +
            `<template id="domphy-head">${head}</template>` +
            `<template id="domphy-content">${contentNode.generateHTML()}</template>` +
            `<script${nonce}>${STREAM_SWAP_SCRIPT}</script>` +
            `<script${nonce}>window.${HYDRATION_GLOBAL} = ${serializeData(data)};</script>` +
            `${bootstrap}</body></html>`;
          controller.enqueue(encoder.encode(chunk));
          controller.close();
        } catch (error) {
          // The shell already flushed, so the failure cannot become an error
          // status code; stream an error chunk that swaps the configured error
          // block into place instead of leaving the loading fallback forever —
          // the same tree a non-streaming render produces for a thrown error.
          const failure =
            error instanceof Error ? error : new Error(String(error));
          const errorNode = new ElementNode({
            div: [serverRouter.renderError(failure)],
            style: { display: "contents" },
          });
          const chunk =
            `<style${nonce}>${errorNode.generateCSS()}</style>` +
            `<template id="domphy-content">${errorNode.generateHTML()}</template>` +
            `<script${nonce}>${STREAM_SWAP_SCRIPT}</script>` +
            `</body></html>`;
          controller.enqueue(encoder.encode(chunk));
          controller.close();
        } finally {
          serverRouter.destroy();
        }
      },
    });

    return { stream, status, redirect: redirect ?? undefined };
  }
}

/**
 * JSON with script-embedding-safe escaping: `<` (kills `</script>` breakouts)
 * and the U+2028/U+2029 line separators (line terminators inside an inline
 * script's string literals pre-ES2019, escaped by Next.js for the same reason).
 */
function serializeData(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function createApp(
  routes: Route[],
  options: AppOptions = {},
): DomphyApp {
  return new DomphyApp(routes, options);
}
