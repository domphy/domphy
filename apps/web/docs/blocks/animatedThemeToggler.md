---
title: "@domphy/blocks — animatedThemeToggler"
description: "Full clean-room reimplementation, not viewed against upstream source."
---

# animatedThemeToggler

<script setup lang="ts">
import AnimatedThemeTogglerDemo from "../demos/blocks/animatedThemeToggler.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `animatedThemeToggler()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AnimatedThemeTogglerDemo" />

::: details Implementation notes
Full clean-room reimplementation, not viewed against upstream source. Icon button (buttonGhost, ~themeSpacing(9) square) swaps sun/moon glyphs (own hand-built SVGs: rays+circle sun, two-circle SVG-mask crescent moon — not any specific icon library's path data) via a reactive display style keyed off a theme State. On click it uses the real View Transitions API: document.startViewTransition() snapshots old/new frames, then a WAAPI clip-path animation is applied to the browser's own ::view-transition-new(root) pseudo-element (via el.animate(keyframes,{pseudoElement:...})) — no manual DOM screenshot cloning. All 7 shapes implemented: circle uses exact circle(r at x y); square/diamond/hexagon/triangle use a principled regular-polygon apothem bound (radius = cornerDistance/cos(pi/sides)) that's mathematically guaranteed to fully cover the viewport since a convex shape containing all 4 viewport corners contains the whole (convex) viewport rectangle; rectangle uses an exact axis-aligned half-extent fit; star conservatively treats itself as just its inner pentagon (ignoring the outer points' extra reach) for the same guarantee. origin 'button'|'center' and duration are both wired through. Falls back to an instant, unanimated theme swap when document.startViewTransition is unavailable (checked via feature-detection), exactly as the spec requires. theme prop accepts a ValueOrState so passing a caller-owned State two-way-binds into an external store; onThemeChange covers imperative stores (e.g. localStorage) instead. In the course of writing this component's test, found and fixed a genuine pre-existing bug in @domphy/core's ElementNode.remove()/ElementList.remove() (packages/core/src/classes/ElementNode.ts, ElementList.ts): both re-read `_hooks.BeforeRemove` AFTER invoking it to check its arity, but a synchronous 2-arg _onBeforeRemove hook (exactly what @domphy/ui's motion() patch does when no `exit` frame is given) can trigger _dispose() inline, which clears `_hooks` to `{}` before that re-read, throwing instead of completing removal. Fixed by capturing the hook reference before invocation (both files), added 2 regression tests to packages/core/tests/lifecycle.test.ts, and reran the full core (156) and ui (345) suites green before rebuilding core's dist that this package's tests consume.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/animated-theme-toggler)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/animatedThemeToggler.ts [animatedThemeToggler]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
