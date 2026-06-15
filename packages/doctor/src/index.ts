// @domphy/doctor — static analyzer for Domphy element trees. Catches
// non-idiomatic patterns (inline typography, literal theme colors, unknown
// tones, void-tag content, missing/duplicate/unstable _key on lists, unknown
// tags) so humans and AI agents get a feedback loop to self-correct generated
// code. `validate()` is the aggregate entry point.

export type {
  DiagnoseOptions,
  Diagnostic,
  Severity,
  ValidationReport,
  ValidationSummary,
} from "./diagnose.js";
export { diagnose, format, validate } from "./diagnose.js";
export type { AppliedFix, FixResult } from "./fix.js";
export { fix } from "./fix.js";
