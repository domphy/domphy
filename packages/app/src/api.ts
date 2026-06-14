import { compileRoutes, matchRoute } from "./matcher.js";
import { NotFoundSignal, RedirectSignal } from "./navigation.js";
import type { Params, Route } from "./types.js";

/**
 * API route handlers on web-standard Request/Response, the equivalent of
 * `route.ts` files. Works in Node 18+, Bun, Deno, and edge runtimes; adapt to
 * `http.createServer` with any Request/Response bridge.
 */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface ApiContext {
  params: Params;
}

export type ApiMethodHandler = (
  request: Request,
  context: ApiContext,
) => Response | Promise<Response>;

export interface ApiRoute {
  /** Same pattern syntax as page routes: `"/api/users/[id]"`. */
  path: string;
  GET?: ApiMethodHandler;
  POST?: ApiMethodHandler;
  PUT?: ApiMethodHandler;
  PATCH?: ApiMethodHandler;
  DELETE?: ApiMethodHandler;
  HEAD?: ApiMethodHandler;
  OPTIONS?: ApiMethodHandler;
}

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/** Shorthand for JSON responses, the equivalent of `NextResponse.json()`. */
export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function createApiHandler(
  routes: ApiRoute[],
): (request: Request) => Promise<Response> {
  const pairs = routes.map((apiRoute) => ({
    apiRoute,
    routeNode: { path: apiRoute.path, page: () => ({ div: "" }) } as Route,
  }));
  const compiled = compileRoutes(pairs.map((pair) => pair.routeNode));
  const byNode = new Map(pairs.map((pair) => [pair.routeNode, pair.apiRoute]));

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const match = matchRoute(compiled, url.pathname);
    if (!match) {
      return json({ error: "Not Found" }, { status: 404 });
    }

    const route = byNode.get(
      match.route.chain[match.route.chain.length - 1],
    ) as ApiRoute;
    const allowed = METHODS.filter((method) => route[method]);
    const method = request.method.toUpperCase() as HttpMethod;
    let handler = route[method];

    if (!handler && method === "HEAD" && route.GET) {
      handler = route.GET;
    }
    if (!handler && method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { allow: allowed.join(", ") },
      });
    }
    if (!handler) {
      return json(
        { error: "Method Not Allowed" },
        { status: 405, headers: { allow: allowed.join(", ") } },
      );
    }

    try {
      const response = await handler(request, { params: match.params });
      if (method === "HEAD") {
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof RedirectSignal) {
        return new Response(null, {
          status: error.permanent ? 308 : 307,
          headers: { location: error.to },
        });
      }
      if (error instanceof NotFoundSignal) {
        return json({ error: "Not Found" }, { status: 404 });
      }
      return json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
