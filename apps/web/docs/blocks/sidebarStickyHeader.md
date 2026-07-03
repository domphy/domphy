---
title: "@domphy/blocks — sidebarStickyHeader"
description: "Full-featured sidebar (brand header, nested Platform nav, Projects list, secondary nav, user footer) reusing sidebar05-08-shared.ts's row renderers..."
---

# sidebarStickyHeader

<script setup lang="ts">
import SidebarStickyHeaderDemo from "../demos/blocks/sidebarStickyHeader.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebarStickyHeader()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SidebarStickyHeaderDemo" />

::: details Implementation notes
Full-featured sidebar (brand header, nested Platform nav, Projects list, secondary nav, user footer) reusing sidebar05-08-shared.ts's row renderers (renderTeamSwitcher/renderExpandableNavRow/renderPlainNavRow/renderProjectRow/renderUserFooter/icons — all safe read-only imports), paired with a full-width site header that is a genuine sibling of the sidebar, not scrolled with it: position:fixed, with a `--siteHeaderHeight` CSS custom property (declared via a camelCase Domphy style key that the framework's camelToKebab converts to a valid `--site-header-height` custom property) that the sidebar/content row's marginBlockStart and height:calc(100dvh - var(...)) read from, exactly matching the spec's explicit 'page wrapper exposes a header-height custom property' requirement; verified the custom-property round-trip via ElementNode.generateCSS() before relying on it. The brand header/Platform items/default dataset intentionally mirror the researchNote's stated shadcn demo values (Playground/Models/Documentation/Settings; Design Engineering/Sales & Marketing/Travel; user shadcn/m@example.com) as swappable placeholder data. A small 'secondary nav row' renderer is duplicated locally rather than importing it from sidebar08.ts, for the same concurrent-file-safety reason noted on sidebarLeftRight (sidebar05-08-shared.ts/sidebar08.ts were being actively edited by a concurrent process during this session) — a minor, deliberate code-duplication tradeoff, not a functional gap.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebarStickyHeader.ts [sidebarStickyHeader]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
