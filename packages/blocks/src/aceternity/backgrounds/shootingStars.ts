// Aceternity UI "Shooting Stars and Stars Background" — clean-room
// reimplementation from the public behavior/visual spec only (no upstream
// source viewed or copied). A full-bleed dark starfield: many small
// stationary stars twinkle gently and asynchronously, while periodic
// "shooting stars" streak diagonally across the view on a randomized
// interval, each a bright head with a tapering gradient trail that fades out
// near the end of its path.
//
// The stationary field is a single inline SVG of `count` circles at random
// positions, drawn once at generation time (no runtime cost) — a shared
// `@keyframes` opacity/scale pulse (declared once on the outer container's
// style, the same "one keyframes block, many differently-timed `animation`
// values" idiom `meteors.ts` uses elsewhere in this package) plays on each
// twinkling circle with its own randomized duration/delay, so only a subset
// pulses at any moment and none of them are in lockstep. `twinklingProbability`
// controls what fraction of stars get that `animation` at all; the rest sit at
// a fixed, slightly dimmer opacity.
//
// Shooting stars are spawned by a `setTimeout` chain (each spawn schedules the
// next one after a fresh randomized delay) into a reactive `State<Entry[]>`
// list — the same "timer pushes into reactive state" shape `animatedList.ts`
// uses for its notification feed. Each entry is a small head dot (glow via
// `boxShadow`) with a nested, statically-rotated gradient trail bar, animated
// along its travel vector via this package's `motion()` patch (`x`/`y` in
// `vmax` units so the diagonal reads consistently regardless of the
// container's aspect ratio, mirroring `meteors.ts`'s own `vmax` travel
// distance) fading `opacity` to `0` as it completes; a matching `setTimeout`
// removes the entry from the list once the travel animation finishes.

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { heading, motion, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface ShootingStarsProps {
  /** Foreground content layered above the starfield. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Stationary background star count. Defaults to `120`. */
  starCount?: number;
  /** Fraction (0–1) of background stars that twinkle; the rest stay at a fixed dim opacity. Defaults to `0.7`. */
  twinklingProbability?: number;
  /** Minimum twinkle cycle duration, in seconds. Defaults to `0.5`. */
  minTwinkleSpeed?: number;
  /** Maximum twinkle cycle duration, in seconds. Defaults to `1`. */
  maxTwinkleSpeed?: number;
  /** Background star diameter, in px. Defaults to `2`. */
  starSize?: number;
  /** Theme color family for the stationary stars. Defaults to `"neutral"`. */
  starColor?: ThemeColor;
  /** Theme color family for the shooting star's tail (the far end of the trail). Defaults to `"info"` (cyan). */
  trailColor?: ThemeColor;
  /** Theme color family for the shooting star's head/near end of the trail. Defaults to `"secondary"` (violet). */
  headColor?: ThemeColor;
  /** Minimum ms between one shooting star spawning and the next. Defaults to `4200`. */
  minSpawnDelayMs?: number;
  /** Maximum ms between one shooting star spawning and the next. Defaults to `8700`. */
  maxSpawnDelayMs?: number;
  /** Minimum shooting-star travel duration, in ms (higher = slower). Defaults to `1200`. */
  minTravelMs?: number;
  /** Maximum shooting-star travel duration, in ms. Defaults to `2600`. */
  maxTravelMs?: number;
  style?: StyleObject;
}

interface BackgroundStar {
  key: string;
  leftPercent: number;
  topPercent: number;
  twinkles: boolean;
  durationSeconds: number;
  delaySeconds: number;
}

interface ShootingStarEntry {
  key: string;
  leftPercent: number;
  topPercent: number;
  travelXVmax: number;
  travelYVmax: number;
  trailAngleDeg: number;
  travelMs: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildBackgroundStars(
  count: number,
  twinklingProbability: number,
  minTwinkleSpeed: number,
  maxTwinkleSpeed: number,
  instanceId: number,
): BackgroundStar[] {
  return Array.from({ length: count }, (_unused, index) => ({
    key: `bg-star-${instanceId}-${index}`,
    leftPercent: Math.random() * 100,
    topPercent: Math.random() * 100,
    twinkles: Math.random() < twinklingProbability,
    durationSeconds: randomBetween(minTwinkleSpeed, maxTwinkleSpeed),
    delaySeconds: Math.random() * maxTwinkleSpeed,
  }));
}

function defaultShootingStarsContent(): DomphyElement[] {
  return [
    { h2: "Shooting Stars", $: [heading()] } as DomphyElement,
    {
      p: "A quiet starfield with the occasional streak crossing the sky.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

let shootingStarsInstanceCounter = 0;

/**
 * A full-bleed dark starfield backdrop: many small twinkling stationary
 * stars, plus periodic shooting stars streaking diagonally across the view
 * on a randomized interval. Call with no arguments for a working demo.
 */
function shootingStars(props: ShootingStarsProps = {}): DomphyElement<"div"> {
  const instanceId = ++shootingStarsInstanceCounter;
  const starCount = Math.max(0, Math.round(props.starCount ?? 120));
  const twinklingProbability = Math.min(1, Math.max(0, props.twinklingProbability ?? 0.7));
  const minTwinkleSpeed = Math.max(0.1, props.minTwinkleSpeed ?? 0.5);
  const maxTwinkleSpeed = Math.max(minTwinkleSpeed, props.maxTwinkleSpeed ?? 1);
  const starSize = props.starSize ?? 2;
  const starColor = props.starColor ?? "neutral";
  const trailColor = props.trailColor ?? "info";
  const headColor = props.headColor ?? "secondary";
  const minSpawnDelayMs = Math.max(50, props.minSpawnDelayMs ?? 4200);
  const maxSpawnDelayMs = Math.max(minSpawnDelayMs, props.maxSpawnDelayMs ?? 8700);
  const minTravelMs = Math.max(200, props.minTravelMs ?? 1200);
  const maxTravelMs = Math.max(minTravelMs, props.maxTravelMs ?? 2600);

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultShootingStarsContent();

  const twinkleAnimationName = `shooting-stars-twinkle-${hashString(`${instanceId}`)}`;
  const twinkleKeyframes = {
    "0%": { opacity: 0.2, transform: "scale(1)" },
    "50%": { opacity: 1, transform: "scale(1.3)" },
    "100%": { opacity: 0.2, transform: "scale(1)" },
  };

  const backgroundStars = buildBackgroundStars(
    starCount,
    twinklingProbability,
    minTwinkleSpeed,
    maxTwinkleSpeed,
    instanceId,
  );

  const backgroundStarCircles: DomphyElement[] = backgroundStars.map((star) => ({
    circle: null,
    _key: star.key,
    cx: `${star.leftPercent}%`,
    cy: `${star.topPercent}%`,
    r: String(starSize / 2),
    fill: (listener: Listener) => themeColor(listener, "shift-13", starColor),
    style: {
      opacity: star.twinkles ? undefined : 0.35,
      animation: star.twinkles
        ? `${twinkleAnimationName} ${star.durationSeconds.toFixed(2)}s ease-in-out ${star.delaySeconds.toFixed(2)}s infinite`
        : undefined,
      transformOrigin: "center",
      transformBox: "fill-box",
    } as StyleObject,
  } as DomphyElement));

  const backgroundLayer: DomphyElement<"svg"> = {
    svg: backgroundStarCircles,
    ariaHidden: "true",
    // Decorative starfield with no text of its own — exempt from the
    // missing-color contract (mirrors meteors.ts's dot spans elsewhere).
    _doctorDisable: "missing-color",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    xmlns: "http://www.w3.org/2000/svg",
    style: { position: "absolute", inset: 0, width: "100%", height: "100%" } as StyleObject,
  } as DomphyElement<"svg">;

  const shootingStarEntries: State<ShootingStarEntry[]> = toState([], `shooting-star-entries-${instanceId}`);

  function shootingStarElement(entry: ShootingStarEntry): DomphyElement<"span"> {
    return {
      span: [
        {
          span: null,
          ariaHidden: "true",
          _doctorDisable: "missing-color",
          style: {
            position: "absolute",
            top: "50%",
            right: "50%",
            width: themeSpacing(20),
            height: themeSpacing(0.5),
            transformOrigin: "right center",
            transform: `translateY(-50%) rotate(${entry.trailAngleDeg.toFixed(1)}deg)`,
            backgroundImage: (listener) =>
              `linear-gradient(to left, ${themeColor(listener, "shift-13", headColor)}, ${themeColor(listener, "shift-9", trailColor)}, transparent)`,
          } as StyleObject,
        } as DomphyElement,
      ],
      _key: entry.key,
      ariaHidden: "true",
      // Decorative head dot with no text of its own — exempt from the
      // missing-color contract. Also exempt from tone-background-inherit: a
      // shooting star's head is intentionally a fixed bright accent, not a
      // surface that should track the ambient dataTone context (same
      // reasoning as meteors.ts's dots elsewhere in this package).
      _doctorDisable: ["missing-color", "tone-background-inherit"],
      style: {
        position: "absolute",
        left: `${entry.leftPercent}%`,
        top: `${entry.topPercent}%`,
        width: themeSpacing(1.25),
        height: themeSpacing(1.25),
        borderRadius: "50%",
        backgroundColor: (listener) => themeColor(listener, "shift-17", headColor),
        boxShadow: (listener) =>
          `0 0 ${themeSpacing(2)} ${themeColor(listener, "shift-13", headColor)}`,
      } as StyleObject,
      $: [
        motion({
          initial: { x: 0, y: 0, opacity: 1 },
          animate: {
            x: `${entry.travelXVmax.toFixed(2)}vmax`,
            y: `${entry.travelYVmax.toFixed(2)}vmax`,
            opacity: 0,
          },
          transition: { duration: entry.travelMs, easing: "linear" },
        }),
      ],
    } as DomphyElement<"span">;
  }

  return {
    div: [
      backgroundLayer,
      {
        div: (listener) => shootingStarEntries.get(listener).map(shootingStarElement),
        ariaHidden: "true",
        style: { position: "absolute", inset: 0 } as StyleObject,
      } as DomphyElement,
      { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement,
    ],
    dataTone: "shift-17",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(80),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      [`@keyframes ${twinkleAnimationName}`]: twinkleKeyframes,
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      let spawnTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let insertCount = 0;
      const cleanupTimeouts = new Set<ReturnType<typeof setTimeout>>();

      function spawnShootingStar() {
        insertCount += 1;
        const travelAngleRad = randomBetween(20, 55) * (Math.PI / 180);
        const travelDistanceVmax = randomBetween(60, 95);
        const travelMs = Math.round(randomBetween(minTravelMs, maxTravelMs));
        const entry: ShootingStarEntry = {
          key: `shooting-star-${instanceId}-${insertCount}`,
          leftPercent: Math.random() * 60,
          topPercent: Math.random() * 40,
          travelXVmax: Math.cos(travelAngleRad) * travelDistanceVmax,
          travelYVmax: Math.sin(travelAngleRad) * travelDistanceVmax,
          trailAngleDeg: (travelAngleRad * 180) / Math.PI + 180,
          travelMs,
        };
        shootingStarEntries.set([...shootingStarEntries.get(), entry]);

        const removeHandle = setTimeout(() => {
          cleanupTimeouts.delete(removeHandle);
          shootingStarEntries.set(shootingStarEntries.get().filter((item) => item.key !== entry.key));
        }, travelMs);
        cleanupTimeouts.add(removeHandle);
      }

      function scheduleNextSpawn() {
        spawnTimeoutHandle = setTimeout(() => {
          spawnShootingStar();
          scheduleNextSpawn();
        }, randomBetween(minSpawnDelayMs, maxSpawnDelayMs));
      }

      scheduleNextSpawn();

      node.addHook("Remove", () => {
        if (spawnTimeoutHandle !== null) clearTimeout(spawnTimeoutHandle);
        for (const handle of cleanupTimeouts) clearTimeout(handle);
        cleanupTimeouts.clear();
      });
    },
  };
}

export { shootingStars };
