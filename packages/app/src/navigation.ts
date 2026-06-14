import type { RewriteResult } from "./types.js";

/**
 * Control-flow signals, the equivalents of `redirect()`, `permanentRedirect()` and
 * `notFound()` from `next/navigation`. They throw and are caught by the router
 * (or by `renderToString` on the server), so they can be called from loaders,
 * metadata functions and middleware.
 */

export class RedirectSignal extends Error {
  readonly to: string;
  readonly permanent: boolean;

  constructor(to: string, permanent: boolean) {
    super(`Redirect to ${to}`);
    this.name = "RedirectSignal";
    this.to = to;
    this.permanent = permanent;
  }
}

export class NotFoundSignal extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundSignal";
  }
}

export function redirect(to: string): never {
  throw new RedirectSignal(to, false);
}

export function permanentRedirect(to: string): never {
  throw new RedirectSignal(to, true);
}

export function notFound(): never {
  throw new NotFoundSignal();
}

/** Returned from middleware to render another route while keeping the URL. */
export function rewrite(to: string): RewriteResult {
  return { __domphyRewrite: to };
}

export function isRewrite(value: unknown): value is RewriteResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RewriteResult).__domphyRewrite === "string"
  );
}
