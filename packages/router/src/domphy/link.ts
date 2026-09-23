// Headless port of @tanstack/react-router's `useLinkProps` click/href logic
// (packages/react-router/src/link.tsx, `resolveExternalLink` + `getHrefOption`
// + `handleClick` + the `linkDisabled` half of `applyLinkState`, pinned
// 1.170.38 — the release that depends on the ported router-core 1.171.32).
// Upstream ships this behind a React `<Link>` component; Domphy has no
// component layer, so it ships as a plain props builder the caller spreads
// into an `{ a: ... }` element. No @domphy/core dependency.
import { getUrlScheme, isDangerousProtocol } from '../utils'
import type { NavigateOptions } from '../link'
import type { AnyRouter, RegisteredRouter } from '../router'

export interface LinkProps {
  /**
   * The real, crawlable href. Absent when the link is `disabled`, or when the
   * destination resolved to a URL whose protocol is outside
   * `router.protocolAllowlist` — the anchor is then deliberately not navigable.
   */
  href?: string
  /**
   * Present only for same-document destinations; external links navigate
   * natively and disabled links do not navigate at all.
   */
  onClick?: (event: MouseEvent) => void
  target?: string
  role?: string
  ariaDisabled?: boolean
}

/**
 * Upstream's `linkDisabled` props: an anchor that is announced as a link but
 * cannot be followed. Rendered when `disabled` is set and when the destination
 * resolves to a protocol outside `router.protocolAllowlist`. A fresh object
 * per call — the result is a public value the caller may write to.
 */
const inertLink = (): LinkProps => ({ role: 'link', ariaDisabled: true })

function blocked(href: string): LinkProps {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Blocked Link with dangerous protocol: ${href}`)
  }
  return inertLink()
}

/**
 * Builds the `href` + `onClick` pair for an anchor that navigates through the
 * router.
 *
 * The click handler defers to the browser exactly where upstream's `<Link>`
 * does — modifier-click (ctrl/cmd/shift/alt), non-primary button, an already
 * prevented event, or a `target` other than `_self` — so "open in new tab",
 * "download linked file" and friends keep working. Everything else is
 * intercepted and routed client-side.
 *
 * @example
 * ```ts
 * const link = (to: string, label: string): DomphyElement<"a"> => ({
 *   a: label,
 *   ...linkProps(router, { to }),
 * })
 * ```
 */
export function linkProps<
  TRouter extends AnyRouter = RegisteredRouter,
  const TFrom extends string = string,
  const TTo extends string | undefined = undefined,
  const TMaskFrom extends string = TFrom,
  const TMaskTo extends string = '',
>(
  router: TRouter,
  options: NavigateOptions<TRouter, TFrom, TTo, TMaskFrom, TMaskTo> & {
    /** Mirrors the anchor's `target` attribute; anything but `_self` is left to the browser. */
    target?: string
    /** Renders an inert `role="link" aria-disabled` anchor with no href, as upstream's `<Link disabled>` does. */
    disabled?: boolean
  },
): LinkProps {
  const { target, disabled, ...navigateOptions } = options
  const withTarget = <T extends LinkProps>(props: T): T =>
    target === undefined ? props : { ...props, target }

  // Upstream `getHrefOption` returns undefined when disabled, so the anchor
  // renders no href; `handleClick` is gated on `!disabled` too.
  if (disabled) {
    return withTarget(inertLink())
  }

  // Upstream `resolveExternalLink`, checked before `buildLocation`: a `to` that
  // carries its own URL scheme is the browser's to navigate, and passing it
  // through `buildLocation` would resolve it as a path segment instead.
  const to = navigateOptions.to
  if (typeof to === 'string') {
    const directScheme = getUrlScheme(to)
    if (directScheme) {
      return router.protocolAllowlist.has(directScheme)
        ? withTarget({ href: to })
        : withTarget(blocked(to))
    }
  }

  // Upstream `getHrefOption`. A rewrite that moved the destination off-origin
  // must bypass history's relative-path formatting.
  const next = router.buildLocation(navigateOptions as never)
  const displayed = next.maskedLocation ?? next
  const href = displayed.external
    ? displayed.publicHref
    : router.history.createHref(displayed.publicHref) || '/'

  if (
    (displayed.external || href !== displayed.publicHref) &&
    isDangerousProtocol(href, router.protocolAllowlist)
  ) {
    return withTarget(blocked(href))
  }

  // Upstream treats any href carrying a URL scheme as an external link and
  // returns before attaching a click handler, so the browser navigates.
  if (displayed.external || getUrlScheme(href)) {
    return withTarget({ href })
  }

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) {
      return
    }
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return
    }
    // The attribute is the fallback for callers that set `target` on the
    // element rather than passing it here.
    const elementTarget =
      target ??
      (event.currentTarget as Element | null)?.getAttribute?.('target') ??
      undefined
    if (elementTarget && elementTarget !== '_self') {
      return
    }
    event.preventDefault()
    void router.navigate(navigateOptions as never)
  }

  return withTarget({ href, onClick })
}
