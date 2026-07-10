// magicui "Sparkles Text" — port of the MIT-licensed upstream (structure,
// default typography, and the 4-point sparkle glyph path match
// registry/magicui/sparkles-text.tsx). Static
// text overlaid with a handful of small star-shaped sparkles that
// continuously spawn at random positions, twinkle (scale + rotate + fade in
// then out) over a short cycle, and are retired from the DOM once their
// cycle finishes — a JS interval feeding a reactive list, one CSS keyframe
// animation per sparkle. Same general technique as the well-known "animated
// sparkles in React" pattern (random-position spawn + scale/rotate keyframe
// + periodic replace).
//
// The upstream demo's two accent colors are literal hex values; Domphy
// forbids raw color literals, so they are mapped to the closest built-in
// theme color families (`secondary` for the pink/magenta tone, `primary`
// for the cooler second tone) and exposed as an overridable prop.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { fixed } from "../../shared/typography.js";

export interface SparklesTextProps {
  /** Text content. Defaults to a short demo phrase. */
  children?: string;
  /** Roughly how many sparkles are alive at once. Defaults to 10. */
  sparkleCount?: number;
  /** The two accent colors sparkles alternate between. Defaults to `["secondary", "primary"]`. */
  colors?: [ThemeColor, ThemeColor];
  /** Smallest sparkle size, in `themeSpacing` units. Defaults to 1.5. */
  minSize?: number;
  /** Largest sparkle size, in `themeSpacing` units. Defaults to 3. */
  maxSize?: number;
  /** Milliseconds for one sparkle's full grow/hold/shrink cycle. Defaults to 900. */
  cycleDuration?: number;
  /** Passthrough style merged onto the root element. */
  style?: StyleObject;
}

interface SparkleEntry {
  key: string;
  topPercent: number;
  leftPercent: number;
  sizeUnits: number;
  color: ThemeColor;
}

/** Four-pointed star/sparkle glyph, colored via `currentColor` + a themed `style.color`. */
function sparkleGlyph(
  color: ThemeColor,
  sizeUnits: number,
): DomphyElement<"svg"> {
  return {
    svg: [
      {
        path: null,
        d: "M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z",
      },
    ],
    viewBox: "0 0 21 21",
    fill: "currentColor",
    ariaHidden: "true",
    style: {
      display: "block",
      width: themeSpacing(sizeUnits),
      height: themeSpacing(sizeUnits),
      color: (listener) => themeColor(listener, "shift-9", color),
    } as StyleObject,
  } as DomphyElement<"svg">;
}

function sparkleElement(
  entry: SparkleEntry,
  animationName: string,
  cycleDuration: number,
): DomphyElement<"span"> {
  return {
    span: [sparkleGlyph(entry.color, entry.sizeUnits)],
    _key: entry.key,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetBlockStart: `${entry.topPercent}%`,
      insetInlineStart: `${entry.leftPercent}%`,
      zIndex: 0,
      pointerEvents: "none",
      animation: `${animationName} ${cycleDuration}ms ease-in-out forwards`,
    },
  };
}

/**
 * Text overlaid with a steady population of small twinkling star sparkles
 * that continuously spawn, grow, hold, and fade at random positions. Runs
 * automatically — no interaction required. Call with no arguments for a
 * working demo phrase.
 */
function sparklesText(props: SparklesTextProps = {}): DomphyElement<"div"> {
  const text = props.children ?? "Sparkles Everywhere";
  const sparkleCount = Math.max(1, Math.round(props.sparkleCount ?? 10));
  const colors =
    props.colors ?? (["secondary", "primary"] as [ThemeColor, ThemeColor]);
  const minSize = props.minSize ?? 1.5;
  const maxSize = props.maxSize ?? 3;
  const cycleDuration = props.cycleDuration ?? 900;

  const keyframes = {
    "0%": { transform: "scale(0) rotate(0deg)", opacity: 0 },
    "25%": { transform: "scale(1) rotate(90deg)", opacity: 1 },
    "75%": { transform: "scale(1) rotate(90deg)", opacity: 1 },
    "100%": { transform: "scale(0) rotate(180deg)", opacity: 0 },
  };
  const animationName = `sparkles-text-twinkle-${hashString(JSON.stringify(keyframes))}`;

  const sparkles = toState<SparkleEntry[]>([]);

  return {
    div: [
      {
        // Upstream's `relative inline-block` wrapper holding the text and the
        // absolutely-positioned sparkle overlay.
        span: [
          { strong: text, style: { position: "relative", zIndex: 0 } },
          {
            span: (listener) =>
              sparkles
                .get(listener)
                .map((entry) =>
                  sparkleElement(entry, animationName, cycleDuration),
                ),
            style: {
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
            },
          },
        ],
        style: { position: "relative", display: "inline-block" },
      },
    ],
    // Upstream root carries `text-6xl font-bold`.
    style: {
      fontSize: fixed("3.75rem"),
      lineHeight: fixed("1"),
      fontWeight: fixed(700),
      [`@keyframes ${animationName}`]: keyframes,
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      let insertCount = 0;
      const spawnIntervalMs = Math.max(cycleDuration / sparkleCount, 50);
      const pendingRetireTimeouts = new Set<ReturnType<typeof setTimeout>>();

      const spawnSparkle = () => {
        insertCount += 1;
        const key = `sparkle-${insertCount}`;
        const entry: SparkleEntry = {
          key,
          topPercent: Math.round(Math.random() * 100),
          leftPercent: Math.round(Math.random() * 100),
          sizeUnits: minSize + Math.random() * (maxSize - minSize),
          color: Math.random() < 0.5 ? colors[0] : colors[1],
        };
        sparkles.set([...sparkles.get(), entry]);
        // Self-cleanup once this sparkle's own twinkle cycle has finished
        // playing, so the DOM population stays roughly constant.
        const retireTimeout = setTimeout(() => {
          pendingRetireTimeouts.delete(retireTimeout);
          sparkles.set(sparkles.get().filter((item) => item.key !== key));
        }, cycleDuration);
        pendingRetireTimeouts.add(retireTimeout);
      };

      spawnSparkle();
      const spawnTimer = setInterval(spawnSparkle, spawnIntervalMs);
      node.addHook("Remove", () => {
        clearInterval(spawnTimer);
        for (const retireTimeout of pendingRetireTimeouts)
          clearTimeout(retireTimeout);
        pendingRetireTimeouts.clear();
      });
    },
  };
}

export { sparklesText };
