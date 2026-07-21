# @domphy/router

## 0.18.1

- Tests: SSR server surface (`createRequestHandler`) smoke coverage for production request → load → Response path. Changelog

## 0.1.0
- Initial release: 1-1 port of @tanstack/router-core v1.171.13
- Port additions: `@tanstack/history` re-export, Domphy adapter (`createRouter`, `createRoute`, `createRootRoute`, `createRootRouteWithContext`, `createRouteMask`, `getRouteApi`) with a headless transitioner replacing upstream's React `<Transitioner>`
