// A factory that throws when invoked with no arguments — reported as a
// warning diagnostic for the file, not silently dropped.
export const el = { div: "hello" };
export const needsArgs = () => {
  throw new Error("needs-args");
};
