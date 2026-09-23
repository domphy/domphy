// @domphy/doctor — static analyzer for Domphy element trees. Catches
// non-idiomatic patterns (inline typography, literal theme colors, unknown
// tones, void-tag content, missing/duplicate/unstable _key on lists, unknown
// tags) so humans and AI agents get a feedback loop to self-correct generated
// code. `validate()` is the aggregate entry point.
//
// Tests are typechecked separately from src: tsconfig.json's `include` stays
// `src/**/*` only (that is the config tsup's own DTS build reads, and a test
// file must never leak into a published .d.ts), and tsconfig.test.json
// extends it with `tests/**/*` added — run by `pnpm typecheck`, which runs
// both. The same split exists in @domphy/mcp, @domphy/i18n and
// create-domphy.

export type {
  CustomRule,
  DiagnoseOptions,
  Diagnostic,
  RuleCategory,
  Severity,
  ValidationReport,
  ValidationSummary,
} from "./diagnose.js";
export { BUILTIN_RULE_IDS, diagnose, format, validate } from "./diagnose.js";
export type { AppliedFix, FixResult } from "./fix.js";
export { fix } from "./fix.js";
export type { Layer4Options } from "./layer4.js";
export { auditOutput } from "./layer4.js";
