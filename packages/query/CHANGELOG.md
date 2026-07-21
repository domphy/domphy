# @domphy/query Changelog

## 0.18.1

- Domphy adapter: `throwOnError` now throws on **reactive** field reads (with a listener), matching TanStack React Query's render-time throw so `_onError` / `errorBoundary()` can catch query failures. Imperative reads without a listener never throw.

## 0.2.0
- Initial release: 1-1 port of @tanstack/query-core v5.90.20
