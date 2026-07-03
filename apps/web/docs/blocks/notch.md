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

::: details Implementation notes
Cross-group exclusivity, outside-click/Escape dismissal and per-panel positioning are hand-rolled against a single openGroupId State rather than the popover() ui patch, because popover() owns its open/close lifecycle internally and doesn't expose a way to force-close one group's panel from a sibling group's click handler. The 'shared-position sliding highlight' is approximated with a highlight bar whose transform is computed from the selected option's row index * a fixed row height (no DOM measurement/FLIP, no floating-ui). Mount entrance animation uses the motion() patch. Exact easing/timing values follow the spec's own low-confidence guidance (~150-250ms ease-out); default offset (themeSpacing(4) ~ 16px) and accent color (primary) match the spec's documented defaults.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/notch)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/notch.ts [notch]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
