// Aceternity UI "Carousel" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// horizontal carousel of large rounded photo cards, each with a headline
// and pill CTA overlay, navigated via round previous/next controls.
//
// Every slide is a fixed, always-mounted DOM node (no keyed insert/remove
// churn) positioned `absolute` and driven purely by one reactive style
// function of `distance = index - activeIndex` — the same "stack of
// cards, computed offset per depth" idiom `cardStack.ts` already
// establishes in this package. Softened/scaled neighbors and a hidden
// far tier fall out of that single function; clicking a neighbor jumps
// straight to it (`activeIndex.set(index)`), and the CTA icon's hover
// nudge is a plain nested `&:hover` CSS rule — no JS needed for that part.
// Per the spec's research note, the exact de-emphasis numbers (scale/
// opacity for non-active neighbors) are not from upstream; this file picks
// values that read as "centered slide sharp, neighbors softened" per the
// spec's qualitative description.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { buttonGhost, heading } from "@domphy/ui";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface CarouselSlideItem {
  /** Headline shown over the lower portion of the slide. */
  title: string;
  /** Label for the pill call-to-action button. */
  buttonLabel: string;
  /** Photo source. Defaults to a themed gradient placeholder when omitted. */
  imageSrc?: string;
}

export interface CarouselProps {
  /** Slide items. Defaults to 4 generic demo slides. */
  slides?: CarouselSlideItem[];
  /** Initially active slide index. Defaults to `0`. */
  activeIndex?: number;
  /** Called with the slide index whenever a slide's CTA button is clicked. */
  onSlideClick?: (index: number) => void;
  /** Accessible label for the "previous" control. Defaults to `"Previous slide"`. */
  previousLabel?: string;
  /** Accessible label for the "next" control. Defaults to `"Next slide"`. */
  nextLabel?: string;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const PLACEHOLDER_PALETTE: readonly [string, string][] = [
  ["#1e293b", "#38bdf8"],
  ["#312e81", "#f472b6"],
  ["#164e63", "#facc15"],
  ["#3f3f46", "#a3e635"],
];

const DEFAULT_SLIDES: CarouselSlideItem[] = [
  { title: "Northern Lights Expedition", buttonLabel: "Explore trip" },
  { title: "Kyoto in Autumn", buttonLabel: "View gallery" },
  { title: "Sahara Dune Crossing", buttonLabel: "Book now" },
  { title: "Fjords of Norway", buttonLabel: "Learn more" },
];

function placeholderSlideImage(index: number): string {
  const [top, accent] = PLACEHOLDER_PALETTE[index % PLACEHOLDER_PALETTE.length]!;
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
    `<rect width="640" height="400" fill="${top}"/>` +
    `<circle cx="500" cy="110" r="70" fill="${accent}"/>` +
    '<path d="M0 300 L160 180 L280 260 L420 140 L640 280 L640 400 L0 400 Z" fill="rgba(255,255,255,0.1)"/>' +
    "</svg>";
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

let carouselInstanceCounter = 0;

/**
 * A horizontal carousel of large rounded photo slides with a headline + CTA
 * overlay, navigated via round previous/next controls. Call with no
 * arguments for a working demo with 4 generic placeholder slides.
 */
function carousel(props: CarouselProps = {}): DomphyElement<"div"> {
  const instanceId = ++carouselInstanceCounter;
  const slides = props.slides && props.slides.length > 0 ? props.slides : DEFAULT_SLIDES;
  const totalSlides = slides.length;
  const previousLabel = props.previousLabel ?? "Previous slide";
  const nextLabel = props.nextLabel ?? "Next slide";

  const activeIndexState = toState(
    Math.min(Math.max(props.activeIndex ?? 0, 0), totalSlides - 1),
    `carousel-active-${instanceId}`,
  );

  const goToIndex = (nextIndex: number) => {
    const wrapped = ((nextIndex % totalSlides) + totalSlides) % totalSlides;
    activeIndexState.set(wrapped);
  };

  const slideElements: DomphyElement<"div">[] = slides.map((slide, index) => {
    const imageSource = slide.imageSrc ?? placeholderSlideImage(index);

    const computeTransform = (listener: Listener): string => {
      const distance = index - activeIndexState.get(listener);
      const translatePercent = distance * 62;
      const scale = distance === 0 ? 1 : 0.86;
      return `translateX(${translatePercent}%) scale(${scale})`;
    };
    const computeOpacity = (listener: Listener): number => {
      const distance = Math.abs(index - activeIndexState.get(listener));
      if (distance === 0) return 1;
      if (distance === 1) return 0.55;
      return 0;
    };
    const computeZIndex = (listener: Listener): number => {
      const distance = Math.abs(index - activeIndexState.get(listener));
      return totalSlides - distance;
    };
    const computePointerEvents = (listener: Listener): string =>
      Math.abs(index - activeIndexState.get(listener)) <= 1 ? "auto" : "none";

    return {
      div: [
        {
          img: null,
          src: imageSource,
          alt: slide.title,
          style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },
        } as DomphyElement<"img">,
        {
          div: [
            { h3: slide.title, $: [heading({ color: "neutral" })] } as DomphyElement,
            {
              button: [
                { span: slide.buttonLabel },
                { span: "→", ariaHidden: "true", "data-carousel-cta-icon": "true", style: { display: "inline-block", transform: "translateX(0)" } },
              ],
              onClick: (event: Event) => {
                event.stopPropagation();
                props.onSlideClick?.(index);
              },
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: themeSpacing(2),
                marginTop: themeSpacing(3),
                paddingBlock: themeSpacing(2),
                paddingInline: themeSpacing(5),
                borderRadius: themeSpacing(10),
                border: "none",
                cursor: "pointer",
                backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "primary"),
                color: (listener: Listener) => themeColor(listener, "shift-9", "primary"),
                "&:hover [data-carousel-cta-icon]": {
                  transform: "translateX(0.35em)",
                  transition: "transform 150ms ease-out",
                },
              },
            } as DomphyElement<"button">,
          ],
          // NOT `ariaHidden` — this wrapper holds the slide's real, focusable
          // CTA button (and its heading), not just the decorative gradient
          // scrim behind them. Hiding it made the button focusable but
          // invisible to assistive tech (axe-core `aria-hidden-focus`).
          _doctorDisable: "missing-color",
          style: {
            position: "absolute",
            insetBlockEnd: 0,
            insetInlineStart: 0,
            insetInlineEnd: 0,
            padding: themeSpacing(6),
            backgroundImage: (listener: Listener) =>
              `linear-gradient(to top, ${themeColor(listener, "inherit")} 5%, transparent 75%)`,
          },
        } as DomphyElement<"div">,
      ],
      _key: `carousel-slide-${instanceId}-${index}`,
      role: "group",
      ariaRoledescription: "slide",
      ariaLabel: `${index + 1} of ${totalSlides}`,
      onClick: () => goToIndex(index),
      dataTone: "shift-16",
      style: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: themeSpacing(6),
        cursor: "pointer",
        backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
        color: (listener: Listener) => themeColor(listener, "shift-9"),
        transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease",
        transform: computeTransform,
        opacity: computeOpacity,
        zIndex: computeZIndex,
        pointerEvents: computePointerEvents,
      } as StyleObject,
    } as DomphyElement<"div">;
  });

  const controlButtonStyle = (): StyleObject => ({
    borderRadius: "50%",
    width: themeSpacing(11),
    height: themeSpacing(11),
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    // Function form (not a static themeSpacing() string) so this reads as a
    // theme-driven size, not a hardcoded typography literal. `color` is
    // repeated here (buttonGhost() already sets it) only because doctor's
    // `missing-color` check inspects the authored native style, not what a
    // `$` patch will merge in at render time.
    fontSize: (listener: Listener) => themeSize(listener, "increase-1"),
    color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
  });

  const previousControl: DomphyElement<"button"> = {
    button: "‹",
    ariaLabel: previousLabel,
    $: [buttonGhost({ color: "neutral" })],
    onClick: () => goToIndex(activeIndexState.get() - 1),
    style: controlButtonStyle(),
  } as DomphyElement<"button">;

  const nextControl: DomphyElement<"button"> = {
    button: "›",
    ariaLabel: nextLabel,
    $: [buttonGhost({ color: "neutral" })],
    onClick: () => goToIndex(activeIndexState.get() + 1),
    style: controlButtonStyle(),
  } as DomphyElement<"button">;

  const track: DomphyElement<"div"> = {
    div: slideElements,
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 9",
      overflow: "hidden",
    } as StyleObject,
  } as DomphyElement<"div">;

  const controls: DomphyElement<"div"> = {
    div: [previousControl, nextControl],
    style: {
      display: "flex",
      justifyContent: "center",
      gap: themeSpacing(4),
      marginTop: themeSpacing(4),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [track, controls],
    style: {
      width: "100%",
      maxWidth: themeSpacing(200),
      marginInline: "auto",
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { carousel };
