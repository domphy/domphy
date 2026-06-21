import type { DomphyElement, PartialElement } from "@domphy/core";

/**
 * Catches errors thrown inside reactive child expressions and renders a
 * fallback element instead of crashing the whole tree. Apply to any container.
 *
 * Only errors in *reactive* children (functions returning element arrays) are
 * caught. Errors during static construction propagate normally — those are
 * programming errors, not runtime data errors.
 *
 * @hostTag any
 * @param props.fallback - Fallback element or factory `(error, reset) => element`. Defaults to a plain error message div.
 * @param props.onError - Optional callback for logging/telemetry.
 * @example { div: (l) => renderUserContent(l), $: [errorBoundary({ fallback: { p: "Something went wrong." } })] }
 */
function errorBoundary(
  props: {
    fallback?:
      | DomphyElement
      | ((error: unknown, reset: () => void) => DomphyElement);
    onError?: (error: unknown) => void;
  } = {},
): PartialElement {
  return {
    _onError: (node, error, reset) => {
      props.onError?.(error);
      const fallbackEl =
        typeof props.fallback === "function"
          ? props.fallback(error, reset)
          : (props.fallback ??
            ({ div: "An error occurred." } as DomphyElement));
      node.children.update([fallbackEl]);
    },
  };
}

export { errorBoundary };
