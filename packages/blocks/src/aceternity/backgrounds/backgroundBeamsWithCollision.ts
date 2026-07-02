// Aceternity UI "Background Beams with Collision" — clean-room
// reimplementation from the public behavior/visual spec only (no upstream
// source viewed or copied). A light hero backdrop where thin glowing
// vertical beams continuously fall from the top of the section and burst
// into a small particle explosion when they hit the bottom edge.
//
// Every beam's fall is driven imperatively (direct `element.style.transform`
// writes from one shared `requestAnimationFrame` loop, the same
// continuous-many-elements idiom `backgroundBeams.ts` already uses for its
// own gradient sweep) rather than through reactive `State`, since dozens of
// beams updating every frame would be wasteful to route through per-property
// listeners. Each beam runs its own `[delay] -> [fall for duration] ->
// [pause for repeatDelay] -> repeat` cycle; a beam's current Y position is
// compared every frame against the *measured* inner container height (via
// `getBoundingClientRect()`, per the spec's own note that the collision
// boundary is derived at runtime rather than hard-coded), and the first frame
// a beam's position crosses that boundary within a cycle hides the beam and
// spawns a short-lived particle burst at that (x, boundary) point — the same
// "timer pushes a transient entry into reactive `State`, a matching
// `setTimeout` removes it" shape `shootingStars.ts` uses for its own
// streaks, reused here for the small scatter of dots instead of a whole
// streak, each animated via this package's `motion()` patch.
//
// The upstream spec's gradient headline uses a literal purple-to-pink hex
// gradient — like this package's `auroraText.ts`, the gradient is expressed
// as `ThemeColor` roles resolved through `themeColor()` and painted with the
// `background-clip: text` + `color: "transparent"` technique (an
// established doctor-compliant idiom in this package: `"transparent"` is an
// explicitly exempted CSS keyword, not a raw color literal).

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, motion, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface BackgroundBeamsWithCollisionBeamSpec {
  /** Horizontal start position, in percent of the container width. Random by default. */
  initialXPercent?: number;
  /** Tilt applied to the falling beam, in deg. Random small tilt by default. */
  rotate?: number;
  /** Fall duration for one cycle, in seconds. Defaults to `8` (randomized +/-30% by default). */
  duration?: number;
  /** Initial delay before the first fall, in seconds. Random by default. */
  delay?: number;
  /** Pause between the beam disappearing at the bottom and its next fall, in seconds. Random by default. */
  repeatDelay?: number;
}

export interface BackgroundBeamsWithCollisionProps {
  /** Content layered above the beams. Defaults to a demo headline with a gradient second line. */
  children?: DomphyElement | DomphyElement[];
  /** Number of default beams generated when `beams` is omitted. Defaults to `12`. */
  beamCount?: number;
  /** Explicit per-beam overrides, replacing the generated defaults. */
  beams?: BackgroundBeamsWithCollisionBeamSpec[];
  /** Theme color family for every beam. Defaults to `"secondary"` (violet). */
  beamColor?: ThemeColor;
  /** Theme color family for the collision particle burst. Defaults to `beamColor`. */
  particleColor?: ThemeColor;
  /** Fall distance beyond the container's own height, in px — generous so beams always overshoot the measured floor before the loop notices. Defaults to `1800`. */
  translateYDistance?: number;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

interface BeamRuntime {
  element: HTMLElement | null;
  leftPercent: number;
  rotateDeg: number;
  durationMs: number;
  delayMs: number;
  repeatDelayMs: number;
  hasCollidedThisCycle: boolean;
  previousPhaseMs: number;
}

interface ParticleBurstEntry {
  key: string;
  leftPercent: number;
  topPx: number;
  scatterXPercent: number[];
  scatterYPx: number[];
}

const BEAM_INITIAL_Y = -60;
const PARTICLES_PER_BURST = 6;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildDefaultBeams(count: number): Required<BackgroundBeamsWithCollisionBeamSpec>[] {
  return Array.from({ length: count }, () => ({
    initialXPercent: Math.random() * 100,
    rotate: randomBetween(-8, 8),
    duration: randomBetween(5.5, 10.5),
    delay: randomBetween(0, 5),
    repeatDelay: randomBetween(1.5, 5),
  }));
}

function defaultCollisionContent(): DomphyElement[] {
  return [
    {
      h1: [
        { span: "Ship faster with", _key: "plain-line", style: { display: "block" } as StyleObject } as DomphyElement,
        {
          span: "beams that never stop falling",
          ariaHidden: "true",
          _key: "gradient-line",
          style: {
            display: "block",
            backgroundImage: (listener: Listener) =>
              `linear-gradient(90deg, ${themeColor(listener, "shift-9", "secondary")}, ${themeColor(listener, "shift-9", "highlight")})`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          } as StyleObject,
        } as DomphyElement,
      ],
      $: [heading()],
    } as DomphyElement<"h1">,
    {
      p: "Every collision at the bottom edge bursts into a tiny shower of light.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

let backgroundBeamsWithCollisionInstanceCounter = 0;

/**
 * A light hero backdrop of thin falling beams that burst into a small
 * particle explosion when they hit the bottom edge, continuously and
 * indefinitely. Call with no arguments for a working demo — 12 randomized
 * beams behind a two-line demo headline.
 */
function backgroundBeamsWithCollision(props: BackgroundBeamsWithCollisionProps = {}): DomphyElement<"div"> {
  const instanceId = ++backgroundBeamsWithCollisionInstanceCounter;
  const beamCount = Math.max(1, Math.round(props.beamCount ?? 12));
  const beamColor = props.beamColor ?? "secondary";
  const particleColor = props.particleColor ?? beamColor;
  const translateYDistance = Math.max(200, props.translateYDistance ?? 1800);

  const beamSpecs = props.beams && props.beams.length > 0 ? props.beams : buildDefaultBeams(beamCount);

  const runtimes: BeamRuntime[] = beamSpecs.map((spec) => ({
    element: null,
    leftPercent: spec.initialXPercent ?? Math.random() * 100,
    rotateDeg: spec.rotate ?? randomBetween(-8, 8),
    durationMs: (spec.duration ?? randomBetween(5.5, 10.5)) * 1000,
    delayMs: (spec.delay ?? randomBetween(0, 5)) * 1000,
    repeatDelayMs: (spec.repeatDelay ?? randomBetween(1.5, 5)) * 1000,
    hasCollidedThisCycle: false,
    previousPhaseMs: 0,
  }));

  const particleBursts: State<ParticleBurstEntry[]> = toState([], `background-beams-collision-particles-${instanceId}`);

  function particleBurstElement(entry: ParticleBurstEntry): DomphyElement<"span"> {
    return {
      span: entry.scatterXPercent.map((scatterX, dotIndex) => ({
        span: null,
        _key: `dot-${dotIndex}`,
        ariaHidden: "true",
        _doctorDisable: ["missing-color", "tone-background-inherit"],
        style: {
          position: "absolute",
          insetInlineStart: 0,
          insetBlockEnd: 0,
          width: themeSpacing(0.75),
          height: themeSpacing(0.75),
          borderRadius: "50%",
          backgroundColor: (listener: Listener) => themeColor(listener, "shift-11", particleColor),
        } as StyleObject,
        $: [
          motion({
            initial: { x: 0, y: 0, opacity: 1 },
            animate: { x: `${scatterX}px`, y: `${entry.scatterYPx[dotIndex]}px`, opacity: 0 },
            transition: { duration: 520, easing: "ease-out" },
          }),
        ],
      })) as DomphyElement[],
      _key: entry.key,
      ariaHidden: "true",
      style: {
        position: "absolute",
        insetInlineStart: `${entry.leftPercent}%`,
        top: `${entry.topPx}px`,
        width: 0,
        height: 0,
      } as StyleObject,
    };
  }

  function beamElement(runtime: BeamRuntime, index: number): DomphyElement<"span"> {
    return {
      span: null,
      _key: `beam-${index}`,
      ariaHidden: "true",
      // Decorative streak with no text of its own — exempt from the
      // missing-color contract (mirrors meteors.ts's dot spans elsewhere).
      _doctorDisable: ["missing-color", "tone-background-inherit"],
      _onMount: (node: ElementNode) => {
        runtime.element = node.domElement as HTMLElement;
      },
      _onRemove: () => {
        runtime.element = null;
      },
      style: {
        position: "absolute",
        top: 0,
        left: `${runtime.leftPercent}%`,
        width: themeSpacing(0.375),
        height: themeSpacing(16),
        opacity: 0,
        pointerEvents: "none",
        backgroundImage: (listener: Listener) =>
          `linear-gradient(to bottom, transparent, ${themeColor(listener, "shift-9", beamColor)}, transparent)`,
      } as StyleObject,
    } as DomphyElement<"span">;
  }

  const contentChildren = props.children ? (Array.isArray(props.children) ? props.children : [props.children]) : defaultCollisionContent();

  return {
    div: [
      {
        div: [...runtimes.map((runtime, index) => beamElement(runtime, index)), { div: (listener) => particleBursts.get(listener).map(particleBurstElement), style: { position: "absolute", inset: 0 } as StyleObject }],
        style: { position: "absolute", inset: 0, overflow: "hidden" } as StyleObject,
        _onMount: (node: ElementNode) => {
          if (typeof window === "undefined") return;
          const floorElement = node.domElement as HTMLElement;

          let animationFrameId: number | null = null;
          let intersectionObserver: IntersectionObserver | null = null;
          let insertCount = 0;
          // `requestAnimationFrame`'s timestamp is time-since-navigation-start,
          // not time-since-this-loop-started — capture the first frame's value
          // so every beam's `delayMs` is relative to when THIS loop began.
          let loopStartTimeMs: number | null = null;
          const cleanupTimeouts = new Set<ReturnType<typeof setTimeout>>();

          function spawnParticleBurst(leftPercent: number, topPx: number): void {
            insertCount += 1;
            const entry: ParticleBurstEntry = {
              key: `burst-${instanceId}-${insertCount}`,
              leftPercent,
              topPx,
              scatterXPercent: Array.from({ length: PARTICLES_PER_BURST }, () => randomBetween(-24, 24)),
              scatterYPx: Array.from({ length: PARTICLES_PER_BURST }, () => randomBetween(-18, -2)),
            };
            particleBursts.set([...particleBursts.get(), entry]);
            const removeHandle = setTimeout(() => {
              cleanupTimeouts.delete(removeHandle);
              particleBursts.set(particleBursts.get().filter((item) => item.key !== entry.key));
            }, 600);
            cleanupTimeouts.add(removeHandle);
          }

          function tick(timeMs: number): void {
            if (loopStartTimeMs === null) loopStartTimeMs = timeMs;
            const elapsedSinceStart = timeMs - loopStartTimeMs;
            const boundaryHeight = floorElement.getBoundingClientRect().height;
            for (const runtime of runtimes) {
              if (!runtime.element) continue;
              const cycleLengthMs = runtime.durationMs + runtime.repeatDelayMs;
              const rawElapsed = elapsedSinceStart - runtime.delayMs;
              const phaseMs = ((rawElapsed % cycleLengthMs) + cycleLengthMs) % cycleLengthMs;

              if (phaseMs < runtime.previousPhaseMs) runtime.hasCollidedThisCycle = false;
              runtime.previousPhaseMs = phaseMs;

              if (rawElapsed < 0) {
                runtime.element.style.opacity = "0";
                continue;
              }

              if (phaseMs >= runtime.durationMs) {
                runtime.element.style.opacity = "0";
                continue;
              }

              const progress = phaseMs / runtime.durationMs;
              const currentY = BEAM_INITIAL_Y + progress * (translateYDistance - BEAM_INITIAL_Y);

              if (!runtime.hasCollidedThisCycle && boundaryHeight > 0 && currentY >= boundaryHeight) {
                runtime.hasCollidedThisCycle = true;
                runtime.element.style.opacity = "0";
                spawnParticleBurst(runtime.leftPercent, boundaryHeight);
                continue;
              }

              runtime.element.style.opacity = "1";
              runtime.element.style.transform = `translateY(${currentY.toFixed(1)}px) rotate(${runtime.rotateDeg.toFixed(1)}deg)`;
            }
            animationFrameId = window.requestAnimationFrame(tick);
          }

          function startLoop(): void {
            if (animationFrameId !== null) return;
            animationFrameId = window.requestAnimationFrame(tick);
          }
          function stopLoop(): void {
            if (animationFrameId === null) return;
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }

          if (typeof IntersectionObserver === "function") {
            intersectionObserver = new IntersectionObserver((entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) startLoop();
                else stopLoop();
              }
            });
            intersectionObserver.observe(floorElement);
          } else {
            startLoop();
          }

          node.addHook("Remove", () => {
            stopLoop();
            intersectionObserver?.disconnect();
            for (const handle of cleanupTimeouts) clearTimeout(handle);
            cleanupTimeouts.clear();
          });
        },
      } as DomphyElement,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement,
    ],
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(10),
      minHeight: themeSpacing(96),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { backgroundBeamsWithCollision };
