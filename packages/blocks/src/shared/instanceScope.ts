// Per-instance DOM id scoping for blocks.
//
// A block factory builds its whole tree eagerly, so any literal `id` it
// writes (and the matching `label[for]` / `aria-controls`) is shared by every
// mounted instance of that block. Two instances on one page then make
// `label[for]` resolve to the FIRST instance's control — axe-core reports it
// as `duplicate-id` / `duplicate-id-aria`.
//
// `_onSchedule` is the one point in a node's lifecycle where the node's
// `nodeId` already exists but its children have not been walked into
// ElementNodes yet, so children built there can read it. `@domphy/ui`'s
// `tabs()` / `menu()` / `popover()` patches derive their ids the same way.
// `nodeId` is a deterministic per-root counter (see `_idPrefix` / `liveRoots`
// in packages/core/src/classes/ElementNode.ts), so SSR and hydration agree —
// unlike `crypto.randomUUID()` / `Math.random()`.

import type { DomphyElement, ElementNode, PartialElement } from "@domphy/core";

/**
 * Replaces a host element's children at construction time with `build(nodeId)`,
 * so every id they emit is unique per mounted instance. Apply to the smallest
 * element that encloses all of the id-bearing content.
 *
 * Still declare the children eagerly with the un-scoped id: `@domphy/doctor`
 * walks the plain descriptor object and never runs `_onSchedule`, so a host
 * with `children: null` would hide its whole subtree from static analysis.
 *
 * ```ts
 * const buildRow = (inputId: string) => [
 *   { label: "Email", for: inputId, $: [label()] },
 *   { input: null, id: inputId, type: "email" },
 * ];
 * return {
 *   div: buildRow(id),
 *   ...instanceScoped((instanceId) => buildRow(`${id}-${instanceId}`)),
 * };
 * ```
 *
 * Keep the `name` attribute on the literal id — it is the form payload key,
 * not a DOM identity, and must stay stable across instances.
 */
export function instanceScoped(
  build: (instanceId: string) => (DomphyElement | string | number | null)[],
): PartialElement {
  return {
    _onSchedule: (node: ElementNode, rawElement: DomphyElement) => {
      (rawElement as Record<string, unknown>)[node.tagName] = build(
        node.nodeId,
      );
    },
  };
}
