import { type DomphyElement, ElementNode, getConfig } from "@domphy/core";
import type { HistoryAdapter } from "./history.js";
import { metadataToHeadTags, renderHeadTags } from "./metadata.js";
import { RedirectSignal } from "./navigation.js";
import { AppRouter, type RouterOptions } from "./router.js";
import type { Route } from "./types.js";

export interface AppOptions extends Omit<RouterOptions, "history" | "headers"> {
  history?: HistoryAdapter | null;
}

export interface RenderToStringOptions {
  headers?: Headers;
}

export interface RenderToStreamOptions extends RenderToStringOptions {
  /** Extra HTML for `<head>` (viewport, fonts, a CSS link…), sent in the first flush. */
  head?: string;
  /** Markup appended before `</body>`, typically the client bundle `<script>` that calls `hydrate()`. */
  bootstrap?: string;
  /** `lang` attribute of the emitted `<html>`. Defaults to `"en"`. */
  lang?: string;
}

export interface StreamResult {
  /** A web `ReadableStream` of UTF-8 bytes: the shell flushes first, content follows. */
  stream: ReadableStream<Uint8Array>;
  /**
   * HTTP status from decisions made before the shell flushes: middleware and
   * static route `redirect` (307/308), unmatched routes (404), rewrite loops
   * (500), otherwise 200. Loader/metadata `redirect()` cannot change this —
   * the shell is already committed; those redirects stream as a client-side
   * `location.replace` in a later chunk.
   */
  status: number;
  /** Set when middleware or a static route `redirect` fired before the shell. */
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

// Node-id prefix for the shell root a streamed response flushes first (see
// renderToStream). Short because every generated id carries it. The shell is
// always fully replaced by STREAM_SWAP_SCRIPT before hydrate() ever runs (the
// swap script ships in the same chunk as the bootstrap script that calls
// hydrate(), and runs first), so its ids never need to match anything and
// just need to differ textually from the content root's — which is why it is
// the only root pinned to a non-"" prefix.
const SHELL_ID_PREFIX = "s";

/**
 * ` nonce="…"` attribute when `configure({ cspNonce })` is set, else "".
 * Stamped on every Domphy-injected inline `<style>`/`<script>` in SSR and
 * streaming output so a strict Content-Security-Policy admits them. Caller
 * markup (`options.head`, `options.bootstrap`) is the caller's own concern.
 */
function nonceAttr(): string {
  // Base64 alphabet only: a nonce derived per request from an untrusted source
  // must not be able to close the attribute and add its own (e.g. `onload=`).
  const nonce = (getConfig().cspNonce ?? "").replace(/[^A-Za-z0-9+/=_-]/g, "");
  return nonce ? ` nonce="${nonce}"` : "";
}

/** Attribute-safe `<html lang>` value; same reasoning as `nonceAttr`. */
function langAttr(lang: string): string {
  const value = lang.replace(/[^A-Za-z0-9-]/g, "");
  return value ? ` lang="${value}"` : "";
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
    const router = this.router;
    // The same pinned prefix renderToString() used, so the ids this tree
    // computes are the ones already in the server markup however many other
    // roots the page has mounted. Written as a literal rather than spread over
    // element(), which would widen the descriptor union and lose the tag
    // discrimination.
    this.node = new ElementNode({
      div: (listener) => [router.tree.get(listener)],
      _idPrefix: "",
      style: { display: "contents" },
    });
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
    // Node ids come from this root's own counter, so this response's ids do
    // not depend on what else the process is rendering, and `hydrate()` builds
    // one root the same way and computes the same ids.
    // Pinned, and NOT redundant. An unlabelled root is auto-discriminated by
    // how many roots are already live in the document, which is what stops two
    // client-mounted apps from sharing ids — but it means an unlabelled root
    // would take a different prefix on a page that already has one. This pair
    // has to agree with each other above all else, so both ends state the same
    // prefix instead of relying on being first. hydrate() pins the same "".
    const node = new ElementNode({
      div: [serverRouter.tree.get()],
      _idPrefix: "",
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
   * immediately for a fast TTFB — loaders are not awaited before this method
   * returns, so the HTTP server can write the first byte — then streams the
   * resolved content, head and hydration data once loaders settle. The content
   * arrives in `<template>`s that an inline script swaps into place; the
   * client then calls `hydrate`.
   *
   * `status`/`redirect` only reflect pre-shell decisions. A loader
   * `redirect()` after the shell streams as `location.replace` in a later
   * chunk; use `renderToString` when an HTTP redirect from a loader is
   * required.
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
      // graceful result, so only an unexpected failure (a throwing middleware,
      // say) reaches here — before the shell flushed, which means the status
      // can still be 500. renderToString answers the same failure with a 500
      // error page; a streaming host must not have to catch it separately.
      const failure = error instanceof Error ? error : new Error(String(error));
      shell = serverRouter.renderError(failure);
      status = 500;
      redirect = null;
      rest = Promise.resolve({
        content: serverRouter.renderError(failure),
        data: {},
        head: "",
      });
    }

    const encoder = new TextEncoder();
    // The shell and the content are two roots that both number from n0, so
    // without distinct prefixes their ids would collide textually in the
    // response. `_idPrefix` is the case for it — the same thing React asks
    // for with `identifierPrefix` when a page hosts more than one app.
    //
    // The content root is pinned to "" — the SAME prefix renderToString() and
    // hydrate() pin — not SHELL_ID_PREFIX. STREAM_SWAP_SCRIPT fully replaces
    // #domphy-app's children with the content root's markup (`replaceChildren`,
    // not append) before the bootstrap script that calls hydrate() ever runs,
    // so by the time hydrate() reads the DOM, every id in it came from the
    // content root, not the shell. Pinning content to "" makes hydrate()'s
    // freshly-built tree compute the exact same ids as what's already in the
    // DOM — the same guarantee renderToString()/hydrate() give each other.
    // The shell keeps SHELL_ID_PREFIX: nothing ever hydrates against it (it is
    // discarded by the swap), it only has to not collide with the content
    // root's ids while both are momentarily present in the raw response text.
    const shellNode = new ElementNode({
      div: [shell],
      _idPrefix: SHELL_ID_PREFIX,
      style: { display: "contents" },
    });
    const nonce = nonceAttr();
    // The stream is UTF-8 encoded, so the charset is declared unconditionally
    // and first: without it a response served as plain `text/html` is decoded
    // as windows-1252 and every non-ASCII character mojibakes. A caller that
    // also declares one is harmless — the first declaration wins.
    const open =
      `<!DOCTYPE html><html${langAttr(options.lang ?? "en")}><head>` +
      `<meta charset="utf-8">${options.head ?? ""}` +
      `<style id="domphy-style"${nonce}>${shellNode.generateCSS()}</style>` +
      `</head><body><div id="domphy-app">${shellNode.generateHTML()}</div>`;
    const bootstrap = options.bootstrap ?? "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(open));
        try {
          const { content, data, head } = await rest;
          // "" — see the id-prefix comment above shellNode: this is the root
          // hydrate() rebuilds against once the swap script replaces the
          // shell with this markup.
          const contentNode = new ElementNode({
            div: [content],
            _idPrefix: "",
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
          // The shell already flushed, so HTTP status cannot change. A loader
          // redirect becomes a client-side navigation; any other failure swaps
          // the configured error block in so the loading fallback is not left
          // on screen forever.
          if (error instanceof RedirectSignal) {
            const chunk =
              `<script${nonce}>location.replace(${JSON.stringify(error.to)});</script>` +
              `</body></html>`;
            controller.enqueue(encoder.encode(chunk));
            controller.close();
            return;
          }
          const failure =
            error instanceof Error ? error : new Error(String(error));
          const errorNode = new ElementNode({
            div: [serverRouter.renderError(failure)],
            _idPrefix: "",
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
