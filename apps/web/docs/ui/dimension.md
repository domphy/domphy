# Dimension

This page groups the main patch size families.

It is a working guide for the UI layer, separate from the deeper theory in `@domphy/theme`. The goal here is practical classification: which patches share the same visual height model, and where the boundaries stop being obvious.

All dimension values are spacing units (`U`).

- base unit: `U = fontSize / 4`
- base formula: `Height = NLines × 6 + 2 × WrappingLevel`

The table below covers the main size families. Multi-part or behavior-first patches such as [Card](/docs/ui/patches/card), [Command](/docs/ui/patches/command), [Input OTP](/docs/ui/patches/input-otp), [Splitter](/docs/ui/patches/splitter), [Toggle](/docs/ui/patches/toggle), and `toggleGroup()` are documented on their own pages.

| Height | Patches |
| --- | --- |
| 1px | (Separators) [Horizontal Rule](/docs/ui/patches/horizontal-rule) |
| 2U | [Progress](/docs/ui/patches/progress), [Popover Arrow](/docs/ui/patches/popover-arrow) |
| 4U | [Input Checkbox](/docs/ui/patches/input-checkbox), [Input Radio](/docs/ui/patches/input-radio), [Input Range](/docs/ui/patches/input-range), [Input Switch](/docs/ui/patches/input-switch) |
| 6U | [Code](/docs/ui/patches/code), [Keyboard](/docs/ui/patches/keyboard), [Mark](/docs/ui/patches/mark), [Abbreviation](/docs/ui/patches/abbreviation), [Badge](/docs/ui/patches/badge), [Breadcrumb Ellipsis](/docs/ui/patches/breadcrumb), [Emphasis](/docs/ui/patches/emphasis), [Heading](/docs/ui/patches/heading), [Icon](/docs/ui/patches/icon), [Label](/docs/ui/patches/label), [Link](/docs/ui/patches/link), [Small](/docs/ui/patches/small), [Spinner](/docs/ui/patches/spinner), [Strong](/docs/ui/patches/strong), [Subscript](/docs/ui/patches/subscript), [Superscript](/docs/ui/patches/superscript), [Tag](/docs/ui/patches/tag), [Skeleton](/docs/ui/patches/skeleton), [Toggle](/docs/ui/patches/toggle) |
| 6n U | [Breadcrumb](/docs/ui/patches/breadcrumb), [Ordered List](/docs/ui/patches/ordered-list), [Paragraph](/docs/ui/patches/paragraph), [Unordered List](/docs/ui/patches/unordered-list), [Description List](/docs/ui/patches/description-list) |
| 8U | [Avatar](/docs/ui/patches/avatar), [Button](/docs/ui/patches/button), [Button Switch](/docs/ui/patches/button-switch), [Combobox](/docs/ui/patches/combobox), [Divider](/docs/ui/patches/divider), [Input Color](/docs/ui/patches/input-color), [Input Date Time](/docs/ui/patches/input-date-time), [Input File](/docs/ui/patches/input-file), [Input Number](/docs/ui/patches/input-number), [Input Search](/docs/ui/patches/input-search), [Input Text](/docs/ui/patches/input-text), [Menu Item](/docs/ui/patches/menu), [Pagination](/docs/ui/patches/pagination), [Select](/docs/ui/patches/select), [Select Box](/docs/ui/patches/select-box), [Select Item](/docs/ui/patches/select-list), [Select List](/docs/ui/patches/select-list), [Tab](/docs/ui/patches/tabs), [Tooltip](/docs/ui/patches/tooltip) |
| 8n U | [Table](/docs/ui/patches/table) |
| (6n+4) U | [Alert](/docs/ui/patches/alert), [Blockquote](/docs/ui/patches/blockquote), [Details](/docs/ui/patches/details), [Figure](/docs/ui/patches/figure), [Image](/docs/ui/patches/image), [Popover](/docs/ui/patches/popover), [Preformated](/docs/ui/patches/preformated), [Tabs](/docs/ui/patches/tabs), [Textarea](/docs/ui/patches/textarea), [Toast](/docs/ui/patches/toast) |
| — | (Layout Regions) [Dialog](/docs/ui/patches/dialog), [Drawer](/docs/ui/patches/drawer), [Form Group](/docs/ui/patches/form-group), [Menu](/docs/ui/patches/menu), [Tab Panel](/docs/ui/patches/tabs) |
| — | (Behavior) [TransitionGroup](/docs/ui/patches/transition-group) |

The formula applies to elements at or above the `6U` baseline, the height of one body text line. Elements intentionally sized below this baseline follow a proportional sub-scale of `2U / 4U / 6U`.

This page can evolve as the UI principles get refined. For the underlying tone and size theory, see [Theme Theory](/docs/theme/size) and [Theme Tone](/docs/theme/tone).
