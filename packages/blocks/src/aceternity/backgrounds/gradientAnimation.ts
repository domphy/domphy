// Aceternity UI "Background Gradient Animation" — clean-room reimplementation
// from the public behavior/visual spec only (no upstream source viewed or
// copied). A full-area ambient background made of several large, blurred,
// colored gradient blobs that continuously drift and rotate in slow loops,
// blending into an organic, lava-lamp-like moving gradient over a deep base
// gradient backdrop.
//
// Five blobs, five independent named `@keyframes` (mirrors `warpBackground`'s
// "one animation per decorative layer" shape): two drift back-and-forth on
// one axis (`animation-direction: alternate`), one drifts diagonally, and
// two sweep an approximate elliptical orbit (five sampled keyframe stops,
// looping the same direction — no `alternate`, so it reads as a continuous
// orbit rather than a back-and-forth wobble). Durations/timing functions are
// deliberately mismatched (20–40s, mixed `linear`/`ease-in-out`) so the five
// loops drift out of phase with each other instead of ever looking
// mechanically synchronized. Every blob keyframe encodes its own `-50%,-50%`
// centering baked directly into each stop's `transform: translate(...)`
// value (rather than layering a separate static transform underneath),
// since a single `transform` property can't be animated on top of another
// fixed `transform` — same reasoning as `orbitingCircles.ts`'s own
// combined-transform keyframes.
//
// All blob layers share one wrapper with a heavy `blur()` filter and
// `mix-blend-mode` set per blob, which is what fuses the overlapping edges
// into richer blended hues — this substitutes for the reference's additional
// SVG "goo" alpha-threshold filter (a `feColorMatrix` contrast/threshold
// trick that sharpens blur into blob-like edges): the heavy blur +
// blend-mode combination alone already reads as a fluid, merging glow, and
// skipping the goo filter avoids that filter's very fiddly, engine-dependent
// tuning for a marginal visual gain. See this component's `fidelityNotes`.
//
// The optional pointer-follow blob (on by default) is the one piece that
// can't be a CSS keyframe loop — it must track live mouse coordinates — so
// it's the same imperative, rAF-lerped "ease toward the target" technique
// this package's `lens.ts`/`scrollProgress.ts` use for their own
// high-frequency, purely-visual pointer/scroll following.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface GradientAnimationBlobColors {
  /** Defaults to `"info"` (blue). */
  first?: ThemeColor;
  /** Defaults to `"secondary"` (magenta/purple). */
  second?: ThemeColor;
  /** Defaults to `"primary"` (cyan-leaning accent). */
  third?: ThemeColor;
  /** Defaults to `"error"` (red). */
  fourth?: ThemeColor;
  /** Defaults to `"warning"` (yellow). */
  fifth?: ThemeColor;
  /** Pointer-follow blob color. Defaults to `"highlight"`. */
  pointer?: ThemeColor;
}

export interface GradientAnimationProps {
  /** Base backdrop gradient start color. Defaults to `"secondary"` (deep purple). */
  baseGradientFrom?: ThemeColor;
  /** Base backdrop gradient end color. Defaults to `"info"` (deep blue). */
  baseGradientTo?: ThemeColor;
  /** Per-blob theme color overrides. */
  blobColors?: GradientAnimationBlobColors;
  /** Each blob's size as a percentage of the container. Defaults to `80`. */
  blobSizePercent?: number;
  /** CSS `mix-blend-mode` used to composite the blobs. Defaults to `"hard-light"`. */
  blendMode?: string;
  /** Enables the extra pointer-follow blob layered on top of the passive animation. Defaults to `true`. */
  interactive?: boolean;
  /** Content rendered above the animated background (e.g. hero text/buttons). Defaults to a small demo hero. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the content slot. */
  contentStyle?: StyleObject;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

interface BlobMotionPreset {
  key: string;
  colorKey: keyof GradientAnimationBlobColors;
  defaultColor: ThemeColor;
  keyframes: Record<string, StyleObject>;
  duration: number;
  timing: string;
  direction?: string;
}

const BLOB_MOTION_PRESETS: BlobMotionPreset[] = [
  {
    key: "horizontal",
    colorKey: "first",
    defaultColor: "info",
    keyframes: {
      "0%": { transform: "translate(-68%, -50%)" },
      "100%": { transform: "translate(-32%, -50%)" },
    },
    duration: 24,
    timing: "ease-in-out",
    direction: "alternate",
  },
  {
    key: "vertical",
    colorKey: "second",
    defaultColor: "secondary",
    keyframes: {
      "0%": { transform: "translate(-50%, -68%)" },
      "100%": { transform: "translate(-50%, -32%)" },
    },
    duration: 28,
    timing: "ease-in-out",
    direction: "alternate",
  },
  {
    key: "diagonal",
    colorKey: "third",
    defaultColor: "primary",
    keyframes: {
      "0%": { transform: "translate(-64%, -64%)" },
      "100%": { transform: "translate(-36%, -36%)" },
    },
    duration: 36,
    timing: "linear",
    direction: "alternate",
  },
  {
    key: "orbit",
    colorKey: "fourth",
    defaultColor: "error",
    keyframes: {
      "0%": { transform: "translate(-50%, -50%)" },
      "25%": { transform: "translate(-22%, -64%)" },
      "50%": { transform: "translate(6%, -50%)" },
      "75%": { transform: "translate(-22%, -36%)" },
      "100%": { transform: "translate(-50%, -50%)" },
    },
    duration: 32,
    timing: "linear",
  },
  {
    key: "orbit-reverse",
    colorKey: "fifth",
    defaultColor: "warning",
    keyframes: {
      "0%": { transform: "translate(-50%, -50%)" },
      "25%": { transform: "translate(-78%, -36%)" },
      "50%": { transform: "translate(-94%, -50%)" },
      "75%": { transform: "translate(-78%, -64%)" },
      "100%": { transform: "translate(-50%, -50%)" },
    },
    duration: 40,
    timing: "linear",
  },
];

let gradientAnimationInstanceCounter = 0;

function defaultHeroContent(): DomphyElement[] {
  return [
    { h1: "An animated, ambient gradient background", $: [heading()] } as DomphyElement,
    {
      p: "Blurred color blobs drift and orbit slowly behind this text, blending into a soft, lava-lamp-like glow.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

/**
 * A full-area ambient background made of several large, blurred, colored
 * gradient blobs that continuously drift and orbit over a deep base
 * gradient, blending into an organic, lava-lamp-like glow. Call with no
 * arguments for a working demo — five drifting blobs behind a hero heading,
 * with an extra pointer-follow blob layered on top.
 */
function gradientAnimation(props: GradientAnimationProps = {}): DomphyElement<"div"> {
  const instanceId = ++gradientAnimationInstanceCounter;
  const baseGradientFrom = props.baseGradientFrom ?? "secondary";
  const baseGradientTo = props.baseGradientTo ?? "info";
  const blobColors = props.blobColors ?? {};
  const blobSizePercent = props.blobSizePercent ?? 80;
  const blendMode = props.blendMode ?? "hard-light";
  const interactive = props.interactive ?? true;
  const pointerColor = blobColors.pointer ?? "highlight";

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultHeroContent();

  const blobElements: DomphyElement[] = BLOB_MOTION_PRESETS.map((preset) => {
    const color = blobColors[preset.colorKey] ?? preset.defaultColor;
    const animationName = `gradient-animation-${preset.key}-${hashString(
      JSON.stringify({ instanceId, preset: preset.key }),
    )}`;
    return {
      div: null,
      _key: `blob-${instanceId}-${preset.key}`,
      ariaHidden: "true",
      // Decorative blurred blob with no text of its own — exempt from the
      // missing-color contract, matching warpBackground.ts's beam spans.
      _doctorDisable: "missing-color",
      style: {
        position: "absolute",
        insetBlockStart: "50%",
        insetInlineStart: "50%",
        width: `${blobSizePercent}%`,
        height: `${blobSizePercent}%`,
        borderRadius: "50%",
        backgroundImage: (listener: Listener) =>
          `radial-gradient(circle at center, ${themeColor(listener, "shift-9", color)} 0%, transparent 60%)`,
        mixBlendMode: blendMode,
        animation: `${animationName} ${preset.duration}s ${preset.timing} infinite${preset.direction ? ` ${preset.direction}` : ""}`,
        [`@keyframes ${animationName}`]: preset.keyframes,
      } as StyleObject,
    } as DomphyElement;
  });

  const pointerBlob: DomphyElement | null = interactive
    ? ({
        div: null,
        dataGradientPointerBlob: "true",
        ariaHidden: "true",
        _doctorDisable: "missing-color",
        style: {
          position: "absolute",
          insetBlockStart: "50%",
          insetInlineStart: "50%",
          width: `${Math.round(blobSizePercent * 0.5)}%`,
          height: `${Math.round(blobSizePercent * 0.5)}%`,
          borderRadius: "50%",
          backgroundImage: (listener: Listener) =>
            `radial-gradient(circle at center, ${themeColor(listener, "shift-9", pointerColor)} 0%, transparent 60%)`,
          mixBlendMode: blendMode,
          opacity: 0.8,
          transform: "translate(-50%, -50%)",
          transition: "opacity 0.4s ease-out",
        } as StyleObject,
      } as DomphyElement)
    : null;

  const blobsWrapper: DomphyElement<"div"> = {
    div: [...blobElements, ...(pointerBlob ? [pointerBlob] : [])],
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      filter: `blur(${themeSpacing(20)})`,
    } as StyleObject,
  } as DomphyElement<"div">;

  /** Eases the pointer-follow blob toward live pointer coordinates (rAF-lerped, like `lens.ts`/`scrollProgress.ts`). */
  function pointerFollowMountHandler(node: ElementNode): void {
    if (typeof window === "undefined") return;
    const containerElement = node.domElement as HTMLElement | null;
    const pointerElement = containerElement?.querySelector(
      '[data-gradient-pointer-blob="true"]',
    ) as HTMLElement | null;
    if (!containerElement || !pointerElement) return;

    let currentX = 0.5;
    let currentY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let animating = false;
    let rafHandle = 0;

    const paint = () => {
      const rect = containerElement.getBoundingClientRect();
      pointerElement.style.transform =
        `translate(${(currentX * rect.width - rect.width / 2).toFixed(1)}px, ` +
        `${(currentY * rect.height - rect.height / 2).toFixed(1)}px) translate(-50%, -50%)`;
    };
    paint();

    const step = () => {
      // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
      // that wipes the DOM directly instead of going through the framework's
      // removal lifecycle) never fire the "Remove" hook below. Bailing here
      // once the node is detached prevents the loop from leaking forever.
      if (!pointerElement.isConnected) return;
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      paint();
      if (Math.abs(targetX - currentX) < 0.001 && Math.abs(targetY - currentY) < 0.001) {
        animating = false;
        return;
      }
      rafHandle = window.requestAnimationFrame(step);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = containerElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = (event.clientX - rect.left) / rect.width;
      targetY = (event.clientY - rect.top) / rect.height;
      if (!animating) {
        animating = true;
        rafHandle = window.requestAnimationFrame(step);
      }
    };

    containerElement.addEventListener("pointermove", handlePointerMove);
    node.addHook("Remove", () => {
      containerElement.removeEventListener("pointermove", handlePointerMove);
      if (rafHandle) window.cancelAnimationFrame(rafHandle);
    });
  }

  return {
    div: [
      blobsWrapper,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
          ...(props.contentStyle ?? {}),
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-16",
    // `_onMount` is only included at all when `interactive` is on — Domphy
    // rejects an explicit `_onMount: undefined` hook value, so the key must
    // be omitted entirely (not just set to `undefined`) rather than toggled
    // via a ternary in place.
    ...(interactive ? { _onMount: pointerFollowMountHandler } : {}),
    style: {
      position: "relative",
      overflow: "hidden",
      minHeight: themeSpacing(120),
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to bottom right, ${themeColor(listener, "shift-16", baseGradientFrom)}, ${themeColor(listener, "shift-17", baseGradientTo)})`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { gradientAnimation };
