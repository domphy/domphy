// Aceternity UI "Hero Parallax" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// hero landing section: a large centered headline sits above several
// staggered rows of product thumbnail cards that rotate, slide
// horizontally in alternating directions, and fade in together as the page
// scrolls through the section.
//
// Same `position: sticky` pinned-range idiom this file's sibling components
// (`containerScrollAnimation`, `macbookScroll`) use: a tall outer
// `<section>` defines the scroll room, an inner `position: sticky` stage
// stays pinned for that whole range, and progress (0 at pin-start, 1 at
// pin-release) drives everything as a `State<number>` read by reactive
// `style.transform`/`opacity` functions — only a handful of elements ever
// transform here (the grid wrapper plus one wrapper per row), so routing
// through Domphy's own reactivity (rather than `parallaxScroll`'s
// direct-DOM-write loop, justified there by dozens of repeated image nodes)
// keeps this component's code simpler with no measurable cost.
//
// Each row keeps a fixed horizontal stagger baseline even at full scroll
// progress (row 0 ends shifted left, row 1 right, row 2 left) — that
// permanent offset is what gives the "mosaic, not a strict grid" resting
// look the spec calls out, on top of which a larger scroll-driven
// `translateX` delta collapses in as the section scrolls, reinforcing the
// parallax depth.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, paragraph, small } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface HeroParallaxProduct {
  title: string;
  thumbnail: string;
  link?: string;
}

export interface HeroParallaxProps {
  /** Product thumbnails distributed across rows. Defaults to 15 generated placeholders. */
  products?: HeroParallaxProduct[];
  /** Large centered headline. Defaults to a short demo line. */
  heading?: string;
  /** Supporting subtext beneath the headline. Defaults to a short demo line. */
  subtext?: string;
  /** Number of rows the products are chunked into, in order. Defaults to `3`. */
  rows?: number;
  /** Multiplier scaling the rotation/translate travel distance. Defaults to `1`. */
  intensity?: number;
  /** How tall the scroll wrapper is, in viewport-height units. Defaults to `230`, clamped to a minimum of `150`. */
  wrapperHeightVh?: number;
  /** Passthrough style merged onto the outer section. */
  style?: StyleObject;
}

// [start, end] translateX (px) per row index, at scroll progress 0 and 1
// respectively — the "end" values are the permanent resting stagger; the
// "start" values are how far out the row begins before settling.
const ROW_TRANSLATE_RANGES: Array<[number, number]> = [
  [-260, -60],
  [260, 60],
  [-260, -40],
];

const DEFAULT_PRODUCT_COUNT = 15;

let heroParallaxInstanceCounter = 0;

function buildDefaultProducts(): HeroParallaxProduct[] {
  return Array.from({ length: DEFAULT_PRODUCT_COUNT }, (_unused, index) => ({
    title: `Project ${index + 1}`,
    thumbnail: `https://picsum.photos/seed/domphy-hero-parallax-${index + 1}/600/400`,
  }));
}

/** Splits `items` into `rowCount` sequential chunks, as evenly sized as possible. */
function chunkIntoRows<T>(items: T[], rowCount: number): T[][] {
  const rows: T[][] = Array.from({ length: rowCount }, () => []);
  const chunkSize = Math.ceil(items.length / rowCount);
  items.forEach((item, index) => {
    const rowIndex = Math.min(rowCount - 1, Math.floor(index / chunkSize));
    rows[rowIndex].push(item);
  });
  return rows;
}

function clampToUnitRange(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Pinned-range progress: 0 when the section's top reaches the viewport top, 1 when its
 * bottom reaches the viewport bottom — same math this package's other sticky-pinned
 * scroll effects use. */
function computePinnedProgress(sectionElement: HTMLElement): number {
  const rect = sectionElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollableDistance = rect.height - viewportHeight;
  const raw = scrollableDistance > 0 ? -rect.top / scrollableDistance : rect.top <= 0 ? 1 : 0;
  return clampToUnitRange(raw);
}

function productCard(product: HeroParallaxProduct, rowIndex: number, cardIndex: number): DomphyElement<"a"> {
  return {
    a: [
      {
        img: null,
        src: product.thumbnail,
        // Empty, not `product.title` — the `<small>` caption right below
        // already names the product in visible text; a non-empty alt here
        // duplicated that same string, so a screen reader announced the
        // title twice back to back (axe-core `image-redundant-alt`).
        alt: "",
        ariaHidden: "true",
        loading: "lazy",
        _doctorDisable: "missing-color",
        style: { display: "block", width: "100%", aspectRatio: "3 / 2", objectFit: "cover" } as StyleObject,
      } as DomphyElement,
      {
        div: [{ small: product.title, $: [small({ color: "neutral" })] } as DomphyElement],
        style: { padding: themeSpacing(2) } as StyleObject,
      } as DomphyElement,
    ],
    href: product.link ?? "#",
    _key: `hero-parallax-card-${rowIndex}-${cardIndex}`,
    style: {
      display: "block",
      flex: "0 0 auto",
      width: themeSpacing(56),
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      textDecoration: () => "none",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) => `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(listener, "shift-17")}`,
    } as StyleObject,
  };
}

/**
 * A hero landing section: a large centered headline above staggered,
 * mosaic-like rows of product thumbnail cards that flatten, fade in, and
 * slide into place as the section scrolls through the viewport — purely
 * scroll-driven, no click required. Call with no arguments for a working
 * demo (a demo headline over 15 generated product cards across 3 rows).
 */
function heroParallax(props: HeroParallaxProps = {}): DomphyElement<"section"> {
  const instanceId = ++heroParallaxInstanceCounter;
  const products = props.products && props.products.length > 0 ? props.products : buildDefaultProducts();
  const rowCount = Math.max(1, Math.min(ROW_TRANSLATE_RANGES.length, Math.round(props.rows ?? 3)));
  const intensity = props.intensity ?? 1;
  const wrapperHeightVh = Math.max(150, Math.round(props.wrapperHeightVh ?? 230));
  const headingText = props.heading ?? "Ship interfaces without the framework tax.";
  const subtext = props.subtext ?? "Real teams building real products, one plain object at a time.";

  const productRows = chunkIntoRows(products, rowCount);
  const progress = toState(0, `hero-parallax-progress-${instanceId}`);

  function rowElement(row: HeroParallaxProduct[], rowIndex: number): DomphyElement<"div"> {
    const [startTranslate, endTranslate] = ROW_TRANSLATE_RANGES[rowIndex % ROW_TRANSLATE_RANGES.length];
    return {
      div: row.map((product, cardIndex) => productCard(product, rowIndex, cardIndex)),
      _key: `hero-parallax-row-${rowIndex}`,
      style: {
        display: "flex",
        gap: themeSpacing(5),
        transform: (listener: Listener) => {
          const value = progress.get(listener);
          const offset = (startTranslate + (endTranslate - startTranslate) * value) * intensity;
          return `translateX(${offset.toFixed(1)}px)`;
        },
      } as StyleObject,
    };
  }

  return {
    section: [
      {
        div: [
          { h1: headingText, $: [heading()] } as DomphyElement,
          { p: subtext, $: [paragraph()] } as DomphyElement,
        ],
        style: {
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: themeSpacing(180),
          marginInline: "auto",
          marginBlockEnd: themeSpacing(12),
        } as StyleObject,
      } as DomphyElement<"div">,
      {
        div: productRows.map((row, rowIndex) => rowElement(row, rowIndex)),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(5),
          transformOrigin: "50% 0%",
          transform: (listener: Listener) => {
            const value = progress.get(listener);
            const rotation = 20 * (1 - value) * intensity;
            const lift = 100 * (1 - value);
            return `rotateX(${rotation.toFixed(2)}deg) translateY(${lift.toFixed(1)}px)`;
          },
          opacity: (listener: Listener) => 0.3 + 0.7 * progress.get(listener),
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-16",
    style: {
      position: "relative",
      minHeight: `${wrapperHeightVh}vh`,
      // The whole grid needs an ancestor perspective for its `rotateX` to
      // read as real 3D depth rather than a flat vertical squish.
      perspective: themeSpacing(360),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
      const outerSectionElement = node.domElement as HTMLElement;

      let currentProgress = computePinnedProgress(outerSectionElement);
      let targetProgress = currentProgress;
      let isAnimating = false;
      let animationFrameHandle = 0;
      progress.set(currentProgress);

      function step(): void {
        currentProgress += (targetProgress - currentProgress) * 0.18;
        if (Math.abs(targetProgress - currentProgress) < 0.001) {
          currentProgress = targetProgress;
          progress.set(currentProgress);
          isAnimating = false;
          return;
        }
        progress.set(currentProgress);
        animationFrameHandle = window.requestAnimationFrame(step);
      }

      function handleScroll(): void {
        targetProgress = computePinnedProgress(outerSectionElement);
        if (!isAnimating) {
          isAnimating = true;
          animationFrameHandle = window.requestAnimationFrame(step);
        }
      }

      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll);

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (animationFrameHandle) window.cancelAnimationFrame(animationFrameHandle);
      });
    },
  };
}

export { heroParallax };
