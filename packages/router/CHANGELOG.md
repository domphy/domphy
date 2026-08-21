# @domphy/router

## 0.18.3

- `MatchSupersededError` sentinel; SWR redirect abort when location is superseded; extra SSR/redirect tests.

## 0.18.2

- Security: `isDangerousProtocol` treats protocol-relative URLs (`//host`) and scheme-like URL-ctor failures as dangerous. `redirect()` no longer emits raw `//host` or `javascript:` `Location` headers; SSR header merge drops them too.
- Fix: SWR background loader redirects abort when `latestLocation` has been superseded (same identity check as `RouterCore.load()`).

## 0.18.1

- Tests: SSR server surface (`createRequestHandler`) smoke coverage for production request → load → Response path. Changelog

## 0.1.0
- Initial release: 1-1 port of @tanstack/router-core v1.171.13
- Port additions: `@tanstack/history` re-export, Domphy adapter (`createRouter`, `createRoute`, `createRootRoute`, `createRootRouteWithContext`, `createRouteMask`, `getRouteApi`) with a headless transitioner replacing upstream's React `<Transitioner>`
