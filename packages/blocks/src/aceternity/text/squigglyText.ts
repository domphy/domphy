// Aceternity UI "Squiggly Text" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Text whose glyphs continuously ripple/wobble in place via a small, looping
// set of pre-built SVG turbulence-noise + displacement-map filters, swapped
// on a fixed timer — a stepped/stop-motion jitter rather than a smoothly
// interpolated wobble, per the spec's own description.
//
// NOTE ON THE REFERENCE URL (per the task's own researchNote): the short
// label this task shipped with ("squiggly animated underline") does not
// match what this component's actual reference URL
// (ui.aceternity.com/components/squiggly-text) documents — glyph
// displacement via cycling SVG filters, no underline anywhere. Built to
// match the linked spec/domSketch, not the mismatched label.
//
// CORE FIX REQUIRED FOR THIS COMPONENT: `<feTurbulence>`/`<feDisplacementMap>`
// only have any visual effect when created in the SVG namespace.
// `packages/core/src/constants/SvgTags.ts` (the allowlist `ElementNode`
// consults to decide `createElementNS` vs a plain unnamespaced
// `createElement`) was missing both — confirmed by inspection; their
// attribute typings already existed in `HtmlAttributeMap.ts`, so the
// doctor's `unknown-tag` rule stayed silent even though the element would
// have rendered inert. Separately, `baseFrequency`/`numOctaves`/
// `xChannelSelector`/`yChannelSelector` are literal-camelCase SVG
// presentation attributes (not CSS-style kebab-case), and were missing from
// `CamelAttributes.ts`, so they would have been written to the DOM as
// `base-frequency`/etc — attribute names the SVG filter spec doesn't
// recognize. Both gaps are fixed at the source in this change (additive
// only) rather than worked around with a canvas/CSS substitute, so this
// ships as a literal, fully namespaced, correctly-attributed SVG filter
// chain — matching noiseTexture.ts's own documented gap, now closed.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";

export type SquigglyTextTag = "span" | "div";

export interface SquigglyTextProps {
  /** Text/content distorted by the wobble. Defaults to a short demo phrase. */
  children?: string;
  /** Number of distinct displacement frames in the loop — more steps read as
   * a smoother-looking cycle. Defaults to `5`. */
  steps?: number;
  /** Milliseconds each displacement frame is held before switching to the next. Defaults to `180`. */
  stepDuration?: number;
  /** Maximum pixel displacement. Alternates with a reduced value every other
   * step, per the spec's "can alternate between two values" note. Defaults to `4`. */
  scale?: number;
  /** Controls how coarse/fine the underlying noise pattern is — lower is
   * longer, smoother waves. Defaults to `0.02`. */
  baseFrequency?: number;
  /** Noise complexity/detail level. Defaults to `2`. */
  numOctaves?: number;
  /** Renders as an inline `<span>` or block `<div>`. Defaults to `"span"`. */
  as?: SquigglyTextTag;
  /** Extra class name merged onto the wrapper's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the wrapper. */
  style?: StyleObject;
}

let squigglyTextInstanceCounter = 0;

const DEFAULT_TEXT = "Wobbly, hand-drawn, always in motion";
// Every other step uses this fraction of `scale` instead of the full value —
// the spec's "scale can alternate between two values" note.
const ALTERNATE_SCALE_RATIO = 0.55;

/** One turbulence-noise + displacement-map filter per step, each with its own
 * seed so consecutive steps read as distinct, randomized-looking warps
 * rather than a single repeated shape. */
function stepFilter(filterId: string, stepIndex: number, scale: number, baseFrequency: number, numOctaves: number): DomphyElement {
  const stepScale = stepIndex % 2 === 0 ? scale : scale * ALTERNATE_SCALE_RATIO;
  return {
    filter: [
      {
        feTurbulence: null,
        type: "fractalNoise",
        baseFrequency: String(baseFrequency),
        numOctaves: String(numOctaves),
        seed: String(stepIndex * 11 + 3),
        result: "noise",
      } as DomphyElement,
      {
        feDisplacementMap: null,
        in: "SourceGraphic",
        in2: "noise",
        scale: String(stepScale),
        xChannelSelector: "R",
        yChannelSelector: "G",
      } as DomphyElement,
    ],
    id: filterId,
    _key: filterId,
  } as DomphyElement;
}

/** Hidden SVG sprite holding one pre-built filter per step — lives alongside
 * the visible text as a zero-size child, per the spec's domSketch. */
function filterDefs(filterIds: string[], scale: number, baseFrequency: number, numOctaves: number): DomphyElement<"svg"> {
  return {
    svg: [
      {
        defs: filterIds.map((filterId, stepIndex) => stepFilter(filterId, stepIndex, scale, baseFrequency, numOctaves)),
      } as DomphyElement,
    ],
    ariaHidden: "true",
    _key: "filter-defs",
    style: { position: "absolute", width: 0, height: 0, overflow: "hidden" } as StyleObject,
  } as DomphyElement<"svg">;
}

/**
 * Text whose glyphs continuously ripple/wobble via a small, looping set of
 * pre-built SVG turbulence-displacement filters, stepping (not smoothly
 * fading) from one to the next — a stop-motion jitter. Runs automatically
 * and continuously once mounted, no interaction needed. Call with no
 * arguments for a working demo phrase.
 */
function squigglyText(props: SquigglyTextProps = {}): DomphyElement {
  const text = props.children ?? DEFAULT_TEXT;
  const stepCount = Math.max(2, Math.round(props.steps ?? 5));
  const stepDurationMs = Math.max(30, props.stepDuration ?? 180);
  const scale = Math.max(0, props.scale ?? 4);
  const baseFrequency = props.baseFrequency ?? 0.02;
  const numOctaves = Math.max(1, Math.round(props.numOctaves ?? 2));
  const tag = props.as ?? "span";

  const instanceId = ++squigglyTextInstanceCounter;
  const filterIds = Array.from({ length: stepCount }, (_unused, index) => `domphy-squiggly-text-${instanceId}-${index}`);

  return {
    [tag]: [text, filterDefs(filterIds, scale, baseFrequency, numOctaves)],
    class: props.className,
    style: {
      display: tag === "div" ? "block" : "inline-block",
      filter: `url(#${filterIds[0]})`,
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;
      let stepIndex = 0;
      const timer = window.setInterval(() => {
        stepIndex = (stepIndex + 1) % filterIds.length;
        element.style.filter = `url(#${filterIds[stepIndex]})`;
      }, stepDurationMs);
      node.addHook("Remove", () => window.clearInterval(timer));
    },
    // The host tag is caller-configurable (`props.as`), so it can't be
    // narrowed to one arm of the DomphyElement tag union statically — same
    // caveat kineticText.ts/hyperText.ts document for their own dynamic-tag
    // return.
  } as unknown as DomphyElement;
}

export { squigglyText };
