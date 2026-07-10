// magicui "Backlight" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A wrapper
// that produces a soft, always-matching glow behind an image/video/SVG by
// running the SAME rendered content through a single SVG filter graph
// (Gaussian blur, then a saturation boost, then compositing the sharp
// original back over the blurred result) rather than cloning the DOM node
// and stacking a separately-blurred copy behind it — the reference's
// primary technique. Because the filter's `in="SourceGraphic"` is just
// "whatever this element already rendered", the glow color always tracks the
// wrapped media exactly, with no color prop of its own.
//
// Static: applied once via CSS `filter: url(#id)`, no animation. The hidden
// 0-size `<svg>` holding the `<filter>` def follows the same
// `domphy-<component>-<purpose>-<instanceId>` id convention and layout
// (`position: absolute; width: 0; height: 0; overflow: hidden`) as
// `morphingText.ts`'s "goo" filter defs.

import type { DomphyElement } from "@domphy/core";

export interface BacklightProps {
  /** The single media element to wrap — image, video, or SVG. Defaults to a
   * small colorful placeholder graphic (so the glow is visible out of the box). */
  children?: DomphyElement;
  /** Gaussian blur `stdDeviation` controlling how soft/wide the glow spreads. Defaults to `20`. */
  blur?: number;
  /** Passthrough class applied to the outer wrapper div. */
  className?: string;
}

let backlightInstanceCounter = 0;

/** A small, colorful inline SVG photo placeholder — bright enough that the glow reads clearly. */
function defaultBacklightMedia(): DomphyElement<"img"> {
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">' +
    '<rect width="320" height="220" fill="#2f6feb"/>' +
    '<circle cx="230" cy="70" r="46" fill="#ffd23f"/>' +
    '<polygon points="0,220 120,90 190,160 260,80 320,220" fill="#ff5c8a"/>' +
    "</svg>";
  return {
    img: null,
    src: `data:image/svg+xml,${encodeURIComponent(markup)}`,
    alt: "Colorful placeholder graphic",
    style: {
      display: "block",
      width: "100%",
      height: "auto",
      maxWidth: "20em",
    },
  } as DomphyElement<"img">;
}

/** Hidden SVG holding the shared blur → saturate → recomposite filter definition. */
function backlightFilterDefs(
  filterId: string,
  blur: number,
): DomphyElement<"svg"> {
  return {
    svg: [
      {
        defs: [
          {
            filter: [
              {
                feGaussianBlur: null,
                in: "SourceGraphic",
                stdDeviation: String(blur),
                result: "blurred",
              },
              {
                feColorMatrix: null,
                in: "blurred",
                type: "saturate",
                values: "4",
                result: "saturated",
              },
              {
                feComposite: null,
                in: "SourceGraphic",
                in2: "saturated",
                operator: "over",
              },
            ],
            id: filterId,
            x: "-50%",
            y: "-50%",
            width: "200%",
            height: "200%",
          },
        ],
      },
    ],
    ariaHidden: "true",
    style: { position: "absolute", width: 0, height: 0, overflow: "hidden" },
  } as DomphyElement<"svg">;
}

/**
 * Wraps a single media element (image, video, or SVG) in a soft,
 * color-matched ambient glow, produced by running the same rendered content
 * through a blur → saturate → recomposite SVG filter graph. Call with no
 * arguments for a working demo — a small colorful placeholder graphic with
 * its own matching backlight.
 */
function backlight(props: BacklightProps = {}): DomphyElement<"div"> {
  const instanceId = ++backlightInstanceCounter;
  const filterId = `domphy-backlight-glow-${instanceId}`;
  const blur = props.blur ?? 20;
  const content = props.children ?? defaultBacklightMedia();

  return {
    div: [
      backlightFilterDefs(filterId, blur),
      {
        div: [content],
        style: { filter: `url(#${filterId})` },
      } as DomphyElement<"div">,
    ],
    class: props.className,
  };
}

export { backlight };
