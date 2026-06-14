// @domphy/doctor — static analyzer for Domphy element trees. Catches
// non-idiomatic patterns (inline typography, void-tag content, missing _key on
// dynamic lists, unknown tags) so humans and AI agents get a feedback loop to
// self-correct generated code.

export type { DiagnoseOptions, Diagnostic, Severity } from "./diagnose.js";
export { diagnose, format } from "./diagnose.js";
