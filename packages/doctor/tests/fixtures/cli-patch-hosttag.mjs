// A `$`-patch factory with the @hostTag JSDoc convention packages/ui/src
// patches use. --merge-patches should synthesize a <button> around this
// PartialElement and analyze it for real, instead of descending into its
// style object as a plain container (where "red" is a leaf no rule ever sees).
/**
 * @hostTag button
 */
function coolButton() {
  return { style: { color: "red" } };
}
export { coolButton };
