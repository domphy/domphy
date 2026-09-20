<script setup lang="ts">

import Typography from "../../demos/patches/Typography.ts?raw"

</script>

# Typography

Index of the text-level and block-level typography patches. There is no `typography()` factory — apply the patch that matches the HTML tag.

## Patches

| Patch | Element | Description |
| --- | --- | --- |
| [`heading()`](/docs/ui/patches/heading) | `h1`–`h6` | Scales font size per heading level (`size` can skip the tag bump) |
| [`paragraph()`](/docs/ui/patches/paragraph) | `p` | Line height and spacing for body text |
| [`link()`](/docs/ui/patches/link) | `a` | Color, hover underline, and disabled state |
| [`strong()`](/docs/ui/patches/strong) | `strong` | Bold inline emphasis |
| [`emphasis()`](/docs/ui/patches/emphasis) | `em` | Italic inline emphasis |
| [`small()`](/docs/ui/patches/small) | `small` | Reduced font size for fine print |
| [`subscript()`](/docs/ui/patches/subscript) | `sub` | Lowered baseline text (e.g. H₂O) |
| [`superscript()`](/docs/ui/patches/superscript) | `sup` | Raised baseline text (e.g. x²) |
| [`abbreviation()`](/docs/ui/patches/abbreviation) | `abbr` | Dotted underline with tooltip via `title` |
| [`mark()`](/docs/ui/patches/mark) | `mark` | Highlighted background |
| [`code()`](/docs/ui/patches/code) | `code` | Inline monospace code |
| [`keyboard()`](/docs/ui/patches/keyboard) | `kbd` | Keyboard shortcut styling |
| [`blockquote()`](/docs/ui/patches/blockquote) | `blockquote` | Indented quote block with accent left edge |
| [`preformated()`](/docs/ui/patches/preformated) | `pre` | Monospace preformatted block |
| [`orderedList()`](/docs/ui/patches/ordered-list) | `ol` | Numbered list |
| [`unorderedList()`](/docs/ui/patches/unordered-list) | `ul` | Bulleted list |
| [`descriptionList()`](/docs/ui/patches/description-list) | `dl` | Term/description pairs |

<CodeEditor :code="Typography" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/heading.ts [heading]
<<< ../../../../../packages/ui/src/patches/paragraph.ts [paragraph]
<<< ../../../../../packages/ui/src/patches/link.ts [link]
<<< ../../../../../packages/ui/src/patches/strong.ts [strong]
<<< ../../../../../packages/ui/src/patches/emphasis.ts [emphasis]
<<< ../../../../../packages/ui/src/patches/small.ts [small]
<<< ../../../../../packages/ui/src/patches/subscript.ts [subscript]
<<< ../../../../../packages/ui/src/patches/superscript.ts [superscript]
<<< ../../../../../packages/ui/src/patches/abbreviation.ts [abbreviation]
<<< ../../../../../packages/ui/src/patches/mark.ts [mark]
<<< ../../../../../packages/ui/src/patches/code.ts [code]
<<< ../../../../../packages/ui/src/patches/keyboard.ts [keyboard]
<<< ../../../../../packages/ui/src/patches/blockquote.ts [blockquote]
<<< ../../../../../packages/ui/src/patches/preformated.ts [preformated]
<<< ../../../../../packages/ui/src/patches/orderedList.ts [orderedList]
<<< ../../../../../packages/ui/src/patches/unorderedList.ts [unorderedList]
<<< ../../../../../packages/ui/src/patches/descriptionList.ts [descriptionList]
:::


