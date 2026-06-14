import type { Params, Route } from "./types.js";

export type SegmentKind =
  | "static"
  | "dynamic"
  | "catchall"
  | "optional-catchall"
  | "group";

export interface PatternSegment {
  kind: SegmentKind;
  /** Literal value for static segments, param name otherwise. */
  value: string;
}

/** One routable endpoint: the chain of route nodes from root to the segment that owns the page. */
export interface CompiledRoute {
  /** Stable id, the full pattern path including groups, e.g. "/(shop)/products/[id]". */
  id: string;
  /** URL pattern segments, groups excluded. */
  segments: PatternSegment[];
  /** Route nodes from root to leaf. */
  chain: Route[];
  /** Segment id for each chain node, used as data cache key and diff key. */
  chainIds: string[];
}

export interface RouteMatch {
  route: CompiledRoute;
  params: Params;
  pathname: string;
}

export function parseSegment(part: string): PatternSegment {
  if (part.startsWith("(") && part.endsWith(")")) {
    return { kind: "group", value: part.slice(1, -1) };
  }
  if (part.startsWith("[[...") && part.endsWith("]]")) {
    return { kind: "optional-catchall", value: part.slice(5, -2) };
  }
  if (part.startsWith("[...") && part.endsWith("]")) {
    return { kind: "catchall", value: part.slice(4, -1) };
  }
  if (part.startsWith("[") && part.endsWith("]")) {
    return { kind: "dynamic", value: part.slice(1, -1) };
  }
  return { kind: "static", value: part };
}

export function splitPath(path: string): string[] {
  return path.split("/").filter((part) => part.length > 0);
}

/** Number of URL parts a route path contributes (route groups don't count). */
export function urlPartCount(path: string): number {
  return splitPath(path)
    .map(parseSegment)
    .filter((segment) => segment.kind !== "group").length;
}

/** Matches `pathname` after dropping the first `prefixParts` URL parts (slot/intercept matching). */
export function matchRouteSuffix(
  compiled: CompiledRoute[],
  pathname: string,
  prefixParts: number,
): RouteMatch | null {
  const suffix = `/${splitPath(pathname).slice(prefixParts).join("/")}`;
  return matchRoute(compiled, suffix);
}

/** Flattens a route tree into a list of routable endpoints. */
export function compileRoutes(routes: Route[]): CompiledRoute[] {
  const compiled: CompiledRoute[] = [];

  function walk(
    nodes: Route[],
    parentSegments: PatternSegment[],
    parentChain: Route[],
    parentChainIds: string[],
    parentId: string,
  ): void {
    for (const node of nodes) {
      const parts = splitPath(node.path);
      const ownSegments = parts.map(parseSegment);
      const urlSegments = [
        ...parentSegments,
        ...ownSegments.filter((segment) => segment.kind !== "group"),
      ];
      const id = `${parentId}/${parts.join("/")}`.replace(/\/+/g, "/");
      const chain = [...parentChain, node];
      const chainIds = [...parentChainIds, id === "" ? "/" : id];

      if (node.page || node.redirect) {
        compiled.push({
          id: id === "" ? "/" : id,
          segments: urlSegments,
          chain,
          chainIds,
        });
      }
      if (node.children) {
        walk(node.children, urlSegments, chain, chainIds, id);
      }
    }
  }

  walk(routes, [], [], [], "");
  compiled.sort(compareSpecificity);
  return compiled;
}

const KIND_RANK: Record<SegmentKind, number> = {
  static: 0,
  dynamic: 1,
  catchall: 2,
  "optional-catchall": 3,
  group: 0,
};

/** Static segments win over dynamic, dynamic over catch-all — same priority order as Next.js. */
export function compareSpecificity(a: CompiledRoute, b: CompiledRoute): number {
  const length = Math.max(a.segments.length, b.segments.length);
  for (let i = 0; i < length; i++) {
    const segmentA = a.segments[i];
    const segmentB = b.segments[i];
    if (!segmentA) return -1;
    if (!segmentB) return 1;
    const rankDifference = KIND_RANK[segmentA.kind] - KIND_RANK[segmentB.kind];
    if (rankDifference !== 0) return rankDifference;
  }
  return 0;
}

export function matchPath(
  segments: PatternSegment[],
  pathname: string,
): Params | null {
  const parts = splitPath(pathname).map((part) => decodeURIComponent(part));
  const params: Params = {};
  let partIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (segment.kind === "static") {
      if (parts[partIndex] !== segment.value) return null;
      partIndex++;
      continue;
    }
    if (segment.kind === "dynamic") {
      if (partIndex >= parts.length) return null;
      params[segment.value] = parts[partIndex];
      partIndex++;
      continue;
    }
    if (segment.kind === "catchall") {
      if (!isLast || partIndex >= parts.length) return null;
      params[segment.value] = parts.slice(partIndex);
      return params;
    }
    if (segment.kind === "optional-catchall") {
      if (!isLast) return null;
      params[segment.value] = parts.slice(partIndex);
      return params;
    }
  }

  if (partIndex !== parts.length) return null;
  return params;
}

export function matchRoute(
  compiled: CompiledRoute[],
  pathname: string,
): RouteMatch | null {
  for (const route of compiled) {
    const params = matchPath(route.segments, pathname);
    if (params) {
      return { route, params, pathname };
    }
  }
  return null;
}

/** Replaces pattern placeholders with params, the inverse of `matchPath`. */
export function buildHref(pattern: string, params: Params = {}): string {
  const parts = splitPath(pattern)
    .map(parseSegment)
    .filter((segment) => segment.kind !== "group")
    .flatMap((segment) => {
      if (segment.kind === "static") return [segment.value];
      const value = params[segment.value];
      if (value === undefined) {
        if (segment.kind === "optional-catchall") return [];
        throw new Error(
          `Missing param "${segment.value}" for pattern "${pattern}".`,
        );
      }
      const list = Array.isArray(value) ? value : [value];
      return list.map((part) => encodeURIComponent(part));
    });
  return `/${parts.join("/")}`;
}
