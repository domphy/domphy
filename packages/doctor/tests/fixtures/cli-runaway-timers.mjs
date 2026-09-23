// Starts real timers at import time, the way a mounted component's animation
// loop or polling interval would. installTimerWatchdog() (packages/doctor/src/
// cli.ts) is supposed to clear these once this file's diagnostics are
// collected, not let them run for the rest of the CLI's process lifetime.
// Reports what it observes to stderr at process exit — checked, not a
// timing-based wait, so this is deterministic rather than a race.
export const el = { div: "x" };

const interval = setInterval(() => {}, 60000);
const timeout = setTimeout(() => {}, 60000);

process.on("exit", () => {
  // Node clears `_idleTimeout` to -1 and sets `_destroyed` on a Timeout once
  // it is actually cleared — internal fields, but the only synchronous,
  // non-timing-dependent way to observe "was this handle cleared" from
  // outside the module that scheduled it.
  const cleared = (handle) =>
    handle._destroyed === true || handle._idleTimeout === -1;
  console.error(
    cleared(interval) && cleared(timeout) ? "TIMERS_CLEARED" : "TIMERS_LEAKED",
  );
});
