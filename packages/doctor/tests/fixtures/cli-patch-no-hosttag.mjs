// A `$`-patch factory with NO @hostTag JSDoc — --merge-patches falls back to
// synthesizing a <div> host rather than leaving the patch unreachable.
function unlabeledPatch() {
  return { style: { color: "red" } };
}
export { unlabeledPatch };
