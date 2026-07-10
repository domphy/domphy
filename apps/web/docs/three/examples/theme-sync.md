---
title: "@domphy/three — Theme Sync"
description: "One theme system driving both the DOM and a WebGL scene: buttons switch dataTone/color on the demo container, and the same State recolors the mesh, background, and fog via themeColorToken."
---

# Theme Sync

<script setup lang="ts">
import ThemeSyncDemo from "../../demos/three/theme-sync.ts?raw"
</script>

The unique Domphy story: one theme system, two renderers. `@domphy/ui` buttons switch a color family and a light/dark surface on the demo container's `dataTone` — the exact same `State` is read inside the `three()` scene to recolor the mesh material, the scene background, and the fog through `themeColorToken()`. Edit the code below live.

<CodeEditor :code="ThemeSyncDemo" />

## How it works

- **One `State`, two consumers.** `activeColor` and `darkSurface` (`toState`) are read by the container's `dataTone` attribute _and_ by the scene's reactive props — that's the actual bridge, not automatic DOM-to-WebGL context propagation. See [Scene Grammar](/docs/three/grammar) for the pierced-prop / reactive-value rules.
- **`themeColorToken(l, tone, color)`** returns a concrete token string (e.g. `"#4a7ff4"`) instead of a `var(--…)` CSS reference — exactly what a `meshStandardMaterial.color` or a `THREE.Color`/`THREE.Fog` constructor needs, since neither understands CSS custom properties.
- **Function-prop rule 7.** Any non-event function value on a scene node (`color: (l) => ...`) subscribes a Domphy listener and re-applies the prop on change — see the [function-prop rules](/docs/three/grammar#function-prop-rules) in the grammar doc. That's what makes the mesh recolor the instant a button is clicked.
- **Reactive `args` reconstructs.** The background `{ color: null, attach: "background" }` and `{ fog: null }` nodes have no nested prop path to poke, so their `args` is a function — a shallow change there tears down and rebuilds the instance (locked in the grammar's reconcile semantics), which is the only way to update them.
- **The listener has no DOM context.** `themeColorToken()`'s automatic `dataTone`/`dataTheme` tree-walk needs a `Listener` with `.elementNode`, which is how `@domphy/core` wires it for ordinary DOM style/attribute props. The listener a `three()` reactive prop hands your function is a bare `Handler` without `.elementNode`, so it never inherits tone context from an ancestor on its own — sharing one `State` is what actually keeps DOM and scene in sync.
- **`button({ color })`** ([`@domphy/ui`](/docs/ui/patches/button)) accepts the same `ThemeColor` union `themeColorToken` does, so each swatch button is itself colored by the family it selects.

[← Back to @domphy/three](/docs/three/)
