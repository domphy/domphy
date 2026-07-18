# @domphy/ui Changelog

## 0.1.9
- Initial release
## 0.1.11
- select patch use backgroundImage for arrow
## 0.1.13
- update core
- table
## 0.1.16
- chromametry palette
## 0.1.17
- selectable menu
## 0.1.20
- darkBias theme
## 0.18.22
- fix: `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker` (via `utils/floating.ts`) no longer lose outside-click/Escape dismissal after a reactive ancestor re-renders the trigger — migrated off a hand-rolled `WeakMap<Element, ...>` generation-eviction workaround onto `@domphy/core`'s new per-node `behavior()` contract (requires `@domphy/core` ^0.19.0)
## 0.18.23
- fix: republish — 0.18.22 was published with `npm publish`, which leaked the raw `workspace:^` protocol into the tarball's `dependencies`/`peerDependencies` (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` for every external consumer); publishing with `pnpm publish` rewrites them to real semver ranges. No code changes.
