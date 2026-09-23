// `THREE.Clock` is deprecated since three r183 — it logs a console warning on
// every construction (so every `three()` mount) and is scheduled for removal.
// Its replacement, `THREE.Timer`, exposes a different API (`getElapsed()`,
// `update()`, no writable `elapsedTime`/`oldTime`) and does not exist across
// this package's `three >= 0.156` peer range, so branching on `THREE.REVISION`
// would mean two code paths with two behaviors.
//
// SPEC.md's locked "version-agnostic" decision applies: own the ~30 lines
// instead. Semantics are `THREE.Clock`'s verbatim (three/src/core/Clock.js),
// which is what `root.clock` promises — loop.ts writes `elapsedTime`/`oldTime`
// directly in `frameloop: "never"` mode, and userland reads
// `clock.getElapsedTime()` inside `onFrame`.
export class FrameClock {
  /** Start on the first `getDelta()` call when the clock was never started. */
  autoStart = true;
  /** `performance.now()` at the last `start()`. */
  startTime = 0;
  /** `performance.now()` at the last `start()`/`getDelta()`/`getElapsedTime()`. */
  oldTime = 0;
  /** Total seconds the clock has been running. */
  elapsedTime = 0;
  running = false;

  start(): void {
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
    this.running = true;
  }

  stop(): void {
    this.getElapsedTime();
    this.running = false;
    this.autoStart = false;
  }

  getElapsedTime(): number {
    this.getDelta();
    return this.elapsedTime;
  }

  getDelta(): number {
    let diff = 0;

    if (this.autoStart && !this.running) {
      this.start();
      return 0;
    }

    if (this.running) {
      const newTime = performance.now();
      diff = (newTime - this.oldTime) / 1000;
      this.oldTime = newTime;
      this.elapsedTime += diff;
    }

    return diff;
  }
}
