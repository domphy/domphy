// Static export with _onInit — Layer 4 `new ElementNode` runs that hook.
// --no-factory-exec must not execute it. `bad` keeps Layer 1–3 in play so
// the flag is shown to skip Init, not diagnose() itself.
export const bad = { input: "oops" };
export const withInit = {
  div: "hello",
  _onInit() {
    process.stdout.write("INIT_RAN\n");
  },
};
