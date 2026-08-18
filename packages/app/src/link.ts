import { behavior, type PartialElement } from "@domphy/core";
import { type AppRouter, getRouter } from "./router.js";

export interface NavLinkProps {
  href: string;
  /** Replace the current history entry instead of pushing. */
  replace?: boolean;
  /** Scroll after navigation, defaults to true. */
  scroll?: boolean;
  /**
   * Prefetch strategy, like the `prefetch` prop of `next/link`:
   * `"visible"` when the link enters the viewport, `"hover"` on pointer/focus,
   * `false` never. Defaults to `"hover"`.
   */
  prefetch?: "visible" | "hover" | false;
  /** Mark active only on an exact pathname match, not on descendants. */
  exact?: boolean;
  /** Explicit router; defaults to the app router. */
  router?: AppRouter;
}

function isModifiedClick(event: MouseEvent): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function isHttpProtocol(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

type VisiblePrefetchProps = {
  href: string;
  prefetch: "visible" | "hover" | false;
  run: (href: string) => void;
};

/**
 * Patch for `a` elements, the equivalent of `next/link`: client-side
 * navigation, prefetching and active state (`aria-current` + `data-active`).
 */
export function navLink(props: NavLinkProps): PartialElement<"a"> {
  const {
    href,
    replace = false,
    scroll = true,
    prefetch = "hover",
    exact = false,
  } = props;
  // Capture the router at patch-creation time: when the patch is created by a
  // page/layout factory, the router running that render is on the render stack
  // and is the right one — important for concurrent server renders, where the
  // module-global default router belongs to another request. Fall back to lazy
  // resolution when no router exists yet (patch created before createApp()).
  let captured: AppRouter | null = null;
  try {
    captured = props.router ?? getRouter();
  } catch {
    captured = null;
  }
  const router = () => props.router ?? captured ?? getRouter();

  const isActive = (pathname: string): boolean => {
    const target = new URL(href, "http://localhost").pathname;
    if (exact || target === "/") return pathname === target;
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  let prefetched = false;
  const prefetchOnce = () => {
    if (prefetched) return;
    prefetched = true;
    void router().prefetch(href);
  };

  return {
    href,
    ariaCurrent: (listener) =>
      isActive(router().state.get("pathname", listener) as string)
        ? "page"
        : null,
    dataActive: (listener) =>
      isActive(router().state.get("pathname", listener) as string) ? "" : null,
    onClick: (event) => {
      const mouseEvent = event as MouseEvent;
      const anchor = mouseEvent.currentTarget as HTMLAnchorElement;
      if (isModifiedClick(mouseEvent)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let targetUrl: URL;
      try {
        targetUrl = new URL(anchor.href, window.location.href);
      } catch {
        mouseEvent.preventDefault();
        return;
      }
      // javascript:/data:/etc. parse with origin "null" and would skip the
      // same-origin check below, letting the browser follow the scheme.
      // Block non-http(s) the same way navigate() does.
      if (!isHttpProtocol(targetUrl)) {
        mouseEvent.preventDefault();
        return;
      }
      if (targetUrl.origin !== window.location.origin) return;
      mouseEvent.preventDefault();
      void router().navigate(href, { replace, scroll });
    },
    onMouseEnter: () => {
      if (prefetch === "hover") prefetchOnce();
    },
    onFocus: () => {
      if (prefetch === "hover") prefetchOnce();
    },
    // IntersectionObserver must live in behavior() so a reused node whose
    // href changes (reactive parent) prefetches the new target — _onMount
    // only runs for the first generation.
    ...behavior<VisiblePrefetchProps>(
      "navLinkPrefetch",
      (node, initial) => {
        let props = initial;
        let observer: IntersectionObserver | undefined;
        let prefetchedHref: string | undefined;

        const syncObserver = () => {
          if (props.prefetch !== "visible") {
            observer?.disconnect();
            observer = undefined;
            return;
          }
          if (prefetchedHref === props.href) return;
          if (typeof IntersectionObserver === "undefined") {
            prefetchedHref = props.href;
            props.run(props.href);
            return;
          }
          observer?.disconnect();
          observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              if (prefetchedHref === props.href) return;
              prefetchedHref = props.href;
              props.run(props.href);
              observer?.disconnect();
            }
          });
          observer.observe(node.domElement as Element);
        };

        syncObserver();
        return {
          update(next) {
            props = next;
            syncObserver();
          },
          destroy() {
            observer?.disconnect();
          },
        };
      },
      {
        href,
        prefetch,
        run: (target) => {
          void router().prefetch(target);
        },
      },
    ),
  };
}
