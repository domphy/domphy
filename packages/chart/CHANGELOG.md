# @domphy/chart Changelog

## 0.3.0

- `option.title` / `option.legend` arrays keep every entry: each overlay group is stamped `data-index` so a later item no longer removes the previous `.dc-title` / `.dc-legend`.
- `chart()` host uses `overflow: visible` so the tooltip is not clipped; `tooltip.appendToBody` mounts the tooltip on `document.body` with `position: fixed`.

## 0.2.3

- Chart engine + Domphy `chart()` patch; theme-aware series colors.
- Visual catalog clip-path freeze workaround for motion-hidden plots.
- Honest unsupported surface: `custom` series, `toolbox`, and `brush` log a console warning (typed for ECharts interop, not rendered).

## 0.2.0

- Initial public canvas chart package (ECharts-compatible type surface).
