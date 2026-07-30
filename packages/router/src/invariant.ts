/**
 * Production-path counterpart of the DEV `throw new Error('Invariant failed: ...')`
 * guards. DEV keeps the full, actionable message at the call site; in production
 * only a short stable code is included so the failure stays identifiable without
 * shipping full message strings.
 */
export function invariant(code?: string): never {
  throw new Error(code ? `Invariant failed (${code})` : 'Invariant failed')
}
