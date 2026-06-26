---
title: "Class & State Diagrams"
description: "Complete Mermaid class and state diagram syntax — members, visibility, relationships, annotations, namespaces, and composite states."
---

# Class & State Diagrams

## Class diagrams

Class diagrams model the static structure of a system: its types, members, and the relationships between them.

### Basic class syntax

```mermaid
classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
    +move(distance int) bool
  }
```

Members are listed inside `{ }`. Fields list type then name; methods add parentheses and an optional return type.

### Member visibility

| Symbol | Visibility |
|--------|------------|
| `+` | Public |
| `-` | Private |
| `#` | Protected |
| `~` | Package / internal |

Append `$` to mark a member as **static**, or `*` to mark it as **abstract**:

```mermaid
classDiagram
  class Repository {
    -String connectionString
    +$getInstance() Repository
    +*findById(id int) Entity
    #validate(entity Entity) bool
  }
```

### Relationships

```mermaid
classDiagram
  Animal <|-- Dog : Inheritance
  Car *-- Engine : Composition
  Car o-- Wheel : Aggregation
  Driver --> Car : Association
  Order ..> Product : Dependency
  Service ..|> IService : Realization
```

| Syntax | Relationship |
|--------|--------------|
| `A <\|-- B` | B inherits from A (generalization) |
| `A *-- B` | A is composed of B (composition) |
| `A o-- B` | A aggregates B (aggregation) |
| `A --> B` | A has an association to B |
| `A -- B` | Link (undirected) |
| `A ..> B` | A depends on B |
| `A ..*` | Composition via dotted |
| `A ..\|> B` | A realizes interface B |

All relationships can be reversed by swapping the symbols.

### Cardinality labels

Add cardinality to either end of a relationship:

```mermaid
classDiagram
  class Customer {
    +String name
  }
  class Order {
    +Date placedAt
  }
  class LineItem {
    +int quantity
  }

  Customer "1" --> "0..*" Order : places
  Order "1" *-- "1..*" LineItem : contains
```

Common cardinality strings: `1`, `0..*`, `1..*`, `0..1`, `n`, `1..n`.

### Relationship labels

Add a label after the relationship using `:` with a quoted or unquoted string:

```mermaid
classDiagram
  User "1" --> "0..*" Session : has
  Session --> Token : carries
```

### Annotations

Annotations mark the stereotype of a class. Place them inside the class body with `<<...>>`:

```mermaid
classDiagram
  class IRepository {
    <<Interface>>
    +findById(id int) Entity
    +save(entity Entity) void
  }

  class BaseService {
    <<Abstract>>
    +#validate() bool
  }

  class Status {
    <<Enumeration>>
    PENDING
    ACTIVE
    CLOSED
  }

  class UserService {
    <<Service>>
  }
```

Common annotations: `<<Interface>>`, `<<Abstract>>`, `<<Enumeration>>`, `<<Service>>`, `<<Repository>>`, `<<Component>>`.

### Namespaces

Group related classes inside a named namespace:

```mermaid
classDiagram
  namespace Domain {
    class User {
      +String email
    }
    class Order {
      +Date createdAt
    }
  }

  namespace Infrastructure {
    class UserRepository {
      +findByEmail(email String) User
    }
  }

  UserRepository --> User : returns
```

### Class diagram direction

Control layout with a leading `direction` declaration:

```mermaid
classDiagram
  direction LR
  class A
  class B
  A --> B
```

Accepted values: `TB`, `BT`, `LR`, `RL`.

---

## State diagrams

State diagrams model the lifecycle of an object — which states it can be in and the transitions between them.

### Basic transitions

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : fetch()
  Loading --> Success : ok
  Loading --> Error : fail
  Error --> Idle : reset()
  Success --> [*]
```

`[*]` is the special initial / final state marker. A transition out of `[*]` is the entry; a transition into `[*]` is the exit.

### State descriptions

Add a description to a state using `state_id : description`:

```mermaid
stateDiagram-v2
  Idle : Waiting for user input
  Loading : Request in flight
  Success : Data received
  Error : Render error boundary

  [*] --> Idle
  Idle --> Loading
  Loading --> Success
  Loading --> Error
```

### Named states

Give a long-form display name to a state using `state "label" as id`:

```mermaid
stateDiagram-v2
  state "Fetching data" as loading
  state "Render complete" as done

  [*] --> loading
  loading --> done : ok
  loading --> [*] : error
```

### Composite (nested) states

A composite state groups sub-states inside `state id { ... }`:

```mermaid
stateDiagram-v2
  [*] --> Auth

  state Auth {
    [*] --> Unauthenticated
    Unauthenticated --> Authenticating : login()
    Authenticating --> Authenticated : success
    Authenticating --> Unauthenticated : failure
    Authenticated --> [*]
  }

  Auth --> App
```

### Fork and join

Model parallel execution with `<<fork>>` and `<<join>>`:

```mermaid
stateDiagram-v2
  [*] --> fork
  state fork <<fork>>
  fork --> Logging
  fork --> Notifying
  Logging --> join
  Notifying --> join
  state join <<join>>
  join --> [*]
```

### Choice (conditional)

Branch based on a condition with `<<choice>>`:

```mermaid
stateDiagram-v2
  [*] --> Validate
  Validate --> check
  state check <<choice>>
  check --> Success : valid
  check --> Error : invalid
  Success --> [*]
  Error --> [*]
```

### Concurrency

Split a composite state into concurrent regions with `--`:

```mermaid
stateDiagram-v2
  [*] --> Active

  state Active {
    [*] --> UI
    UI --> UI : interaction
    --
    [*] --> Sync
    Sync --> Syncing : timer
    Syncing --> Sync : done
  }

  Active --> [*] : logout
```

### Notes

Annotate a state with a free-form note:

```mermaid
stateDiagram-v2
  [*] --> Idle
  note right of Idle
    Default state on startup.
    Re-entered after any reset.
  end note
  Idle --> Running
```

### Direction

```mermaid
stateDiagram-v2
  direction LR
  [*] --> A --> B --> [*]
```

## Rendering with @domphy/mermaid

```ts
import { renderMermaidToSvg } from "@domphy/mermaid"

const classSvg = await renderMermaidToSvg(`classDiagram
  class IStore {
    <<Interface>>
    +get(key String) T
    +set(key String, value T) void
  }
  class RecordState {
    +get(key String) T
    +set(key String, value T) void
  }
  IStore <|.. RecordState : implements`, { theme: "neutral" })

const stateSvg = await renderMermaidToSvg(`stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : query.fetch()
  Loading --> Success : data received
  Loading --> Error : network fail
  Error --> Idle : retry()
  Success --> [*]`, { theme: "neutral" })
```
