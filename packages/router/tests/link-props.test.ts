// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  linkProps,
} from "../src/index";

function createTestRouter() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
  });
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute, postRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
}

function dispatchClick(
  anchor: HTMLAnchorElement,
  handler: (event: MouseEvent) => void,
  init: MouseEventInit = {},
) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  anchor.addEventListener("click", (e) => handler(e as MouseEvent));
  anchor.dispatchEvent(event);
  return event;
}

describe("linkProps", () => {
  // Truth source: @tanstack/react-router@1.170.38 src/link.tsx `handleClick`
  // intercepts only when `!isCtrlEvent(e) && !e.defaultPrevented &&
  // (!effectiveTarget || effectiveTarget === '_self') && e.button === 0`.
  it.each([
    ["ctrlKey", { ctrlKey: true }],
    ["metaKey", { metaKey: true }],
    ["shiftKey", { shiftKey: true }],
    ["altKey", { altKey: true }],
    ["non-primary button", { button: 1 }],
  ])(
    "leaves the click to the browser for %s (upstream useLinkProps handleClick guard)",
    (_label, init) => {
      const router = createTestRouter();
      const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined);
      const props = linkProps(router, { to: "/posts/$postId", params: { postId: "1" } });

      const anchor = document.createElement("a");
      const event = dispatchClick(anchor, props.onClick!, init);

      expect(event.defaultPrevented).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it("leaves the click to the browser when the anchor targets another browsing context (upstream effectiveTarget guard)", () => {
    const router = createTestRouter();
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined);
    const props = linkProps(router, { to: "/posts/$postId", params: { postId: "1" } });

    const anchor = document.createElement("a");
    anchor.setAttribute("target", "_blank");
    const event = dispatchClick(anchor, props.onClick!);

    expect(event.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("intercepts a plain primary click and navigates client-side", () => {
    const router = createTestRouter();
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined);
    const props = linkProps(router, { to: "/posts/$postId", params: { postId: "1" } });

    const anchor = document.createElement("a");
    const event = dispatchClick(anchor, props.onClick!);

    expect(event.defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/posts/$postId", params: { postId: "1" } }),
    );
  });

  it("emits the real resolved href so the anchor stays crawlable and copyable", () => {
    const router = createTestRouter();
    const props = linkProps(router, { to: "/posts/$postId", params: { postId: "42" } });
    expect(props.href).toBe("/posts/42");
  });

  it("shows the masked href while navigating to the real destination (upstream getHrefOption uses maskedLocation.publicHref)", () => {
    const router = createTestRouter();
    const props = linkProps(router, {
      to: "/posts/$postId",
      params: { postId: "42" },
      mask: { to: "/posts/$postId", params: { postId: "masked" } },
    });
    expect(props.href).toBe("/posts/masked");
  });

  // Truth source: upstream `resolveExternalLink` — a `to` whose `getUrlScheme`
  // is in the allowlist is returned verbatim and the external return path
  // attaches no click handler, so the browser navigates. `http://[` is the
  // case that separates upstream's scheme-prefix parser from a `new URL()`
  // probe: the URL constructor throws on it, but it is still an http link.
  it.each(["https://example.com/x", "mailto:a@b.c", "http://["])(
    "renders %s as a native external link with no click interception",
    (to) => {
      const router = createTestRouter();
      const props = linkProps(router, { to } as never);
      expect(props.href).toBe(to);
      expect(props.onClick).toBeUndefined();
    },
  );

  // Truth source: upstream `resolveExternalLink` returns null for a protocol
  // outside `router.protocolAllowlist` (default http/https/mailto/tel), which
  // makes `linkDisabled` true, so `applyLinkState` renders the anchor with no
  // href and the disabled props (`role="link"` + `aria-disabled`).
  it("renders an inert role=link anchor for a to outside the protocol allowlist", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const router = createTestRouter();
    const props = linkProps(router, { to: "javascript:alert(1)" } as never);
    expect(props.href).toBeUndefined();
    expect(props.onClick).toBeUndefined();
    expect(props.role).toBe("link");
    expect(props.ariaDisabled).toBe(true);
    warn.mockRestore();
  });

  // Truth source: upstream `getHrefOption` returns undefined when disabled,
  // `handleClick` is gated on `!disabled`, and STATIC_DISABLED_PROPS adds
  // `role="link"` + `aria-disabled`.
  it("renders an inert role=link anchor when disabled", () => {
    const router = createTestRouter();
    const props = linkProps(router, {
      to: "/posts/$postId",
      params: { postId: "1" },
      disabled: true,
    });
    expect(props.href).toBeUndefined();
    expect(props.onClick).toBeUndefined();
    expect(props.role).toBe("link");
    expect(props.ariaDisabled).toBe(true);
  });

  // Truth source: upstream `effectiveTarget = target !== undefined ? target : elementTarget`.
  it("prefers the passed target over the element attribute", () => {
    const router = createTestRouter();
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined);
    const props = linkProps(router, {
      to: "/posts/$postId",
      params: { postId: "1" },
      target: "_blank",
    });

    const anchor = document.createElement("a");
    anchor.setAttribute("target", "_self");
    const event = dispatchClick(anchor, props.onClick!);

    expect(props.target).toBe("_blank");
    expect(event.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
