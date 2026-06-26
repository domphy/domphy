---
title: "Configuration & Themes"
description: "Customize diagram appearance with Mermaid themes, fontFamily, and per-diagram directives."
---

# Configuration & Themes

## Global configuration

Pass a `config` object to the `mermaid` patch to apply settings to all diagrams on the page:

```ts
import { mermaid } from "@domphy/mermaid"

const DiagramPage = {
  div: DiagramContent,
  $: [mermaid({
    config: {
      theme: "default",
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      startOnLoad: false,
    },
  })],
}
```

## Built-in themes

Mermaid ships five built-in themes:

| Theme | Description |
|-------|-------------|
| `"default"` | Light blue palette — works on light backgrounds |
| `"neutral"` | Gray tones — subtle, professional |
| `"dark"` | Dark background — for dark mode |
| `"forest"` | Green tones |
| `"base"` | Minimal — best base for custom theming |

```ts
// Match the Domphy theme
const isDark = themeName(myElement) === "dark"

const DiagramBlock = {
  div: null,
  $: [mermaid({
    config: { theme: isDark ? "dark" : "default" },
  })],
}
```

## Theme variables (custom theme)

Use the `"base"` theme with `themeVariables` for full control:

```ts
const DiagramBlock = {
  div: null,
  $: [mermaid({
    config: {
      theme: "base",
      themeVariables: {
        primaryColor: "#7c3aed",        // node fill
        primaryTextColor: "#ffffff",    // node text
        primaryBorderColor: "#5b21b6",  // node border
        lineColor: "#6b7280",           // edge color
        secondaryColor: "#f3f4f6",      // secondary node fill
        tertiaryColor: "#fef3c7",       // tertiary node fill
        background: "#ffffff",          // diagram background
        mainBkg: "#ede9fe",             // main node background
        nodeBorder: "#7c3aed",
        clusterBkg: "#f5f3ff",
        titleColor: "#1f2937",
        edgeLabelBackground: "#ffffff",
        fontFamily: "Inter, sans-serif",
      },
    },
  })],
}
```

## Per-diagram directives

Embed configuration directly in the diagram source using `%%{init: ...}%%`:

```markdown
```mermaid
%%{init: {"theme": "forest", "themeVariables": {"primaryColor": "#34d399"}}}%%
flowchart LR
  A --> B --> C
```
```

Directives override global config for that single diagram.

## Flowchart direction

```markdown
```mermaid
%%{init: {"flowchart": {"curve": "basis"}}}%%
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do thing]
  B -->|No| D[Skip]
  C --> E[End]
  D --> E
```
```

Curve options: `"basis"`, `"linear"`, `"cardinal"`, `"step"`, `"stepBefore"`, `"stepAfter"`.

## Sequence diagram config

```markdown
```mermaid
%%{init: {"sequence": {
  "diagramMarginX": 50,
  "actorMargin": 80,
  "boxTextMargin": 5,
  "messageMargin": 35,
  "mirrorActors": false,
  "useMaxWidth": true
}}}%%
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi!
```
```

## Dark mode integration

Reactively switch diagram theme when the Domphy theme changes:

```ts
import { themeName } from "@domphy/theme"
import { toState, effect } from "@domphy/core"

const diagramTheme = toState<"default" | "dark">("default")

// Sync with Domphy theme
effect(() => {
  const name = themeName(someElement)
  diagramTheme.set(name === "dark" ? "dark" : "default")
})

const DiagramBlock = {
  div: null,
  $: [(l) => mermaid({ config: { theme: diagramTheme.get(l) } })],
}
```

## Render options

```ts
const DiagramBlock = {
  div: null,
  $: [mermaid({
    config: {
      securityLevel: "strict",    // or "loose" for trusted HTML in labels
      maxTextSize: 50_000,        // max characters — raise for large diagrams
      maxEdges: 500,              // max edges before truncation warning
      logLevel: "error",          // "fatal"|"error"|"warn"|"info"|"debug"
    },
  })],
}
```

## Accessibility

Mermaid generates `<title>` and `<desc>` elements inside each SVG — screen readers pick these up automatically. Add them with the `accTitle` and `accDescr` directives:

```markdown
```mermaid
---
title: Deployment flow
---
accTitle: Deployment pipeline diagram
accDescr: Shows stages from commit to production
flowchart LR
  Commit --> CI --> Staging --> Production
```
```
