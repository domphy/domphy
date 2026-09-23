// A function whose declared arity is > 0 (a required, non-default parameter)
// is not a zero-arg factory — invoking it with none is guaranteed to throw
// regardless of what it does. Doctor must skip invocation and report it once
// as info ("skipped: requires arguments"), not as a warning.
export const el = { div: "hello" };
export function needsRequiredOptions(options) {
  return { div: options.label };
}
// A default-valued parameter makes Function.length 0 — this one must still be
// invoked normally (and, since it has no bugs, produce no diagnostic at all).
export function hasDefaultOptions(options = {}) {
  return { div: options.label ?? "fallback" };
}
