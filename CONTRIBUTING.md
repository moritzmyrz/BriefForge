# Contributing to BriefForge

Thanks for your interest. This document covers everything you need to get
started, submit a PR, and stay aligned with the project's conventions.

## Prerequisites

- Node.js 20+
- pnpm 9+
- An OpenAI API key (only needed for end-to-end tests that call the model)

## Local setup

```bash
git clone https://github.com/moritzmyrz/briefforge.git
cd briefforge
pnpm install
cp .env.example .env     # fill in OPENAI_API_KEY
pnpm dev                 # starts the server at http://localhost:3000
```

## Running tests

```bash
pnpm test            # all tests (unit + integration, no LLM calls)
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage report
```

Tests run against an in-memory SQLite database and a mock LLM provider.
No real API calls are made.

## Code quality

```bash
pnpm lint        # Biome lint check
pnpm format      # Biome format (write)
pnpm check       # lint + format in one pass
pnpm typecheck   # tsc --noEmit
```

CI runs all three. PRs that fail any of them won't be merged.

## Project structure

| Path | What lives here |
| --- | --- |
| `src/app/` | Fastify server bootstrap + entry point |
| `src/routes/` | Thin route handlers — no business logic |
| `src/modules/extraction/` | LLM pipeline, prompts, repair logic |
| `src/modules/artifacts/` | Artifact storage and retrieval |
| `src/modules/providers/` | LLM provider interface + OpenAI impl |
| `src/modules/workflows/` | Status transition engine |
| `src/schemas/` | Zod schemas (source of truth for types) |
| `src/types/` | Re-exported inferred TypeScript types |
| `src/db/` | Drizzle schema, SQLite client, migrations |
| `src/lib/` | Shared utilities: IDs, errors, logger |
| `cli/` | Local extraction CLI tool |
| `tests/` | Unit and integration tests |
| `examples/` | Payload fixtures and curl examples |

## Conventions

**Imports:** Use `.js` extensions on all relative imports (required for ESM).

**IDs:** All entity identifiers must come from `src/lib/ids.ts`. Never import
`sigilid` directly from domain code.

**Errors:** Throw `AppError` (or one of its helper constructors) for expected
failures. The global error handler in `server.ts` normalizes these into the
error envelope format.

**Schemas:** Add Zod schemas to `src/schemas/` and infer types from them. Don't
write manual TypeScript interfaces for domain objects.

**Routes:** Routes should be thin. Call module functions, return responses.
If a route handler is getting long, move the logic to a module.

**Tests:** Unit tests go in `tests/unit/`, integration tests in
`tests/integration/`. Test files are named `*.test.ts`. Integration tests use
Fastify's `inject()` — no HTTP needed.

## Adding a new LLM provider

1. Create `src/modules/providers/your-provider.ts`
2. Implement the `LLMProvider` interface from `interface.ts`
3. Export a factory function similar to `getDefaultProvider()` in `openai.ts`
4. Update `src/routes/extract.ts` or inject it from config

## Submitting a PR

- Keep commits small and focused
- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Update tests for any behavior changes
- Fill in the PR template

## Reporting issues

Use the GitHub issue templates. Include the full error response, relevant logs,
and your environment (Node version, OS, provider/model).
