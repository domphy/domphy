import type { DomphyElement, ElementNode, PartialElement } from "@domphy/core";

const ORIGINAL_CHILDREN = "errorBoundaryOriginal";

function restoreOriginalChildren(node: ElementNode): void {
  const original = node.getMetadata(ORIGINAL_CHILDREN);
  if (typeof original === "function") {
    node._childrenRelease?.();
    node._setupFunctionChildren(original);
    return;
  }
  if (original != null) {
    node.children.update(Array.isArray(original) ? original : [original]);
    return;
  }
  node.children.update([]);
}

/**
 * Catches errors thrown inside reactive child expressions and renders a
 * fallback element instead of crashing the whole tree. Apply to any container.
 *
 * Only errors in *reactive* children (functions returning element arrays) are
 * caught. Errors during static construction propagate normally — those are
 * programming errors, not runtime data errors.
 *
 * `reset()` restores the original children (including a reactive children
 * function) so the next evaluation runs again — it does not leave the host
 * empty.
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
    _onSchedule: (node, element) => {
      if (node.getMetadata(ORIGINAL_CHILDREN) !== undefined) return;
      node.setMetadata(
        ORIGINAL_CHILDREN,
        (element as Record<string, unknown>)[node.tagName],
      );
    },
    _onError: (node, error) => {
      props.onError?.(error);
      const reset = () => restoreOriginalChildren(node);
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
