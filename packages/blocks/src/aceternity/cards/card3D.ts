// Aceternity UI "3D Card" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// content card that tilts in 3D perspective toward the cursor and lifts
// its inner elements into separated floating layers on hover.
//
// Two independent transforms compose the effect: the outer wrapper sets a
// CSS `perspective`, and the inner card-body's `rotateX`/`rotateY` is
// written straight to `element.style.transform` on every `pointermove` —
// no easing while hovering, so tracking reads as immediate/1:1, matching
// this package's `magicCard` mouse-tracking idiom (direct style writes,
// not reactive `State`, for a continuous high-frequency pointer signal).
// A `transition` is toggled on only for the `pointerleave` reset, so the
// snap-back to flat is a smooth eased tween while live tracking stays
// snappy. Each "popped" content item then just carries its own *static*
// `translate3d(...)`/`rotate*` — no per-item animation loop — because
// depth separation reads visually the moment the shared parent is tilted.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, link, paragraph, small } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";
import type { ThemeColor } from "@domphy/theme";

export interface Card3DItemDepth {
  /** Horizontal translate, in px. Defaults to `0`. */
  x?: number;
  /** Vertical translate, in px. Defaults to `0`. */
  y?: number;
  /** Translate along the Z axis (the "pop" amount), in px. Defaults to `0`. */
  z?: number;
  /** Rotation around the X axis, in deg. Defaults to `0`. */
  rotateX?: number;
  /** Rotation around the Y axis, in deg. Defaults to `0`. */
  rotateY?: number;
  /** Rotation around the Z axis, in deg. Defaults to `0`. */
  rotateZ?: number;
}

export interface Card3DItemSpec {
  /** The content wrapped by this depth layer. */
  content: DomphyElement;
  /** Depth/rotation this item's layer carries. Defaults to a flat, non-popped layer. */
  depth?: Card3DItemDepth;
}

export interface Card3DProps {
  /** Content layers, each with its own depth/rotation. Defaults to a 4-item demo (heading, paragraph, image, footer). */
  items?: Card3DItemSpec[];
  /** Card surface color family. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Maximum pointer-driven tilt, in deg, at the card's edge. Defaults to `14`. */
  maxRotateDegrees?: number;
  /** CSS `perspective()` distance, in px. Defaults to `900`. */
  perspectiveDistance?: number;
  /** Passthrough style merged onto the outer perspective wrapper. */
  style?: StyleObject;
  /** Passthrough style merged onto the inner card-body surface. */
  bodyStyle?: StyleObject;
}

// Generic abstract placeholder graphic — an inline SVG data URI, no network
// fetch and no real photo (same idiom `pixelImage.ts`/`asciiArt.ts` use for
// their own default demo imagery elsewhere in this package).
const PLACEHOLDER_IMAGE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 170">' +
  '<rect width="300" height="170" fill="#111827"/>' +
  '<circle cx="215" cy="55" r="40" fill="#38bdf8"/>' +
  '<path d="M0 140 L80 80 L140 120 L200 70 L300 130 L300 170 L0 170 Z" fill="#1f2937"/>' +
  "</svg>";
const PLACEHOLDER_IMAGE_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_IMAGE_MARKUP)}`;

function defaultItems(): Card3DItemSpec[] {
  return [
    {
      content: { h3: "Aceternity Cards", $: [heading()] } as DomphyElement,
      depth: { z: 24 },
    },
    {
      content: {
        p: "Hover to feel the depth — this composition floats above the base card as you move your cursor.",
        $: [paragraph({ color: "neutral" })],
      } as DomphyElement,
      depth: { z: 18 },
    },
    {
      content: {
        img: null,
        src: PLACEHOLDER_IMAGE_URI,
        alt: "",
        ariaHidden: "true",
        style: {
          width: "100%",
          display: "block",
          objectFit: "cover",
          borderRadius: themeSpacing(3),
        } as StyleObject,
      } as DomphyElement<"img">,
      depth: { z: 60 },
    },
    {
      content: {
        div: [
          { a: "Try now →", href: "#", $: [link()] } as DomphyElement,
          { small: "v2.0", $: [small({ color: "neutral" })] } as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        } as StyleObject,
      } as DomphyElement<"div">,
      depth: { z: 32 },
    },
  ];
}

function itemTransform(depth: Card3DItemDepth): string {
  const x = depth.x ?? 0;
  const y = depth.y ?? 0;
  const z = depth.z ?? 0;
  const rotateX = depth.rotateX ?? 0;
  const rotateY = depth.rotateY ?? 0;
  const rotateZ = depth.rotateZ ?? 0;
  return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
}

/**
 * A content card that tilts in 3D perspective toward the cursor and lifts
 * its inner elements into separated floating layers on hover. Call with no
 * arguments for a working demo card.
 */
function card3D(props: Card3DProps = {}): DomphyElement<"div"> {
  const items = props.items && props.items.length > 0 ? props.items : defaultItems();
  const color = props.color ?? "neutral";
  const maxRotateDegrees = props.maxRotateDegrees ?? 14;
  const perspectiveDistance = props.perspectiveDistance ?? 900;

  const itemElements: DomphyElement<"div">[] = items.map((item, index) => ({
    div: [item.content],
    _key: `card3d-item-${index}`,
    style: {
      transform: itemTransform(item.depth ?? {}),
      transformStyle: "preserve-3d",
      willChange: "transform",
    } as StyleObject,
  }));

  let cardBodyElement: HTMLElement | null = null;

  const cardBody: DomphyElement<"div"> = {
    div: itemElements,
    dataTone: "shift-15",
    _onMount: (node: ElementNode) => {
      cardBodyElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      cardBodyElement = null;
    },
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(4),
      padding: themeSpacing(6),
      borderRadius: themeSpacing(4),
      transformStyle: "preserve-3d",
      transform: "rotateX(0deg) rotateY(0deg)",
      transition: "transform 300ms ease-out",
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      ...(props.bodyStyle ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [cardBody],
    style: {
      perspective: `${perspectiveDistance}px`,
      width: "fit-content",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const wrapperElement = node.domElement as HTMLElement | null;
      if (!wrapperElement) return;

      const handlePointerMove = (event: PointerEvent) => {
        if (!cardBodyElement) return;
        const rect = wrapperElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
        const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
        const rotateY = offsetX * maxRotateDegrees * 2;
        const rotateX = -offsetY * maxRotateDegrees * 2;
        cardBodyElement.style.transition = "none";
        cardBodyElement.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      };
      const handlePointerLeave = () => {
        if (!cardBodyElement) return;
        cardBodyElement.style.transition = "transform 300ms ease-out";
        cardBodyElement.style.transform = "rotateX(0deg) rotateY(0deg)";
      };

      wrapperElement.addEventListener("pointermove", handlePointerMove);
      wrapperElement.addEventListener("pointerleave", handlePointerLeave);

      node.addHook("Remove", () => {
        wrapperElement.removeEventListener("pointermove", handlePointerMove);
        wrapperElement.removeEventListener("pointerleave", handlePointerLeave);
      });
    },
  } as DomphyElement<"div">;
}

export { card3D };
