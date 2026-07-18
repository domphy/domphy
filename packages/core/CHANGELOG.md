# @domphy/core Changelog

## 0.1.5
- Initial release
## 0.1.7
- fix listener type
## 0.1.8
- move _notofier from AttributeList to ElementAttribute
## 0.19.0
- add `behavior(key, attach, props)` and `ElementNode.getBehavior(key)`: a per-node behavior contract (Svelte-action-like) for imperative state that must survive a reactive parent re-rendering a reused node — `attach` runs once per real DOM node, `update(props)` routes every later re-render's fresh props into that same instance, `destroy()` fires exactly once on removal
