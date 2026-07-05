---
title: "@domphy/blocks — sidebar09"
description: "Nested icon-rail + message-list mail layout."
---

# sidebar09

<script setup lang="ts">
import Sidebar09Demo from "../demos/blocks/sidebar09.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar09()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar09Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `folders` | `Sidebar09Folder[]` | — |
| `messages` | `Sidebar09Message[]` | — |
| `activeFolderId` | `string` | — |
| `activeMessageId` | `string \| null` | — |
| `searchQuery` | `string` | — |
| `user` | `Sidebar09User` | — |
| `breadcrumbItems` | `SidebarBreadcrumbItem[]` | — |
| `onFolderSelect` | `(folderId: string) =&gt; void` | — |
| `onMessageSelect` | `(messageId: string) =&gt; void` | — |
| `onSearchChange` | `(query: string) =&gt; void` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Nested icon-rail + message-list mail layout. Implemented: folder-icon rail with active highlight, instant folder-switch re-render, live search filter, 'Unreads' inputSwitch filter, 2-line clamped preview rows with unread dot + selected-row highlight, main header with SidebarTrigger/breadcrumb, icon-rail CSS width-transition collapse, and a mobile behavior where the message-list panel is hidden by default and revealed (as a fixed overlay with its own close button) when a folder is tapped. Gap: the main content stays the shared placeholder panel (no reading-pane wired to the selected message, consistent with every other sidebar in this family, which all use the same generic main-content slot). Direct-source-diff fix (2026-07-05): Message-list header was a static 'Acme Mail' string — upstream reactively shows the active folder's title. Fixed.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar09.ts [sidebar09]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
