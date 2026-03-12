# Dimension

This page groups the main patch size families.

It is a working guide for the UI layer, separate from the deeper theory in `@domphy/theme`. The goal here is practical classification: which patches share the same visual height model, and where the boundaries stop being obvious.

All dimension values are spacing units (`U`).

- base unit: `U = fontSize / 4`
- text lines: `n = number of intrinsic text lines` inside the element
- wrapping level: `w = structural wrapping level` of the element boundary
- density factor: `d = themeDensity(listener)`
- theme base density: `d = 1.5`
- `paddingBlock = d * w * U`
- `paddingInline = ceil(3 / w) * d * w * U` for `w >= 1`
- `paddingInline = 2dU` for bounded inline `w = 0`; otherwise `0`
- `radius = paddingBlock = d * w * U`
- `height = (n * 6 + 2 * d * w) * U`

The table below shows the resulting height for each patch family at the default density factor `d = 1.5`. Every numeric cell is a final height in `U` or `px`. Rows with `n/a` are not height-defined by this formula. Multi-part or behavior-first patches such as [Card](/docs/ui/patches/card), [Command](/docs/ui/patches/command), [Input OTP](/docs/ui/patches/input-otp), [Splitter](/docs/ui/patches/splitter), [Toggle](/docs/ui/patches/toggle), and `toggleGroup()` are documented on their own pages.

Density levels: `[0.75, 1, 1.5, 2, 2.5]`

| Patch family | Height |
| --- | --- |
| (Separators) [Horizontal Rule](/docs/ui/patches/horizontal-rule) | 1px |
| [Progress](/docs/ui/patches/progress), [Popover Arrow](/docs/ui/patches/popover-arrow) | 2U |
| [Input Checkbox](/docs/ui/patches/input-checkbox), [Input Radio](/docs/ui/patches/input-radio), [Input Range](/docs/ui/patches/input-range), [Input Switch](/docs/ui/patches/input-switch) | 4U |
| [Code](/docs/ui/patches/code), [Keyboard](/docs/ui/patches/keyboard), [Mark](/docs/ui/patches/mark), [Abbreviation](/docs/ui/patches/abbreviation), [Badge](/docs/ui/patches/badge), [Breadcrumb Ellipsis](/docs/ui/patches/breadcrumb), [Button Switch](/docs/ui/patches/button-switch), [Divider](/docs/ui/patches/divider), [Emphasis](/docs/ui/patches/emphasis), [Heading](/docs/ui/patches/heading), [Icon](/docs/ui/patches/icon), [Label](/docs/ui/patches/label), [Link](/docs/ui/patches/link), [Small](/docs/ui/patches/small), [Spinner](/docs/ui/patches/spinner), [Strong](/docs/ui/patches/strong), [Subscript](/docs/ui/patches/subscript), [Superscript](/docs/ui/patches/superscript), [Tag](/docs/ui/patches/tag), [Skeleton](/docs/ui/patches/skeleton), [Toggle](/docs/ui/patches/toggle) | 6U |
| [Breadcrumb](/docs/ui/patches/breadcrumb), [Ordered List](/docs/ui/patches/ordered-list), [Paragraph](/docs/ui/patches/paragraph), [Unordered List](/docs/ui/patches/unordered-list), [Description List](/docs/ui/patches/description-list) | 6nU |
| [Avatar](/docs/ui/patches/avatar), [Button](/docs/ui/patches/button), [Combobox](/docs/ui/patches/combobox), [Input Color](/docs/ui/patches/input-color), [Input Date Time](/docs/ui/patches/input-date-time), [Input File](/docs/ui/patches/input-file), [Input Number](/docs/ui/patches/input-number), [Input Search](/docs/ui/patches/input-search), [Input Text](/docs/ui/patches/input-text), [Menu Item](/docs/ui/patches/menu), [Pagination](/docs/ui/patches/pagination), [Select](/docs/ui/patches/select), [Select Box](/docs/ui/patches/select-box), [Select Item](/docs/ui/patches/select-list), [Select List](/docs/ui/patches/select-list), [Tab](/docs/ui/patches/tabs), [Tooltip](/docs/ui/patches/tooltip) | 9U |
| [Table](/docs/ui/patches/table) | 9nU |
| [Alert](/docs/ui/patches/alert), [Blockquote](/docs/ui/patches/blockquote), [Details](/docs/ui/patches/details), [Figure](/docs/ui/patches/figure), [Image](/docs/ui/patches/image), [Popover](/docs/ui/patches/popover), [Preformated](/docs/ui/patches/preformated), [Tabs](/docs/ui/patches/tabs), [Textarea](/docs/ui/patches/textarea), [Toast](/docs/ui/patches/toast) | `(6n + 6)U` |
| (Layout Regions) [Dialog](/docs/ui/patches/dialog), [Drawer](/docs/ui/patches/drawer), [Form Group](/docs/ui/patches/form-group), [Menu](/docs/ui/patches/menu), [Tab Panel](/docs/ui/patches/tabs) | n/a |
| (Behavior) `field()`, [Form](/docs/ui/patches/form), [TransitionGroup](/docs/ui/patches/transition-group) | n/a |

The formula applies to elements at or above the `6U` baseline, the height of one body text line. The table uses the current theme base density at `d = 1.5`. Elements intentionally sized below this baseline follow a proportional sub-scale of `2U / 4U / 6U`, so they stay fixed across density levels unless their own patch defines another rule.

This page can evolve as the UI principles get refined. For the underlying tone and size theory, see [Theme Theory](/docs/theme/size) and [Theme Tone](/docs/theme/tone).
