---
title: "@domphy/blocks — notch"
description: "Cross-group exclusivity, outside-click/Escape dismissal and per-panel positioning are hand-rolled against a single openGroupId State rather than the popover()..."
---

# notch

<script setup lang="ts">
import NotchDemo from "../demos/blocks/notch.ts?raw"
</script>

A **Navigation** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `notch()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="NotchDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `groups` | `NotchGroup[]` | Group definitions. Defaults to a 3-group display/sound/network demo. |
| `selected` | `RecordState&lt;Record&lt;string, string&gt;&gt;` | Controlled selection map (groupId -&gt; optionId). Pass your own `RecordState` to read/drive it externally. |
| `defaultSelected` | `Record&lt;string, string&gt;` | Initial per-group selection for the uncontrolled case. Falls back to each group's first option. |
| `position` | `NotchPosition` | Which viewport edge the bar is pinned against — also flips which way panels open. Defaults to "top". |
| `align` | `NotchAlign` | Horizontal alignment along the pinned edge. Defaults to "center". |
| `offsetUnits` | `number` | Distance from the pinned edge, in `themeSpacing` units. Defaults to 4 (~16px). |
| `accentColor` | `ThemeColor` | Accent color for the selected-option highlight. Defaults to "primary". |
| `showDividers` | `boolean` | Toggles the dotted dividers between groups. Defaults to true. |
| `closeOnSelect` | `boolean` | Whether picking an option closes its panel automatically. Defaults to true. |
| `onChange` | `(groupId: string, optionId: string) =&gt; void` | Fired on any group's selection change, after that group's own `onChange`. |
| `animateOnMount` | `ValueOrState&lt;boolean&gt;` | Plays a slide+fade mount entrance animation. Defaults to true. |

::: details Implementation notes
Cross-group exclusivity, outside-click/Escape dismissal and per-panel positioning are hand-rolled against a single openGroupId State rather than the popover() ui patch, because popover() owns its open/close lifecycle internally and doesn't expose a way to force-close one group's panel from a sibling group's click handler. The 'shared-position sliding highlight' is approximated with a highlight bar whose transform is computed from the selected option's row index * a fixed row height (no DOM measurement/FLIP, no floating-ui). Mount entrance animation uses the motion() patch. Exact easing/timing values follow the spec's own low-confidence guidance (~150-250ms ease-out); default offset (themeSpacing(4) ~ 16px) and accent color (primary) match the spec's documented defaults.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/notch)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/notch.ts [notch]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
