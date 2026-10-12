# mycodevisualizer: product spec

## Goal
A free, open web tool that helps Coding 101 students understand how code runs. A student pastes Java code, sets stdin, then watches an automated visualization or steps through execution one line at a time.

## Decisions
| Area | Decision |
| --- | --- |
| Stack | Next.js (App Router) + TypeScript strict, MongoDB Atlas, Vercel, shadcn/ui, Tailwind |
| Execution | Real Java in an isolated Vercel Sandbox, traced with a JDI-based tracer that emits a JSON step trace |
| Java scope | Single file, `main`, primitives, `String`, `Scanner` stdin, if/else, loops, arrays, static methods, recursion, classes and objects, and `java.util` collections (lists, sets, maps, stacks, queues, deques) |
| Languages later | Pluggable language adapters; Java is the first |
| Visual panels | Variables and stack frames, heap (arrays, objects and collections with arrows; collection additions, removals and replacements highlighted), call stack and recursion tree, plain-English step notes |
| Step notes | Rule-based, deterministic, from trace events |
| Playback | Autoplay with speed, step forward/back, scrubber, line breakpoints, keyboard shortcuts |
| Editor and layout | Monaco on the left with stdin below, visualization on the right, stacked on mobile |
| Data in MongoDB | Example library, shareable snippet links, optional accounts, rate limits, anonymous usage counts, runtime snapshot record |
| Auth | Optional; Auth.js with GitHub and Google OAuth only |
| Theme | Pure black `#000`, shadcn components, accent picker (default electric green `#22C55E`) |
| Run limits | 8 s of tracing, 128 MB heap, 1,000 steps, 64 KB code, 16 KB stdin, no network or files, 10 runs/min per IP (30 signed in) |
| Quality | Vitest, Playwright, ESLint + Prettier, Zod at every boundary, GitHub Actions CI |

## Trace format
See `src/shared/trace/schema.ts` (schema version 1). Frames are ordered outermost first. Values are primitives, null or references into a per-step heap of arrays, strings, objects, lists, sets and maps (collections show their logical contents, up to 50 elements, read from `java.util` internals without running any program code). With `heapEncoding: "delta"` each step carries only heap objects that changed; `expandTrace()` rebuilds full heaps.

## API
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/runs` | Compile, run and trace code |
| GET | `/api/examples`, `/api/examples/[slug]` | Example library |
| POST | `/api/snippets` | Save a public-by-link snippet |
| GET / PATCH / DELETE | `/api/snippets/[publicId]` | Read; owner-only rename and delete |
| GET | `/api/me/snippets` | Signed-in user's snippets |
| PATCH | `/api/me/preferences` | Save accent color |

All errors use `{ error: { code, message, retryAfterSeconds?, fields? } }`.

## Roadmap
- More languages (Python next) via new adapters and tracers.
- Teacher features (classes, assigned examples).
