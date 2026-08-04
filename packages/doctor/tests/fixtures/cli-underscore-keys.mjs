// A factory result carrying `_`-prefixed metadata (lifecycle hooks, behavior
// descriptors). The CLI must not invoke those functions as zero-arg factories
// — they expect a node/args and throw without them.
export function withBehavior() {
  return {
    div: "ok",
    _behaviors: {
      "my-behavior": {
        attach: (node, props) => {
          throw new Error(`attach needs a node, got ${node}/${props}`);
        },
      },
    },
    _onMount: (node) => node.setAttribute("x", "y"),
  };
}

// `_`-prefixed private exports are skipped too.
export const _private = () => {
  throw new Error("must not be invoked");
};
