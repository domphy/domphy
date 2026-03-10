<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Typography from "../../demos/patches/Typography.ts?raw"

</script>

# Typography

All text-level and block-level typography patches in one place. Apply each patch to the matching semantic HTML element.

<CodeEditor :code="Typography" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Patches

| Patch | Element | Description |
| --- | --- | --- |
| `heading()` | `h1`–`h6` | Scales font size and weight per heading level |
| `paragraph()` | `p` | Line height and spacing for body text |
| `link()` | `a` | Underline, color, and disabled state |
| `strong()` | `strong` | Bold inline emphasis |
| `emphasis()` | `em` | Italic inline emphasis |
| `small()` | `small` | Reduced font size for fine print |
| `subscript()` | `sub` | Lowered baseline text (e.g. H₂O) |
| `superscript()` | `sup` | Raised baseline text (e.g. x²) |
| `abbreviation()` | `abbr` | Dotted underline with tooltip via `title` |
| `mark()` | `mark` | Highlighted background |
| `code()` | `code` | Inline monospace code |
| `keyboard()` | `kbd` | Keyboard shortcut styling |
| `blockquote()` | `blockquote` | Indented quote block with accent border |
| `preformated()` | `pre` | Monospace preformatted block |
| `orderedList()` | `ol` | Numbered list |
| `unorderedList()` | `ul` | Bulleted list |
| `descriptionList()` | `dl` | Term/description pairs |

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


