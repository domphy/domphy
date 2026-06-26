---
title: "Sequence Diagrams"
description: "Complete Mermaid sequence diagram syntax — participants, message types, activation, loops, conditionals, and grouping."
---

# Sequence Diagrams

Sequence diagrams show how components communicate over time. Each actor is laid out as a vertical lifeline; messages pass between lifelines horizontally.

## Basic syntax

```mermaid
sequenceDiagram
  Alice->>Bob: Hello!
  Bob-->>Alice: Hi there
  Alice->>Bob: How are you?
  Bob-->>Alice: All good, thanks.
```

## Participants

Declare participants explicitly to fix their order and give them readable labels:

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as API Server
  participant D as Database

  B->>S: GET /users/42
  S->>D: SELECT * FROM users WHERE id=42
  D-->>S: user row
  S-->>B: 200 { id: 42, name: "Alice" }
```

Use `actor` instead of `participant` to render a stick-person icon:

```mermaid
sequenceDiagram
  actor User
  participant App

  User->>App: Click "Sign in"
  App-->>User: Show login form
```

## Message arrow types

```mermaid
sequenceDiagram
  A->>B: Solid arrowhead (sync request)
  A-->>B: Dotted arrowhead (sync response)
  A->B: Solid, no arrowhead
  A-->B: Dotted, no arrowhead
  A-xB: Solid with cross (lost message)
  A--xB: Dotted with cross
  A-)B: Async (open arrowhead)
  A--)B: Async dotted
```

| Syntax | Meaning |
|--------|---------|
| `->>` | Synchronous call (solid arrowhead) |
| `-->>` | Synchronous response (dotted arrowhead) |
| `->` | Solid, no arrowhead |
| `-->` | Dotted, no arrowhead |
| `-x` | Lost / dropped message |
| `--x` | Lost / dropped dotted |
| `-)` | Asynchronous (open arrowhead) |
| `--)` | Asynchronous dotted |

## Activation boxes

Activation boxes indicate when a participant is actively processing. Use the `+`/`-` shorthand directly on the message:

```mermaid
sequenceDiagram
  Browser->>+Server: POST /login
  Server->>+DB: SELECT user
  DB-->>-Server: user row
  Server-->>-Browser: 200 { token }
```

Or use explicit `activate` / `deactivate`:

```mermaid
sequenceDiagram
  A->>B: Request
  activate B
  B->>C: Forward
  activate C
  C-->>B: Result
  deactivate C
  B-->>A: Response
  deactivate B
```

Nested `+`/`-` on the same participant creates stacked boxes to show re-entrant calls:

```mermaid
sequenceDiagram
  A->>+B: Call 1
  A->>+B: Call 2
  B-->>-A: Reply 2
  B-->>-A: Reply 1
```

## Notes

Annotate the diagram with free-form notes:

```mermaid
sequenceDiagram
  participant A
  participant B

  Note right of A: Waiting for user input
  Note left of B: Validates on every request
  A->>B: Submit
  Note over A,B: Both sides log this event
```

| Syntax | Position |
|--------|----------|
| `Note right of X` | Right of X |
| `Note left of X` | Left of X |
| `Note over X` | Centred above X |
| `Note over X,Y` | Spanning X to Y |

## Loop

Repeat a block of messages:

```mermaid
sequenceDiagram
  Client->>Server: Subscribe to events
  loop Every 30 seconds
    Server->>Client: Heartbeat ping
    Client-->>Server: Pong
  end
  Client->>Server: Unsubscribe
```

## Alt / else

Model branching flows — `alt` with one or more `else` clauses:

```mermaid
sequenceDiagram
  Browser->>API: GET /resource
  alt Found
    API-->>Browser: 200 { data }
  else Not found
    API-->>Browser: 404 Not Found
  else Server error
    API-->>Browser: 500 Internal Error
  end
```

## Opt

An optional block (shown only when the condition holds):

```mermaid
sequenceDiagram
  User->>App: Submit form
  App->>Validator: Validate fields
  opt Invalid input
    Validator-->>App: Validation errors
    App-->>User: Show error messages
  end
  App->>DB: Persist record
  DB-->>App: OK
  App-->>User: Success
```

## Par

Show parallel concurrent activity:

```mermaid
sequenceDiagram
  Server->>Server: Receive request
  par Notify user
    Server->>Email: Send confirmation
  and Log event
    Server->>Logger: Write audit log
  and Update metrics
    Server->>Metrics: Increment counter
  end
  Server-->>Client: 200 OK
```

## Critical

A `critical` block marks a section that must succeed, with `option` branches for alternative outcomes:

```mermaid
sequenceDiagram
  Client->>Server: Open connection
  critical Establish TLS
    Server->>CA: Verify certificate
    CA-->>Server: Certificate valid
  option Timeout
    Server-->>Client: 503 Unavailable
  option Invalid cert
    Server-->>Client: 495 SSL Error
  end
```

## Break

Model an early exit from a sequence:

```mermaid
sequenceDiagram
  User->>App: Upload file
  break File too large
    App-->>User: 413 Payload Too Large
  end
  App->>Storage: Store file
  Storage-->>App: URL
  App-->>User: 200 { url }
```

## Autonumber

Prefix every message with an incrementing sequence number:

```mermaid
sequenceDiagram
  autonumber
  Browser->>Server: GET /api/data
  Server->>DB: Query
  DB-->>Server: Rows
  Server-->>Browser: JSON response
```

## Box grouping

Group participants in a colored background box:

```mermaid
sequenceDiagram
  box "Front-end" #e0f2fe
    participant UI
    participant Store
  end
  box "Back-end"
    participant API
    participant DB
  end
  UI->>API: Fetch
  API->>DB: Query
  DB-->>API: Rows
  API-->>Store: Update state
  Store-->>UI: Re-render
```

## Rendering with @domphy/mermaid

Build-time:

```ts
import { renderMermaidToSvg } from "@domphy/mermaid"

const svg = await renderMermaidToSvg(`sequenceDiagram
  autonumber
  actor User
  participant App
  participant Auth

  User->>App: Sign in
  App->>+Auth: Verify credentials
  Auth-->>-App: JWT token
  App-->>User: Redirect to /dashboard`, { theme: "default" })
```

Client-side (for dynamic or user-authored diagrams):

```ts
import { mermaidClient } from "@domphy/mermaid"

const SequenceView = {
  pre: [{ code: `sequenceDiagram
  A->>B: Hello
  B-->>A: Hi` }],
  $: [mermaidClient({ theme: "neutral" })],
}
```
