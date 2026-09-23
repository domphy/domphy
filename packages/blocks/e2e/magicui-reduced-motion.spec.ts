import { expect, test } from "@playwright/test";
import { attachConsole, mountBlock, openDemo } from "./helpers.js";

/**
 * Truth source: WCAG 2.2.2 "Pause, Stop, Hide" (Level A) — motion that starts
 * automatically, lasts more than five seconds and is presented in parallel
 * with other content must be pausable — read through the OS-level
 * `prefers-reduced-motion: reduce` signal and measured against the REAL
 * browser: `Animation.playState` from `getAnimations()`, whether a `<video>`
 * is still playing, and whether the block's own
 * `requestAnimationFrame`/timer loops keep firing.
 *
 * No expectation here is read off the components' own output. The expected
 * value is "nothing is moving", which is what the success criterion demands,
 * and Chromium is the oracle that reports whether that holds.
 */

/** Every Magic UI block whose motion starts on its own and never ends. */
const AUTO_LOOPING_BLOCKS = [
  // CSS `animation: … infinite`
  "animatedGridPattern",
  "lightRays",
  "retroGrid",
  "ripple",
  "rainbowButton",
  "shimmerButton",
  "pulsatingButton",
  "shinyButton",
  "warpBackground",
  "neonGradientCard",
  "bentoGrid",
  "dottedMap",
  "marquee",
  "orbitingCircles",
  "terminal",
  "borderBeam",
  "meteors",
  "animatedGradientText",
  "animatedShinyText",
  "auroraText",
  "lineShadowText",
  "spinningText",
  "videoText",
  // JS-driven loops (rAF / chained timers) that no CSS media query can reach
  "flickeringGrid",
  "dotPattern",
  "particles",
  "animatedBeam",
  "globe",
  "iconCloud",
  "scrollBasedVelocity",
  "animatedCircularProgressBar",
  "animatedList",
  "morphingText",
  "wordRotate",
  "sparklesText",
  "typingAnimation",
  "numberTicker",
  "hyperText",
  "textReveal",
];

type MotionCounters = { raf: number; timer: number };
type CounterWindow = Window & { motionCounters: MotionCounters };

// The counters are global, so the demo harness itself contributes a few stray
// ticks per sampling window; a live 60fps loop contributes about sixty.
const RAF_TICK_NOISE = 8;
const TIMER_TICK_NOISE = 2;
const SAMPLE_WINDOW_MS = 1000;
const SETTLE_MS = 700;

/** Runs before any page script: counts every rAF/timer callback that fires. */
function instrumentMotionCounters(): void {
  const counters: MotionCounters = { raf: 0, timer: 0 };
  (window as unknown as CounterWindow).motionCounters = counters;

  const rawRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) =>
    rawRequestAnimationFrame((time) => {
      counters.raf += 1;
      return callback(time);
    });

  for (const name of ["setTimeout", "setInterval"] as const) {
    const raw = window[name].bind(window) as (
      handler: TimerHandler,
      timeout?: number,
      ...rest: unknown[]
    ) => number;
    (window[name] as unknown) = (
      handler: TimerHandler,
      timeout?: number,
      ...rest: unknown[]
    ) =>
      typeof handler === "function"
        ? raw(
            (...args: unknown[]) => {
              counters.timer += 1;
              return (handler as (...callbackArgs: unknown[]) => unknown)(
                ...args,
              );
            },
            timeout,
            ...rest,
          )
        : raw(handler, timeout, ...rest);
  }
}

test.describe("magicui — prefers-reduced-motion: reduce (WCAG 2.2.2)", () => {
  // One test per block: the demo harness mounts a given block only once per
  // page, each sampling window needs its own timeout budget, and a failure
  // then names the offending block directly.
  for (const name of AUTO_LOOPING_BLOCKS) {
    test(`${name} stops animating once the user asks for reduced motion`, async ({
      page,
    }) => {
      const consoleErrors = attachConsole(page);
      // Emulated per page, not via `test.use({ reducedMotion })`: with this
      // package's playwright.config the fixture form does not reach the page
      // (`matchMedia("(prefers-reduced-motion: reduce)").matches` stayed
      // false), which would have made every assertion below vacuous. Asserted
      // below so a silent regression of the emulation itself fails loudly.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(instrumentMotionCounters);
      await openDemo(page);
      expect(
        await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
        "prefers-reduced-motion: reduce is not emulated — the measurements below would be meaningless",
      ).toBe(true);
      await mountBlock(page, name);

      // Let mount-time work settle, then measure the STEADY state.
      await page.waitForTimeout(SETTLE_MS);
      await page.evaluate(() => {
        const counters = (window as unknown as CounterWindow).motionCounters;
        counters.raf = 0;
        counters.timer = 0;
      });
      await page.waitForTimeout(SAMPLE_WINDOW_MS);

      const measured = await page.evaluate((blockName) => {
        const counters = (window as unknown as CounterWindow).motionCounters;
        const root = document.querySelector(
          `[data-block="${blockName}"] .block-box`,
        );
        const running = root
          ? root
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === "running").length
          : 0;
        const playingVideos = root
          ? [...root.querySelectorAll("video")].filter((video) => !video.paused)
              .length
          : 0;
        return {
          raf: counters.raf,
          timer: counters.timer,
          running,
          playingVideos,
        };
      }, name);

      const reasons: string[] = [];
      if (measured.running > 0)
        reasons.push(`${measured.running} running CSS animation(s)`);
      if (measured.raf > RAF_TICK_NOISE)
        reasons.push(`${measured.raf} rAF ticks per second`);
      if (measured.timer > TIMER_TICK_NOISE)
        reasons.push(`${measured.timer} timer ticks per second`);
      if (measured.playingVideos > 0)
        reasons.push(`${measured.playingVideos} playing <video>`);

      expect(reasons, `${name} is still moving under reduce`).toEqual([]);
      expect(consoleErrors, consoleErrors.join(" | ")).toEqual([]);
    });
  }
});
