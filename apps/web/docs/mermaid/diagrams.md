---
title: "Supported Diagrams"
description: "All diagram types supported by @domphy/mermaid and Mermaid.js syntax reference."
---

# Supported Diagrams

`@domphy/mermaid` renders any diagram type that [Mermaid.js](https://mermaid.js.org) supports. Below is a quick reference for the most commonly used types with Domphy usage examples.

## Flowchart

```mermaid
flowchart LR
  A[Start] --> B{Decision}
  B -- Yes --> C[Do it]
  B -- No --> D[Skip it]
  C --> E[End]
  D --> E
```

```ts
import { renderMermaidInTree } from "@domphy/mermaid"

const diagram = await renderMermaidInTree({
  pre: [{ code: `flowchart LR
  A[Start] --> B{Decision}
  B -- Yes --> C[Do it]
  B -- No --> D[Skip it]` }],
})
```

Flowchart directions: `TB` (top→bottom), `LR` (left→right), `BT`, `RL`.

## Sequence diagram

```mermaid
sequenceDiagram
  participant Browser
  participant Server
  Browser->>Server: GET /api/user
  Server-->>Browser: 200 { user }
  Browser->>Server: POST /api/login
  Server-->>Browser: 401 Unauthorized
```

```ts
const source = `sequenceDiagram
  participant Browser
  participant Server
  Browser->>Server: GET /api/user
  Server-->>Browser: 200 { user }`
```

## Class diagram

```mermaid
classDiagram
  class Animal {
    +String name
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  Animal <|-- Dog
```

## State diagram

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : fetch()
  Loading --> Success : ok
  Loading --> Error : fail
  Error --> Idle : reset()
  Success --> [*]
```

Useful for documenting `@domphy/query` state transitions.

## Entity-relationship (ERD)

```mermaid
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  PRODUCT }|..|{ LINE-ITEM : includes
```

## Gantt chart

```mermaid
gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  section Design
    Wireframes     :done,    w1, 2025-01-01, 7d
    Prototypes     :active,  p1, 2025-01-08, 14d
  section Development
    Core           :         c1, after p1, 21d
    UI             :         u1, after c1, 14d
```

## Pie chart

```mermaid
pie title Browser Share
  "Chrome"  : 65.2
  "Safari"  : 18.9
  "Firefox" : 4.0
  "Other"   : 11.9
```

## Git graph

```mermaid
gitGraph
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit
```

## Mind map

```mermaid
mindmap
  root((Domphy))
    Core
      State
      Computed
      Patches
    Packages
      Query
      Router
      Table
      Virtual
    Tooling
      Doctor
      Audit
      MCP
```

## Timeline

```mermaid
timeline
  title History of Domphy
  2023 : Initial concept
  2024 : First public release
       : TanStack Query adapter
  2025 : VitePress-grade docs site
       : MCP server
```

## Block diagram

```mermaid
block-beta
  columns 3
  A["Browser"] space B["Server"]
  A-- "HTTP" -->B
  B-- "JSON" -->A
```

## Quadrant chart

```mermaid
quadrantChart
  title Performance vs Complexity
  x-axis Low Complexity --> High Complexity
  y-axis Low Performance --> High Performance
  quadrant-1 Optimize
  quadrant-2 Keep
  quadrant-3 Reconsider
  quadrant-4 Migrate
  React: [0.7, 0.6]
  Domphy: [0.3, 0.85]
  Angular: [0.9, 0.5]
```

## XY Chart

```mermaid
xychart-beta
  title "Monthly Users"
  x-axis [Jan, Feb, Mar, Apr, May, Jun]
  y-axis "Users (k)" 0 --> 100
  bar [20, 35, 48, 62, 75, 90]
  line [20, 35, 48, 62, 75, 90]
```

## Kanban

```mermaid
kanban
  Todo
    id1[Write tests]
    id2[Fix bug #42]
  In Progress
    id3[Implement search]
  Done
    id4[Deploy v2.0]
```

## Theming diagrams

Override the Mermaid theme per diagram using `%%{init: ...}%%`:

```ts
const source = `%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#6366f1'}}}%%
flowchart LR
  A --> B`

const svg = await renderMermaidToSvg(source, { theme: "dark" })
```

Available themes: `default`, `dark`, `neutral`, `forest`, `base` (most customizable).

## Build-time vs client-side

| Method | When to use |
|--------|-------------|
| `renderMermaidInTree()` | Static docs, SSG — SVG in HTML, no runtime |
| `mermaidClient()` patch | Dynamic diagrams, user input, live preview |

Build-time is recommended for most docs: smaller page weight, no layout shift, works without JavaScript.

## All supported types

Every Mermaid diagram type works with `@domphy/mermaid`:

flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, gitGraph, mindmap, timeline, xychart-beta, block-beta, quadrantChart, requirementDiagram, C4Context, sankey-beta, kanban, architecture-beta, packet-beta, radar, treemap, eventModel, wardleyMap, vennDiagram, ZenUML

See [mermaid.js.org](https://mermaid.js.org) for full syntax documentation for each type.
