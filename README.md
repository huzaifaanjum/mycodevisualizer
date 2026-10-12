# mycodevisualizer

See Java code run, one line at a time. A free, open tool that helps Coding 101 students understand what the computer does: variables changing, methods being called, arrays living in memory, input being read.

Paste code, add input, press **Visualize**, then step through it or let it play.

## Features
- **Real Java**, compiled and run in an isolated Vercel Sandbox microVM, traced line by line with a JDI debugger.
- **Step-by-step or automated** playback with speed control, a timeline scrubber, breakpoints (click the gutter) and keyboard shortcuts (Space, ←/→, Home/End, B).
- **Memory view**: call stack frames with local variables, arrays and objects on the heap, arrows for references (so aliasing is visible).
- **Call tree** for recursion, with return values.
- **Plain-English notes** for every step ("The loop condition i < nums.length is true (i is 0), so its body runs.").
- **Console and input tape** showing output so far and which input tokens Scanner has consumed.
- Beginner-friendly explanations of **compile errors** and **exceptions**.
- 16 curated **examples**, shareable **links**, optional **GitHub / Google sign-in** to keep your shared programs.
- Pure black theme with a selectable accent color.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Monaco · MongoDB Atlas · Auth.js · Vercel + Vercel Sandbox · Zod · Vitest · Playwright.

## How a run works
```
Browser ──POST /api/runs──▶ Route handler ──▶ RunService
   ▲                             │  Zod validation, same-origin check, size caps
   │                             │  static checks (no threads/files/network), rate limit
   │                             ▼
   │                      ExecutionProvider ──▶ Vercel Sandbox microVM (from snapshot)
   │                                              no network · 1 vCPU · destroyed after run
   │                                              javac -g → JDI tracer → JSON trace
   └──── Trace JSON (validated) ◀─────────────────┘
Playback, notes and drawing all happen in the browser.
```

## Local development
Requirements: Node 22+, pnpm, JDK 21.

```bash
pnpm install
pnpm tracer:build          # builds tracer/build/tracer.jar
cp .env.example .env.local # everything is optional for local dev
pnpm dev
```

Without `MONGODB_URI` the app still works: examples come from `/content/examples`, sharing and sign-in are hidden, rate limits are kept in memory. In development, code runs through the `local` provider (the tracer jar on your machine). It is refused in production.

## Deploying to Vercel
1. Import the repo into Vercel (framework: Next.js).
2. Create a MongoDB Atlas cluster and set `MONGODB_URI`.
3. Set `AUTH_SECRET`, `IP_HASH_SALT` (and optionally GitHub/Google OAuth credentials, with callback URL `https://<your-domain>/api/auth/callback/<provider>`).
4. Run `pnpm db:setup` and `pnpm db:seed` once against the database.
5. The Java runtime snapshot is built automatically on first use (about a minute) and recorded in MongoDB. You can build it ahead of time with `pnpm sandbox:snapshot`.

## Scripts
| Script | What it does |
| --- | --- |
| `pnpm check` | Lint, typecheck, unit tests |
| `pnpm test:e2e` | Playwright tests (desktop + mobile) |
| `pnpm tracer:test` | Runs the Java tracer against `tracer/src/test/programs` |
| `pnpm db:setup` / `pnpm db:seed` | Create indexes / load examples |
| `pnpm sandbox:snapshot` | Build the JDK + tracer sandbox snapshot |

## Security
User code only runs inside throwaway microVMs with no network access, a 5 s budget, 128 MB heap and 1,000-step cap. The API validates every input with Zod, rejects cross-origin writes, caps request sizes, rate-limits by hashed IP, sends a strict CSP and security headers, and never stores raw IPs. See `CLAUDE.md` for coding rules.

## Adding a language
Implement `LanguageAdapter` in `src/languages/<lang>/`, register it in `src/languages/registry.ts`, add a tracer that emits the `Trace` schema (`src/shared/trace/schema.ts`), and include it in the sandbox runtime.

## License
MIT
