# @domphy/core Changelog

## 0.19.3
- Types: `PartialElement` now includes optional `_doctorDisable` (`true | string | string[]`) so design-system patches can declare intentional doctor suppressions in TypeScript.

## 0.19.2
- fix `merge()`: no longer drop empty-string leaf values (`""`). Only `undefined`/`null` are skipped. Fixes decorative-image `alt: ""` and other valid empty HTML attributes being stripped during patch composition.

## 0.19.1
- Metadata only: fuller package description/keywords for npm. No runtime change.

## 0.1.5
- Initial release
## 0.1.7
- fix listener type
## 0.1.8
- move _notofier from AttributeList to ElementAttribute
## 0.19.0
- add `behavior(key, attach, props)` and `ElementNode.getBehavior(key)`: a per-node behavior contract (Svelte-action-like) for imperative state that must survive a reactive parent re-rendering a reused node — `attach` runs once per real DOM node, `update(props)` routes every later re-render's fresh props into that same instance, `destroy()` fires exactly once on removal
