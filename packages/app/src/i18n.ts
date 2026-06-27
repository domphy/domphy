import { redirect } from "./navigation.js";
import { rewrite } from "./navigation.js";
import type { LoaderContext, Middleware, MiddlewareContext, RouteContext } from "./types.js";

export interface I18nRoutingOptions<TLocale extends string> {
  /** All supported locales (e.g. `["en", "vi", "fr"]`). */
  locales: readonly TLocale[];
  /** Locale used when none is detected in the URL. */
  defaultLocale: TLocale;
  /**
   * Whether the default locale is included as a URL prefix.
   * - `false` (default) — `/about` renders as `defaultLocale`, `/vi/about` as `"vi"`.
   * - `true`  — every locale is prefixed; a bare `/about` redirects to `/<defaultLocale>/about`.
   */
  prefixDefault?: boolean;
}

/**
 * Creates a global middleware that handles locale-prefix routing, the equivalent
 * of Next.js built-in `i18n` config.
 *
 * - When a URL starts with a known locale segment (`/vi/about`), the segment is
 *   stripped and the request is rewritten to the bare path (`/about`), so your
 *   page routes don't need to know about locales.
 * - When `prefixDefault` is true and a URL has no locale prefix, the request is
 *   redirected to `/<defaultLocale><path>`.
 *
 * Pair with `getLocale()` in loaders / pages to read the active locale.
 *
 * @example
 * ```ts
 * import { createApp } from "@domphy/app"
 * import { createI18nMiddleware, getLocale } from "@domphy/app"
 *
 * const i18nOpts = { locales: ["en", "vi"] as const, defaultLocale: "en" }
 *
 * const app = createApp(routes, {
 *   middleware: [createI18nMiddleware(i18nOpts)],
 * })
 *
 * // in a loader:
 * const loader = (ctx) => {
 *   const locale = getLocale(ctx, i18nOpts)  // "en" | "vi"
 *   return fetch(`/api/content?lang=${locale}`)
 * }
 * ```
 */
export function createI18nMiddleware<TLocale extends string>(
  options: I18nRoutingOptions<TLocale>,
): Middleware {
  const { locales, defaultLocale, prefixDefault = false } = options;
  const localeSet = new Set<string>(locales);

  return ({ pathname }: MiddlewareContext) => {
    const parts = pathname.split("/").filter(Boolean);
    const first = parts[0];
    const hasLocalePrefix = first !== undefined && localeSet.has(first);

    if (hasLocalePrefix) {
      const rest = parts.slice(1).join("/");
      return rewrite(rest ? `/${rest}` : "/");
    }

    if (prefixDefault) {
      const suffix = pathname === "/" ? "" : pathname;
      redirect(`/${defaultLocale}${suffix}`);
    }
  };
}

/**
 * Reads the active locale from a loader or route context.
 *
 * Extracts the first URL path segment from the original URL (before any
 * middleware rewrites) and returns it if it matches a known locale, otherwise
 * returns `defaultLocale`. Works identically on the server and the client.
 *
 * Must be used with `createI18nMiddleware` using the same `options` object.
 */
export function getLocale<TLocale extends string>(
  context: Pick<LoaderContext | RouteContext, "url">,
  options: Pick<I18nRoutingOptions<TLocale>, "locales" | "defaultLocale">,
): TLocale {
  const { locales, defaultLocale } = options;
  const localeSet = new Set<string>(locales);
  const parts = context.url.split("/").filter(Boolean);
  const first = parts[0];
  if (first && localeSet.has(first)) return first as TLocale;
  return defaultLocale;
}
