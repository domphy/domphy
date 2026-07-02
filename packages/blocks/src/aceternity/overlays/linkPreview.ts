// Aceternity UI "Link Preview" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Wraps a
// link label so hovering (or focusing) it pops up a small floating
// thumbnail card previewing the destination page.
//
// Rather than reaching for `@domphy/ui`'s `popover()` primitive, this file
// owns its own tiny floating panel directly, mirroring `directionAwareHover`'s
// "manual DOM refs + inline transitions" idiom: `popover()`'s floating
// content stays permanently mounted and toggles a `visibility` CSS property
// on show/hide, which — unlike `opacity`/`transform` — cannot be
// CSS-transitioned, so it would swallow the spec's fade/scale/translate
// enter-exit entirely. Positioning here is a simple "centered above the
// trigger" absolute offset (no `@domphy/floating` viewport-flip logic,
// which isn't a dependency of this package) — appropriate for a small,
// short-lived preview card, not a full popover.
//
// No hard dependency on a third-party screenshot API (per the spec's
// research note): the preview image is either a caller-supplied static
// `imageSrc`, or resolved once via a caller-supplied `imageResolver(url)`
// (sync or async), or falls back to a generic placeholder graphic.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { link, skeleton } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface LinkPreviewProps {
  /** Destination URL for the wrapped link. Defaults to a generic demo URL. */
  url?: string;
  /** Visible link label content. Defaults to the bare `url`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** Preview card width, in px. Defaults to `200`. */
  width?: number;
  /** Preview card height, in px. Defaults to `125`. */
  height?: number;
  /** When `true`, uses `imageSrc` directly with no async resolution. Defaults to `false`. */
  isStatic?: boolean;
  /** Static preview image override — required when `isStatic` is `true`, optional fallback otherwise. */
  imageSrc?: string;
  /**
   * Async or sync resolver producing a preview image URL for `url`. Called once,
   * lazily, on first hover/focus. Ignored when `isStatic` is `true`.
   */
  imageResolver?: (destinationUrl: string) => string | Promise<string>;
  /** Passthrough style merged onto the outer trigger wrapper. */
  style?: StyleObject;
}

const PLACEHOLDER_PREVIEW_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 125">' +
  '<rect width="200" height="125" fill="#e2e8f0"/>' +
  '<rect x="14" y="14" width="90" height="10" rx="5" fill="#94a3b8"/>' +
  '<rect x="14" y="34" width="150" height="8" rx="4" fill="#cbd5e1"/>' +
  '<rect x="14" y="50" width="120" height="8" rx="4" fill="#cbd5e1"/>' +
  '<circle cx="164" cy="90" r="22" fill="#94a3b8"/>' +
  "</svg>";
const PLACEHOLDER_PREVIEW_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_PREVIEW_MARKUP)}`;

const ENTERED_TRANSFORM = "translate(-50%, 0) scale(1)";
const EXITED_TRANSFORM = "translate(-50%, 6px) scale(0.9)";

let linkPreviewInstanceCounter = 0;

/**
 * Wraps a link label so hovering/focusing it pops up a small floating
 * thumbnail card previewing the destination page. Call with no arguments for
 * a working demo with a generic placeholder preview.
 */
function linkPreview(props: LinkPreviewProps = {}): DomphyElement<"span"> {
  const instanceId = ++linkPreviewInstanceCounter;
  const url = props.url ?? "https://example.com";
  const labelContent: DomphyElement | DomphyElement[] = Array.isArray(props.children)
    ? props.children
    : typeof props.children === "string"
      ? [{ span: props.children } as DomphyElement<"span">]
      : props.children
        ? [props.children]
        : [{ span: url } as DomphyElement<"span">];
  const cardWidth = Math.max(80, props.width ?? 200);
  const cardHeight = Math.max(60, props.height ?? 125);
  const isStatic = props.isStatic ?? false;
  const initialImageSrc = isStatic ? (props.imageSrc ?? PLACEHOLDER_PREVIEW_URI) : (props.imageSrc ?? null);

  const openState = toState(false, `link-preview-open-${instanceId}`);
  const imageSrcState = toState<string | null>(initialImageSrc, `link-preview-src-${instanceId}`);
  const loadingState = toState(!initialImageSrc, `link-preview-loading-${instanceId}`);

  let resolveStarted = false;

  const previewImageLayer: DomphyElement<"img"> = {
    img: null,
    src: (listener: Listener) => imageSrcState.get(listener) ?? PLACEHOLDER_PREVIEW_URI,
    alt: "",
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: (listener: Listener) => (loadingState.get(listener) ? "none" : "block"),
      objectFit: "cover",
    } as StyleObject,
  } as DomphyElement<"img">;

  const previewLoadingLayer: DomphyElement<"div"> = {
    div: null,
    $: [skeleton({ color: "neutral" })],
    style: {
      position: "absolute",
      inset: 0,
      display: (listener: Listener) => (loadingState.get(listener) ? "block" : "none"),
      height: "100%",
      borderRadius: 0,
    } as StyleObject,
  } as DomphyElement<"div">;

  const previewCard: DomphyElement<"div"> = {
    div: [previewImageLayer, previewLoadingLayer],
    role: "presentation",
    dataTone: "shift-17",
    style: {
      position: "absolute",
      insetBlockEnd: `calc(100% + ${themeSpacing(2)})`,
      insetInlineStart: "50%",
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      pointerEvents: "none",
      opacity: 0,
      transform: EXITED_TRANSFORM,
      transformOrigin: "bottom center",
      transition: "opacity 150ms ease-out, transform 150ms ease-out",
      boxShadow: (listener: Listener) => `0 ${themeSpacing(2)} ${themeSpacing(6)} ${themeColor(listener, "shift-4")}`,
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const cardElement = node.domElement as HTMLElement | null;
      if (!cardElement) return;
      const release = openState.addListener((isOpen: boolean) => {
        cardElement.style.opacity = isOpen ? "1" : "0";
        cardElement.style.transform = isOpen ? ENTERED_TRANSFORM : EXITED_TRANSFORM;
      });
      node.setMetadata("linkPreviewOpenRelease", release);
    },
    _onRemove: (node: ElementNode) => {
      const release = node.getMetadata("linkPreviewOpenRelease") as (() => void) | undefined;
      release?.();
    },
  } as DomphyElement<"div">;

  const startResolveIfNeeded = () => {
    if (resolveStarted || isStatic || !props.imageResolver) return;
    resolveStarted = true;
    loadingState.set(true);
    Promise.resolve(props.imageResolver(url))
      .then((resolvedSrc) => {
        imageSrcState.set(resolvedSrc);
        loadingState.set(false);
      })
      .catch(() => {
        imageSrcState.set(PLACEHOLDER_PREVIEW_URI);
        loadingState.set(false);
      });
  };

  const show = () => {
    startResolveIfNeeded();
    openState.set(true);
  };
  const hide = () => openState.set(false);

  const triggerElement: DomphyElement<"a"> = {
    a: labelContent,
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
    $: [link({ color: "primary" })],
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    onKeyDown: (event: Event) => {
      if ((event as KeyboardEvent).key === "Escape") hide();
    },
  } as DomphyElement<"a">;

  return {
    span: [triggerElement, previewCard],
    style: {
      position: "relative",
      display: "inline-block",
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"span">;
}

export { linkPreview };
