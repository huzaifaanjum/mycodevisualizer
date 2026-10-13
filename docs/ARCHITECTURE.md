# Architecture

How mycodevisualizer is put together, from the browser down to the Java tracer. Diagrams are [Mermaid](https://mermaid.js.org) and render on GitHub.

- [System overview](#system-overview)
- [Code layers](#code-layers)
- [Lifecycle of a run](#lifecycle-of-a-run)
- [Inside the sandbox: the tracer](#inside-the-sandbox-the-tracer)
- [In the browser: from trace to pictures](#in-the-browser-from-trace-to-pictures)
- [Execution providers](#execution-providers)
- [Data model](#data-model)
- [Sharing and accounts](#sharing-and-accounts)
- [Security boundaries](#security-boundaries)
- [UI state that stays in the browser](#ui-state-that-stays-in-the-browser)

## System overview

```mermaid
flowchart LR
  subgraph Browser["Browser (Next.js client)"]
    UI["Workspace<br/>Monaco editor · stdin"]
    VIZ["Visualizer<br/>memory · call tree · flow · console"]
    PB["Playback engine<br/>steps, breakpoints, speed"]
  end

  subgraph Vercel["Vercel (Next.js server)"]
    API["Route handlers<br/>/api/runs · /api/snippets · /api/examples · /api/me/*"]
    SVC["Services<br/>RunService · SnippetService · ExampleService"]
    REPO["Repositories"]
    AUTH["Auth.js<br/>GitHub / Google"]
  end

  subgraph SBX["Vercel Sandbox microVM (per run)"]
    JAVAC["javac -g"]
    TRACER["JDI tracer<br/>tracer.jar"]
  end

  DB[("MongoDB Atlas<br/>examples · snippets · users<br/>rate limits · usage · runtime")]

  UI -- "POST /api/runs<br/>code + stdin" --> API
  API --> SVC
  SVC -- "ExecutionProvider" --> SBX
  JAVAC --> TRACER
  SBX -- "JSON trace (stdout)" --> SVC
  SVC -- "validated Trace" --> API --> PB --> VIZ
  SVC --> REPO --> DB
  API <--> AUTH
  AUTH --> DB
```

The server never runs user code itself. It validates the request, hands the program to an isolated microVM, and validates the JSON trace that comes back. Everything visual (step notes, memory drawing, call tree, flowchart, playback) is computed in the browser from that one trace.

## Code layers

```mermaid
flowchart TB
  subgraph app["src/app — routes only"]
    pages["Pages<br/>/ · /examples · /s/[publicId] · /me/snippets · /about · /privacy"]
    routes["Route handlers<br/>api/runs · api/snippets · api/examples · api/me · api/auth"]
  end

  subgraph features["src/features — UI slices (import only via index.ts)"]
    workspace["workspace<br/>layout, run state, split panes"]
    editor["editor<br/>Monaco, stdin"]
    visualizer["visualizer<br/>playback, notes, memory, call tree, flow"]
    snippets["snippets<br/>share button, my programs"]
    examples["examples<br/>gallery"]
    auth["auth<br/>sign-in, user menu"]
    theme["theme<br/>light / dim / black, accent"]
  end

  subgraph common["src/components + src/lib"]
    ui["components/ui — shadcn/Radix primitives"]
    cmn["components/common — header, split handle, zoom controls"]
    lib["lib — cn(), usePersistedNumber"]
  end

  subgraph languages["src/languages — one LanguageAdapter per language"]
    registry["registry.ts"]
    java["java/ — starter, explanations, unsupported-feature checks"]
  end

  subgraph server["src/server — server-only"]
    context["context.ts — composition root"]
    services["services/ — run, snippet, example, identity"]
    execution["execution/ — vercel-sandbox · local · fixture"]
    repos["repositories/ — the only code that touches Mongo"]
    security["security/ — errors, rate limit, IP hashing, same-origin"]
    http["http/route.ts — AppError → JSON error"]
    envmod["env.ts — Zod-validated config"]
  end

  subgraph shared["src/shared — isomorphic contracts"]
    constants["constants.ts — limits, themes, accents"]
    trace["trace/ — Trace Zod schema, delta expansion"]
    apis["api/ — request/response schemas, typed client"]
  end

  pages --> features
  routes --> http --> context --> services
  services --> execution
  services --> repos
  services --> security
  features --> common
  features --> languages
  features --> shared
  server --> shared
  languages --> shared
```

Rules that keep the layers honest (see `CLAUDE.md`):

- Pages and route handlers stay thin and call services from `context.ts`.
- Services never touch the Mongo driver; repositories do.
- A feature slice is imported only through its `index.ts` (ESLint enforces it).
- The UI only sees `Trace`, never anything Java-specific from the server.
- Every boundary (env, request bodies, DB documents, trace JSON) is parsed with Zod.

## Lifecycle of a run

```mermaid
sequenceDiagram
  autonumber
  actor S as Student
  participant W as Workspace (browser)
  participant R as POST /api/runs
  participant RS as RunService
  participant RL as RateLimiter
  participant P as ExecutionProvider
  participant VM as Sandbox microVM
  participant DB as MongoDB

  S->>W: Visualize (button or Ctrl+Enter)
  W->>R: { language, code, stdin }
  R->>R: assertSameOriginJson · size caps · Zod parse
  R->>RS: run(request, identity)
  RS->>RS: static checks (no threads, files, network, reflection…)
  RS->>RL: check(identity) — 10/min anonymous, 30/min signed in
  RL->>DB: increment window (or in-memory store)
  RS->>P: run(plan, { timeout 8 s, max 6 MB })
  P->>VM: start from snapshot (JDK 21 + tracer.jar)
  VM->>VM: javac -g Main.java
  VM->>VM: java -jar tracer.jar --source … --stdin …
  VM-->>P: stdout = JSON trace
  P-->>RS: ExecutionResult
  RS->>RS: JSON.parse → TraceSchema.safeParse
  RS->>DB: record usage event (status, duration)
  RS-->>R: Trace
  R-->>W: 200 Trace  (or { error: { code, message } })
  W->>W: expandTrace · usePlayback · render panels
```

Failures surface as `AppError(code, safeMessage)` and are mapped by `route()` to `{ error: { code, message } }`. Codes include `UNSUPPORTED_FEATURE`, `RATE_LIMITED` and `EXECUTION_FAILED`.

## Inside the sandbox: the tracer

```mermaid
flowchart TB
  SRC["Main.java + stdin"] --> PREP["SourcePreparer<br/>find main class · blank package line<br/>generate McvLauncher__"]
  PREP --> COMP["JavaCompilerRunner<br/>javac -g (debug info)"]
  COMP -- "compile errors" --> CE["Trace status: compile_error<br/>+ diagnostics"]
  COMP -- "ok" --> DBG["Debugger (JDI)<br/>launch suspended · break at main<br/>single-step lines, skip JDK classes"]
  DBG --> HEAP["HeapBuilder<br/>frames, locals, reachable objects"]
  HEAP --> COLL["CollectionReader<br/>ArrayList, HashMap, Deque… as lists/sets/maps"]
  DBG --> IO["Captured System.out<br/>byte-at-a-time System.in (consumed input)"]
  COLL --> JSON["Json → one trace on stdout"]
  IO --> JSON
  DBG -- "limits hit" --> TR["status: truncated<br/>STEP_LIMIT · TIME_LIMIT · OUTPUT_LIMIT"]
  DBG -- "uncaught exception" --> RE["status: runtime_error"]
```

Each step records the event (`call`, `step`, `return`, `exception`, `end`), the line, stack frames with locals, the heap (full or delta-encoded), output so far and how much stdin has been consumed. The tracer has no third-party dependencies, only `jdk.jdi` and `java.compiler`.

## In the browser: from trace to pictures

```mermaid
flowchart LR
  T["Trace (validated)"] --> EX["expandTrace<br/>delta heap → full per step"]
  EX --> PB["usePlayback<br/>index · speed · breakpoints · autoplay"]
  PB --> NOTES["step-notes + note-templates<br/>plain-English explanation"]
  PB --> MEM["MemoryView<br/>FrameCard · HeapObjectBox · ReferenceArrows"]
  PB --> CT["CallTree<br/>call-timeline: tree / outline"]
  PB --> FLOW["FlowView<br/>flow-graph + source-analysis (React Flow)"]
  PB --> CON["ConsolePanel<br/>stdout · input tape"]
  PB --> ED["CodeEditor<br/>current / previous line, breakpoints"]
  KEYS["Keyboard<br/>Space ←/→ Home/End B F"] --> PB
```

All of this is deterministic and runs client-side, so stepping backwards and scrubbing are instant and need no server round trips.

## Execution providers

```mermaid
flowchart LR
  ENV["EXECUTION_PROVIDER<br/>(default: vercel-sandbox in production, local otherwise)"] --> SW{getExecutionProvider}
  SW -- "vercel-sandbox" --> VS["Vercel Sandbox microVM<br/>from a snapshot recorded in Mongo (runtime)<br/>no network · 1 vCPU · destroyed after run"]
  SW -- "local" --> LP["Local process<br/>TRACER_JAR_PATH on your machine<br/>refuses NODE_ENV=production"]
  SW -- "fixture" --> FX["Fixture traces<br/>for tests, no Java needed"]
```

The sandbox snapshot (JDK 21 + `tracer.jar`) is built on first use and its id stored in the `runtime` collection, or built ahead of time with `yarn sandbox:snapshot`.

## Data model

```mermaid
erDiagram
  USERS ||--o{ SNIPPETS : "owns (ownerId, optional)"
  USERS {
    ObjectId _id "managed by Auth.js"
    object preferences "accent"
  }
  SNIPPETS {
    ObjectId _id
    string publicId "short link id"
    string language
    string title
    string code
    string stdin
    string ownerId "user id or null"
    date createdAt
    date updatedAt
    int views
  }
  EXAMPLES {
    string slug
    string title
    string topic
    string difficulty
    string language
    string description
    string code
    string stdin
    int order
  }
  RATE_LIMITS {
    string _id "identity + action + window"
    int count
    date expiresAt "TTL"
  }
  USAGE_EVENTS {
    string type "run | share | example_open"
    string language
    string status
    int durationMs
    string reason "infra failures only"
    date createdAt
  }
  RUNTIME {
    string _id
    string snapshotId
    string tracerHash
    date createdAt
  }
```

Mongo is optional in development. Without `MONGODB_URI`, examples load from `content/examples`, sharing and sign-in are hidden, and rate limits use an in-memory store.

## Sharing and accounts

```mermaid
sequenceDiagram
  actor A as Author
  actor V as Viewer
  participant API as /api/snippets
  participant SS as SnippetService
  participant DB as MongoDB
  participant P as /s/[publicId]

  A->>API: POST { code, stdin, title }
  API->>SS: create (rate limit 10/hour)
  SS->>DB: insert snippet with publicId
  API-->>A: link /s/{publicId}
  V->>P: open link
  P->>SS: get(publicId)
  SS->>DB: find { publicId: { $eq } }
  P-->>V: Workspace with code, auto-runs
```

Signed-in users see their shared programs at `/me/snippets`, and their accent color is saved to their profile via `/api/me/preferences`.

## Security boundaries

```mermaid
flowchart LR
  U["Untrusted input<br/>code · stdin · params"] --> G1["Same-origin check<br/>size caps · Zod"]
  G1 --> G2["Static checks<br/>reject threads, files, network,<br/>processes, reflection, native"]
  G2 --> G3["Rate limit<br/>by user id or hashed IP"]
  G3 --> G4["Isolated microVM<br/>no network · 8 s · 128 MB heap · 1,000 steps"]
  G4 --> G5["Trace size cap 6 MB<br/>TraceSchema validation"]
  G5 --> G6["Rendered as text only<br/>no dangerouslySetInnerHTML · strict CSP"]
```

Raw IPs are never stored, Mongo filters use `$eq` on user input, and the `local` provider cannot run in production.

## UI state that stays in the browser

These preferences live in `localStorage` (per browser) and are applied before paint where they affect colors:

| Key | What |
| --- | --- |
| `mcv-theme` | Light, Dim or Black theme |
| `mcv-accent` | Accent color (also saved to the account when signed in) |
| `mcv-code-width` | Code / visualization split |
| `mcv-editor-height` | Editor / stdin split |
| `mcv-tabs-height` | Visualization / console split |
| `mcv-code-zoom` | Code editor zoom |
| `mcv-viz-zoom` | Memory and call tree zoom |
