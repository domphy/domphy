import type { DomphyElement } from "@domphy/core";
import {
  routeError,
  routeLayout,
  routeLoading,
  routeNotFound,
  routePage,
} from "./lazy.js";
import type { RouteMatch } from "./matcher.js";
import type {
  ErrorBlock,
  NotFoundBlock,
  RouteContext,
  RouterStatus,
} from "./types.js";

export type SegmentStatus = "success" | "pending" | "error" | "notfound";

export interface SegmentResult {
  status: SegmentStatus;
  data?: unknown;
  error?: Error;
}

export interface BuildTreeInput {
  match: RouteMatch;
  baseContext: Omit<RouteContext, "data" | "segmentData">;
  results: SegmentResult[];
  retry: () => void;
  defaultError: ErrorBlock;
  defaultNotFound: NotFoundBlock;
  /** Rendered parallel-route slots per chain index, passed to that segment's layout. */
  slots?: Record<number, Record<string, DomphyElement>>;
}

export interface BuiltTree {
  element: DomphyElement;
  status: RouterStatus;
}

export function defaultErrorBlock(error: Error): DomphyElement {
  return {
    div: [{ h2: "Application error" }, { p: error.message }],
  };
}

export function defaultNotFoundBlock(): DomphyElement {
  return {
    div: [{ h2: "404" }, { p: "This page could not be found." }],
  };
}

function findBoundary(results: SegmentResult[], status: SegmentStatus): number {
  return results.findIndex((result) => result.status === status);
}

/**
 * Composes the matched chain into one element: page wrapped by every layout,
 * exactly like nested `layout.tsx` files. When a segment failed, is pending or
 * raised `notFound()`, the subtree below the nearest boundary block (`error`,
 * `loading`, `notFound`) is replaced by that block while ancestor layouts keep
 * rendering — the same boundary model as the Next.js App Router.
 */
export function buildTree(input: BuildTreeInput): BuiltTree {
  const { match, baseContext, results, retry, defaultError, defaultNotFound } =
    input;
  const { chain, chainIds } = match.route;

  const segmentData: Record<string, unknown> = {};
  for (let i = 0; i < chain.length; i++) {
    segmentData[chainIds[i]] = results[i]?.data;
  }
  const contexts: RouteContext[] = chain.map((_, i) => ({
    ...baseContext,
    data: results[i]?.data,
    segmentData,
  }));

  const errorIndex = findBoundary(results, "error");
  const notFoundIndex = findBoundary(results, "notfound");
  const pendingIndex = findBoundary(results, "pending");

  let inner: DomphyElement;
  let wrapLimit: number;
  let status: RouterStatus;

  if (errorIndex !== -1) {
    const blockIndex = nearestBlockIndex(chain, errorIndex, (route) =>
      Boolean(routeError(route)),
    );
    const block =
      blockIndex === -1
        ? defaultError
        : (routeError(chain[blockIndex]) as ErrorBlock);
    inner = block(results[errorIndex].error as Error, retry);
    inner._key = `${chainIds[Math.max(blockIndex, 0)]}:error`;
    wrapLimit = Math.min(blockIndex, errorIndex - 1);
    status = "error";
  } else if (notFoundIndex !== -1) {
    const blockIndex = nearestBlockIndex(chain, notFoundIndex, (route) =>
      Boolean(routeNotFound(route)),
    );
    const block =
      blockIndex === -1
        ? defaultNotFound
        : (routeNotFound(chain[blockIndex]) as NotFoundBlock);
    inner = block();
    inner._key = `${chainIds[Math.max(blockIndex, 0)]}:notfound`;
    wrapLimit = Math.min(blockIndex, notFoundIndex - 1);
    status = "notfound";
  } else if (pendingIndex !== -1) {
    const blockIndex = nearestBlockIndex(chain, pendingIndex, (route) =>
      Boolean(routeLoading(route)),
    );
    if (blockIndex === -1) {
      // No loading block anywhere: caller keeps the previous tree on screen.
      return { element: { div: "" }, status: "loading" };
    }
    inner = routeLoading(chain[blockIndex])!(contexts[blockIndex]);
    inner._key = `${chainIds[blockIndex]}:loading`;
    wrapLimit = Math.min(blockIndex, pendingIndex - 1);
    status = "loading";
  } else {
    const leaf = chain[chain.length - 1];
    const page = routePage(leaf);
    inner = page
      ? page(contexts[chain.length - 1])
      : ({ div: "" } as DomphyElement);
    inner._key = `${match.route.id}:page`;
    wrapLimit = chain.length - 1;
    status = "idle";
  }

  let element = inner;
  for (let i = wrapLimit; i >= 0; i--) {
    const layout = routeLayout(chain[i]);
    if (!layout) continue;
    element = layout(element, contexts[i], input.slots?.[i] ?? {});
    if (element._key === undefined) element._key = `${chainIds[i]}:layout`;
  }

  return { element, status };
}

function nearestBlockIndex(
  chain: BuildTreeInput["match"]["route"]["chain"],
  fromIndex: number,
  predicate: (
    route: BuildTreeInput["match"]["route"]["chain"][number],
  ) => boolean,
): number {
  for (let i = fromIndex; i >= 0; i--) {
    if (predicate(chain[i])) return i;
  }
  return -1;
}

/** Wraps a bare not-found block with the root layouts of a match-less render. */
export function buildNotFoundTree(block: NotFoundBlock): BuiltTree {
  const element = block();
  if (element._key === undefined) element._key = "app:notfound";
  return { element, status: "notfound" };
}
