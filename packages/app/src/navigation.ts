import type { RewriteResult } from "./types.js";

/**
 * Control-flow signals, the equivalents of `redirect()`, `permanentRedirect()` and
 * `notFound()` from `next/navigation`. They throw and are caught by the router
 * (or by `renderToString` on the server), so they can be called from loaders,
 * metadata functions and middleware.
 */

/**
 * A `Location` value is an ASCII URI-reference (RFC 9110 §10.2.2), so a target
 * built from unvalidated input has to be made one. CR/LF/NUL would start a
 * second header field; a character above U+00FF makes `new Headers()` throw
 * (`ByteString` conversion) out of the API route's catch block, and a Latin-1
 * one is written as a raw byte the client decodes as latin-1. Percent-encoding
 * the UTF-8 bytes of everything above U+007F covers both — and unlike
 * `encodeURI` it never throws on a lone surrogate, which `TextEncoder`
 * substitutes with U+FFFD.
 */
function toLocationValue(to: string): string {
  const encodeRun = (run: string): string =>
    Array.from(
      new TextEncoder().encode(run),
      (byte) => `%${byte.toString(16).toUpperCase()}`,
    ).join("");
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping CR/LF/NUL is the point
  return to.replace(/[\r\n\0]/g, "").replace(/[^\u0000-\u007f]+/g, encodeRun);
}

export class RedirectSignal extends Error {
  readonly to: string;
  readonly permanent: boolean;

  constructor(to: string, permanent: boolean) {
    // Sanitized here, the single choke point every consumer routes through
    // (API routes, renderToString, renderToStream, client navigation).
    const target = toLocationValue(to);
    super(`Redirect to ${target}`);
    this.name = "RedirectSignal";
    this.to = target;
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
