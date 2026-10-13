# mycodevisualizer: conventions

Free, open Java visualizer for Coding 101. Full spec: `docs/SPEC.md`.

## Architecture
- `src/app` — routes only. Pages and route handlers stay thin and call services.
- `src/features/*` — vertical UI slices. Import a slice only through its `index.ts` (ESLint enforces it).
- `src/languages/*` — one `LanguageAdapter` per language. Adding a language = new folder + register in `registry.ts`. The UI only sees `Trace`.
- `src/server` — server-only. `context.ts` is the composition root; services never touch the Mongo driver (repositories do).
- `src/shared` — isomorphic contracts: constants (single source of truth for limits), Zod schemas for trace, API and examples.
- `tracer/` — Java JDI tracer, built with plain `javac` (`yarn tracer:build`, `yarn tracer:test`).

## Rules
- TypeScript strict, no `any`, no non-null assertions, exhaustive `switch` with `never`.
- Validate every boundary with Zod (env, request bodies, DB docs, trace JSON).
- Errors: throw `AppError(code, safeMessage)`; `route()` maps it to `{ error: { code, message } }`.
- User code never runs on the web server in production. `local` provider refuses `NODE_ENV=production`.
- Mongo filters use `$eq` on user input. Mutating APIs call `assertSameOriginJson`.
- Never `dangerouslySetInnerHTML`. Render code, output and notes as text.
- No default exports except Next.js pages/layouts/route conventions.
- All user-facing step-note wording lives in `features/visualizer/lib/note-templates.ts`.

## Commands
`yarn dev` · `yarn check` (lint + typecheck + unit) · `yarn test:e2e` · `yarn build`
