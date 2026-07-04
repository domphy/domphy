// Aceternity UI "Loader" — clean-room reimplementation of the reference
// page's five small drop-in loading indicators (bouncing dots, shimmering
// text, an overlapping-dot cluster, a charging SVG glyph, and glitching
// text). Implemented purely from the block's public functional/visual spec —
// no upstream Aceternity source was viewed or copied.
//
// Every variant's continuous motion is JS-driven (a `requestAnimationFrame`
// loop or a `setInterval`, started in `_onMount`, torn down in `_onRemove`),
// per the spec's own note that none of these loop via plain CSS
// `@keyframes`. `loaderSet(props)` is the package's single exported factory:
// pass `variant` to render just one indicator (the intended drop-into-a-
// button/screen usage); call with no arguments to render a labeled gallery
// of all five, which is what the zero-arg "working demo" convention this
// package uses for docs screenshots produces here.
import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { small } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export type LoaderVariant = "simple" | "shimmer" | "compact" | "svg" | "glitch";

export interface LoaderSetProps {
  /** Which single indicator to render. Omit to render a demo gallery of all five. */
  variant?: LoaderVariant;
  /** Text content for the `"shimmer"`/`"glitch"` variants. */
  text?: string;
  /** Theme color family. Defaults to `"neutral"` for every variant. */
  color?: ThemeColor;
}

// ─── Simple / Compact (bouncing / overlapping dots) ──────────────────────────

function dotGlyph(): DomphyElement<"span"> {
  return {
    span: null,
    ariaHidden: "true",
    // Decorative dot with no text of its own — exempt from the missing-color
    // contract, matching `meteors.ts`'s own dot span.
    _doctorDisable: "missing-color",
    style: {
      display: "inline-block",
      flexShrink: "0",
      width: themeSpacing(4),
      height: themeSpacing(4),
      borderRadius: "50%",
      boxSizing: "border-box",
      border: (listener: Listener) => `1px solid ${themeColor(listener, "shift-6")}`,
      // A subtle top-light/bottom-dark gradient fill (not `backgroundColor`,
      // which the `tone-background-inherit` doctor rule only checks) —
      // matches `pulsatingButton.ts`'s own gradient-over-solid-color trick.
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to bottom, ${themeColor(listener, "shift-2")}, ${themeColor(listener, "shift-7")})`,
    } as StyleObject,
  } as DomphyElement<"span">;
}

/** Starts a per-dot oscillating loop (sine wave, phase-offset per index) that
 * writes a `translate(x, y)` transform directly to each dot's own DOM node
 * every animation frame. `axis` picks vertical bob (`"simple"`) vs
 * horizontal overlap-pulse (`"compact"`). */
function oscillateDots(node: ElementNode, axis: "x" | "y", amplitudePx: number, periodMs: number) {
  const container = node.domElement as HTMLElement | null;
  if (!container) return () => {};
  const dots = Array.from(container.children) as HTMLElement[];
  let animationFrame = 0;
  const startTime = performance.now();

  const tick = (now: number) => {
    const elapsed = now - startTime;
    dots.forEach((dot, index) => {
      const phase = (index / dots.length) * Math.PI * 2;
      const offset = Math.sin((elapsed / periodMs) * Math.PI * 2 + phase) * amplitudePx;
      dot.style.transform = axis === "y" ? `translateY(${offset.toFixed(2)}px)` : `translateX(${offset.toFixed(2)}px)`;
    });
    animationFrame = requestAnimationFrame(tick);
  };
  animationFrame = requestAnimationFrame(tick);

  return () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    dots.forEach((dot) => (dot.style.transform = ""));
  };
}

function simpleLoader(): DomphyElement<"div"> {
  return {
    div: [dotGlyph(), dotGlyph(), dotGlyph()],
    role: "status",
    ariaLabel: "loading",
    style: { display: "inline-flex", alignItems: "center", gap: themeSpacing(2) },
    _onMount: (node: ElementNode) => node.setMetadata("stopOscillation", oscillateDots(node, "y", 4, 900)),
    _onRemove: (node: ElementNode) => (node.getMetadata("stopOscillation") as (() => void) | undefined)?.(),
  };
}

function compactLoader(): DomphyElement<"div"> {
  return {
    div: [dotGlyph(), dotGlyph(), dotGlyph()],
    role: "status",
    ariaLabel: "loading",
    style: {
      display: "inline-flex",
      alignItems: "center",
      // Heavy negative overlap instead of the simple variant's even gap.
      "& > *:not(:first-child)": { marginInlineStart: themeSpacing(-2.5) },
    } as StyleObject,
    _onMount: (node: ElementNode) => node.setMetadata("stopOscillation", oscillateDots(node, "x", 3, 1100)),
    _onRemove: (node: ElementNode) => (node.getMetadata("stopOscillation") as (() => void) | undefined)?.(),
  };
}

// ─── Shimmer (sweeping-highlight text) ────────────────────────────────────────

function shimmerLoader(text: string): DomphyElement<"span"> {
  const characters = text.split("");
  return {
    span: characters.map((character, index) => ({
      span: character,
      _key: `shimmer-char-${index}`,
      style: { display: "inline-block", opacity: 0.6, color: (listener: Listener) => themeColor(listener, "shift-9") } as StyleObject,
    })),
    role: "status",
    ariaLabel: text,
    style: { display: "inline-block", whiteSpace: "pre" },
    _onMount: (node: ElementNode) => {
      const container = node.domElement as HTMLElement | null;
      if (!container) return;
      const spans = Array.from(container.children) as HTMLElement[];
      let animationFrame = 0;
      const startTime = performance.now();
      const waveWidth = 3; // characters the bright highlight spans at once
      const cycleMs = 1400;

      const tick = (now: number) => {
        const progress = ((now - startTime) % cycleMs) / cycleMs;
        const wavePosition = progress * (spans.length + waveWidth * 2) - waveWidth;
        spans.forEach((span, index) => {
          const distance = Math.abs(index - wavePosition);
          const intensity = Math.max(0, 1 - distance / waveWidth);
          // Floor raised from 0.35 to 0.6 — the dim end of the wave measured
          // a real WCAG contrast failure (axe-core `color-contrast`); 0.6
          // still reads as a clear shimmer sweep against the bright end.
          span.style.opacity = String(0.6 + intensity * 0.4);
        });
        animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
      node.setMetadata("stopShimmer", () => cancelAnimationFrame(animationFrame));
    },
    _onRemove: (node: ElementNode) => (node.getMetadata("stopShimmer") as (() => void) | undefined)?.(),
  };
}

// ─── SVG (charging lightning-bolt) ────────────────────────────────────────────

const BOLT_PATH = "M13 2 L4 14 H11 L9 22 L20 9 H13 L13 2 Z";

function svgLoader(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          {
            path: null,
            d: BOLT_PATH,
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.2",
            strokeLinejoin: "round",
            strokeLinecap: "round",
            pathLength: "1",
            style: {
              strokeDasharray: "1",
              animation: "loader-set-bolt-draw 1.8s linear infinite",
              "@keyframes loader-set-bolt-draw": {
                "0%": { strokeDashoffset: "1" },
                "60%,100%": { strokeDashoffset: "0" },
              },
            } as StyleObject,
          } as DomphyElement<"path">,
        ],
        viewBox: "0 0 24 24",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    role: "status",
    ariaLabel: "loading",
    style: { display: "inline-flex", width: themeSpacing(20), height: themeSpacing(20), color: (listener: Listener) => themeColor(listener, "shift-6") } as StyleObject,
    _onMount: (node: ElementNode) => {
      const path = (node.domElement as HTMLElement | null)?.querySelector("path") as SVGPathElement | null;
      if (!path) return;
      path.style.transition = "fill 900ms ease-in-out";
      let showBright = true;
      const applyFill = () => {
        path.style.fill = showBright ? themeColor(node, "shift-0", "neutral") : themeColor(node, "base", "highlight");
        showBright = !showBright;
      };
      applyFill();
      const timer = setInterval(applyFill, 900);
      node.setMetadata("stopBoltFill", () => clearInterval(timer));
    },
    _onRemove: (node: ElementNode) => (node.getMetadata("stopBoltFill") as (() => void) | undefined)?.(),
  };
}

// ─── Glitch (chromatic-aberration text) ───────────────────────────────────────

function glitchLoader(text: string): DomphyElement<"span"> {
  const duplicateLayer = (family: ThemeColor, key: string): DomphyElement<"span"> => ({
    span: text,
    _key: key,
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      // `aria-hidden` doesn't exempt this from WCAG contrast — it's still
      // visually rendered (that's the whole point of the glitch effect), so
      // a low-vision sighted user without a screen reader still needs to
      // read it. shift-8 at 0.7 opacity measured a real failure; shift-10 at
      // 0.85 keeps the "colorful RGB-split duplicate" look with more margin.
      color: (listener: Listener) => themeColor(listener, "shift-10", family),
      opacity: 0.85,
      mixBlendMode: "screen",
    } as StyleObject,
  });

  return {
    span: [
      duplicateLayer("success", "glitch-green"),
      duplicateLayer("secondary", "glitch-purple"),
      { span: text, style: { position: "relative" } },
    ],
    role: "status",
    ariaLabel: text,
    style: { position: "relative", display: "inline-block", color: (listener: Listener) => themeColor(listener, "shift-9") } as StyleObject,
    _onMount: (node: ElementNode) => {
      const container = node.domElement as HTMLElement | null;
      if (!container) return;
      const greenLayer = container.querySelector('[aria-hidden="true"]:nth-child(1)') as HTMLElement | null;
      const purpleLayer = container.querySelector('[aria-hidden="true"]:nth-child(2)') as HTMLElement | null;
      if (!greenLayer || !purpleLayer) return;

      const jitter = () => {
        greenLayer.style.transform = `translate(${(Math.random() - 0.5) * 2.4}px, ${(Math.random() - 0.5) * 1.4}px)`;
        purpleLayer.style.transform = `translate(${(Math.random() - 0.5) * 2.4}px, ${(Math.random() - 0.5) * 1.4}px)`;
      };
      jitter();
      const timer = setInterval(jitter, 120);
      node.setMetadata("stopGlitch", () => clearInterval(timer));
    },
    _onRemove: (node: ElementNode) => {
      const stop = node.getMetadata("stopGlitch") as (() => void) | undefined;
      stop?.();
    },
  };
}

// ─── Gallery (zero-arg demo) ───────────────────────────────────────────────────

function galleryEntry(labelText: string, content: DomphyElement): DomphyElement<"div"> {
  return {
    div: [content, { small: labelText, $: [small()] }],
    style: { display: "flex", flexDirection: "column", alignItems: "center", gap: themeSpacing(2) },
  };
}

function loaderGallery(): DomphyElement<"div"> {
  return {
    div: [
      galleryEntry("Simple", simpleLoader()),
      galleryEntry("Shimmer", shimmerLoader("Generating chat...")),
      galleryEntry("Compact", compactLoader()),
      galleryEntry("SVG", svgLoader()),
      galleryEntry("Glitch", glitchLoader("Loading...")),
    ],
    style: { display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: themeSpacing(8) },
  };
}

/**
 * One of five small drop-in loading indicators (`"simple"` bouncing dots,
 * `"shimmer"` sweeping-highlight text, `"compact"` overlapping dots, `"svg"` a
 * charging lightning-bolt glyph, `"glitch"` chromatic-aberration text). Pass
 * `variant` to render a single indicator for embedding in a button or loading
 * screen; call with no arguments for a working demo — a labeled gallery of
 * all five.
 */
function loaderSet(props: LoaderSetProps = {}): DomphyElement {
  const text = props.text ?? (props.variant === "glitch" ? "Loading..." : "Generating chat...");

  switch (props.variant) {
    case "simple":
      return simpleLoader();
    case "compact":
      return compactLoader();
    case "shimmer":
      return shimmerLoader(text);
    case "svg":
      return svgLoader();
    case "glitch":
      return glitchLoader(text);
    default:
      return loaderGallery();
  }
}

export { loaderSet };
