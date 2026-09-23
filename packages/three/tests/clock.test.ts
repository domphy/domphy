import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameClock } from "../src/clock.js";

// Truth source for every case below: three.js's own `Clock` implementation
// (three/src/core/Clock.js), which `FrameClock` replaces verbatim because
// THREE.Clock is deprecated since r183 and warns on every construction.
// `performance.now` is stubbed so the assertions are exact, not timing-based.

let now = 0;

function setNow(milliseconds: number): void {
  now = milliseconds;
}

vi.spyOn(performance, "now").mockImplementation(() => now);

afterEach(() => {
  now = 0;
});

describe("FrameClock — THREE.Clock semantics (three/src/core/Clock.js)", () => {
  it("auto-starts on the first getDelta() and returns 0 for that call", () => {
    const clock = new FrameClock();
    setNow(1000);

    expect(clock.running).toBe(false);
    expect(clock.getDelta()).toBe(0);
    expect(clock.running).toBe(true);
    expect(clock.startTime).toBe(1000);
    expect(clock.elapsedTime).toBe(0);
  });

  it("returns the delta in SECONDS and accumulates it into elapsedTime", () => {
    const clock = new FrameClock();
    setNow(0);
    clock.start();

    setNow(16);
    expect(clock.getDelta()).toBeCloseTo(0.016, 6);
    setNow(48);
    expect(clock.getDelta()).toBeCloseTo(0.032, 6);
    expect(clock.elapsedTime).toBeCloseTo(0.048, 6);
  });

  it("start() resets elapsedTime and re-anchors oldTime", () => {
    const clock = new FrameClock();
    setNow(0);
    clock.start();
    setNow(500);
    clock.getDelta();
    expect(clock.elapsedTime).toBeCloseTo(0.5, 6);

    setNow(900);
    clock.start();
    expect(clock.elapsedTime).toBe(0);
    expect(clock.oldTime).toBe(900);
    expect(clock.startTime).toBe(900);
  });

  it("stop() folds the final slice in, then freezes the clock (autoStart off)", () => {
    const clock = new FrameClock();
    setNow(0);
    clock.start();

    setNow(250);
    clock.stop();
    expect(clock.elapsedTime).toBeCloseTo(0.25, 6);
    expect(clock.running).toBe(false);
    expect(clock.autoStart).toBe(false);

    // Time keeps moving; a stopped clock must not.
    setNow(5000);
    expect(clock.getDelta()).toBe(0);
    expect(clock.elapsedTime).toBeCloseTo(0.25, 6);
  });

  it("getElapsedTime() advances the clock before reporting, like getDelta()", () => {
    const clock = new FrameClock();
    setNow(0);
    clock.start();

    setNow(2000);
    expect(clock.getElapsedTime()).toBeCloseTo(2, 6);
    expect(clock.oldTime).toBe(2000);
  });
});
