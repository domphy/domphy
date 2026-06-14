import type { PartialElement } from "@domphy/core";
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
  const router = () => props.router ?? getRouter();

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
      if (
        new URL(anchor.href, window.location.href).origin !==
        window.location.origin
      )
        return;
      mouseEvent.preventDefault();
      void router().navigate(href, { replace, scroll });
    },
    onMouseEnter: () => {
      if (prefetch === "hover") prefetchOnce();
    },
    onFocus: () => {
      if (prefetch === "hover") prefetchOnce();
    },
    _onMount: (node) => {
      if (prefetch !== "visible") return;
      if (typeof IntersectionObserver === "undefined") {
        prefetchOnce();
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prefetchOnce();
          observer.disconnect();
        }
      });
      observer.observe(node.domElement as Element);
      node.setMetadata("navLinkObserver", observer);
    },
    _onRemove: (node) => {
      const observer = node.getMetadata("navLinkObserver") as
        | IntersectionObserver
        | undefined;
      observer?.disconnect();
    },
  };
}
