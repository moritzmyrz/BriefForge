# BriefForge

**AI-native backend API for transforming unstructured text into structured, workflow-ready artifacts.**

[![CI](https://github.com/moritzmyrz/briefforge/actions/workflows/ci.yml/badge.svg)](https://github.com/moritzmyrz/briefforge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)

---

BriefForge takes raw text — meeting notes, support tickets, emails, CRM notes, voice transcripts — and runs it through a structured LLM extraction pipeline. The output isn't just a summary. It's a typed, validated, ID-stamped artifact: action items with assignees and due dates, decisions with rationale, named entities, urgency classification, tags, and confidence scores. Everything is designed to plug into your own workflows.

This is a real developer tool. It has a production-minded API, clean module boundaries, strong TypeScript types end-to-end, and a provider abstraction that doesn't tie you to a single LLM vendor.

---

## Why BriefForge?

Most LLM integrations are one-off scripts. They prompt a model, print output, and stop. BriefForge treats AI extraction as a first-class backend concern:

- Every ingested text becomes a tracked **request** with a stable ID
- Every extraction is a recorded **run** with token counts, duration, and repair status
- Every extracted result is a typed, validated **artifact** with its own lifecycle
- Every sub-item — action items, decisions, entities — gets a prefixed identifier
- The whole system is queryable, promotable, and auditable

If you're building a product that needs to turn free-form text into structured data at any scale, BriefForge gives you the architecture to do it right.

---

## Features

- **Text ingestion** — Accept raw text with optional metadata; get back a stable `req_...` ID
- **Structured AI extraction** — Summary, action items (with assignees + due dates), decisions, named entities, classification, urgency, tags, and confidence scores
- **Zod-validated output** — Model responses are validated against a strict schema before storage; a repair pass handles occasional model drift
- **Artifact lifecycle** — `pending → validated → published` or `rejected`; full status history
- **Typed prefixed IDs** — Every object in the system carries a stable, human-readable `sigilid` identifier (`req_`, `run_`, `art_`, `tsk_`)
- **Provider abstraction** — Drop in OpenAI today, swap to Anthropic, Gemini, or a local model tomorrow
- **SQLite persistence** — Drizzle ORM, WAL mode, type-safe queries
- **CLI tool** — Run extraction directly against a local text file
- **Minimal setup** — `pnpm install && pnpm dev` and you're running

---

## Quick start

### Requirements

- Node.js 20+
- pnpm
- An OpenAI API key (or compatible endpoint)

### Install and run

```bash
git clone https://github.com/moritzmyrz/briefforge.git
cd briefforge
pnpm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env
pnpm dev
```

The server starts at `http://localhost:3000`.

### Ingest and extract in one call

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Team synced on the Q1 roadmap. Sarah will own the API docs by Friday. We decided to ship the v2 dashboard before the mobile app. Marcus flagged a critical bug in the export pipeline.",
    "metadata": { "source": "slack", "author": "Sarah" },
    "extractImmediately": true
  }'
```

**Response:**

```json
{
  "requestId": "req_K7gkJ_q3vR2nL8xH5eM0w",
  "artifact": {
    "id": "art_Xp9mN2qL5vR8nK3eJ7cHw",
    "requestId": "req_K7gkJ_q3vR2nL8xH5eM0w",
    "runId": "run_aX4_p9Qr2mNsK8vL5eJ7w",
    "summary": "Team reviewed Q1 roadmap, assigned API docs to Sarah, decided to prioritize v2 dashboard over mobile, and flagged a critical export bug.",
    "actionItems": [
      {
        "id": "tsk_7mN2qLR8nK3eJ",
        "description": "Own the API docs",
        "assignee": "Sarah",
        "dueDate": "2026-03-21",
        "priority": "high",
        "confidence": 0.93
      }
    ],
    "decisions": [
      {
        "id": "dec_aX4p9Qr_0",
        "description": "Ship the v2 dashboard before the mobile app",
        "confidence": 0.97
      }
    ],
    "entities": [
      { "id": "ent_aX4p9Qr_0", "value": "Sarah", "type": "person", "confidence": 0.99 },
      { "id": "ent_aX4p9Qr_1", "value": "Marcus", "type": "person", "confidence": 0.99 }
    ],
    "classification": "meeting",
    "urgency": "high",
    "tags": ["q1", "roadmap", "v2", "bug"],
    "confidence": 0.91,
    "status": "validated",
    "createdAt": "2026-03-14T10:23:01.000Z",
    "updatedAt": "2026-03-14T10:23:01.000Z"
  }
}
```

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/ingest` | Ingest text, optionally extract immediately |
| `GET` | `/requests/:id` | Fetch an ingestion request by `req_...` ID |
| `POST` | `/extract` | Run extraction on an existing request |
| `GET` | `/artifacts/:id` | Fetch an artifact by `art_...` ID |
| `POST` | `/workflows/:id/promote` | Transition artifact status |

### POST /ingest

```json
{
  "text": "string (10–50,000 chars)",
  "metadata": {
    "source": "string (optional)",
    "author": "string (optional)",
    "contentType": "meeting | email | ticket | document | transcript | crm_note | unknown",
    "tags": ["string"]
  },
  "extractImmediately": false
}
```

Returns `202` with `{ requestId, status: "pending" }` if `extractImmediately` is false.
Returns `201` with `{ requestId, artifact }` if extraction ran synchronously.

### POST /extract

```json
{
  "requestId": "req_...",
  "model": "gpt-4o (optional override)"
}
```

Returns `201` with `{ runId, artifact, meta }`.

### POST /workflows/:id/promote

```json
{
  "status": "published | rejected"
}
```

Defaults to `"published"`. Enforces valid status transitions — returns `409` if the transition isn't allowed.

---

## Architecture

```
src/
├── app/              Fastify server bootstrap + entry point
├── routes/           Thin route handlers (no business logic)
├── modules/
│   ├── extraction/   Pipeline, prompt builder, repair logic
│   ├── artifacts/    Storage and retrieval
│   ├── providers/    LLMProvider interface + OpenAI implementation
│   └── workflows/    Status transition engine
├── db/               Drizzle schema, SQLite client, inline migrations
├── schemas/          Zod schemas — single source of truth for types
├── types/            Re-exports of inferred TypeScript types
└── lib/              ids.ts, errors.ts, logger.ts
```

**Extraction pipeline:**

```
POST /ingest or /extract
       │
       ▼
  buildExtractionPrompt()     ← prompt.ts
       │
       ▼
  provider.complete()         ← openai.ts (or any LLMProvider)
       │
       ▼
  ModelOutputSchema.parse()   ← Zod validation
       │
  ┌────┴────────────────────────────────┐
  │ valid                  │ invalid    │
  ▼                        ▼            │
saveArtifact()       repairModelOutput() ─┘
                           │
                     ┌─────┴──────┐
                     │ repaired   │ failed
                     ▼            ▼
               saveArtifact()   AppError(EXTRACTION_FAILED)
```

---

## IDs and `sigilid`

Every entity in BriefForge carries a stable, prefixed, cryptographically-secure identifier generated by [`sigilid`](https://github.com/moritzmyrz/sigilid).

| Prefix | Entity | Example |
| --- | --- | --- |
| `req_` | Ingestion request | `req_K7gkJ_q3vR2nL8xH5eM0w` |
| `run_` | Extraction run | `run_aX4_p9Qr2mNsK8vL5eJ7w` |
| `art_` | Artifact | `art_Xp9mN2qL5vR8nK3eJ7cHw` |
| `tsk_` | Action item (task) | `tsk_7mN2qLR8nK3eJvX4p5w9c` |

All generators live in [`src/lib/ids.ts`](./src/lib/ids.ts), which is the only place `sigilid` is imported. Domain code uses the re-exports from there.

`sigilid/typed` gives us **branded TypeScript types** (`IdOf<"Request">`, `IdOf<"Artifact">`, etc.), so the compiler catches ID mismatches before they reach production. `sigilid/validate` gives us `parseId()`, which validates incoming IDs at route boundaries before they touch the database.

This isn't just cosmetic. When you see `req_K7gkJ...` in a log or error message, you know immediately what kind of object is being referenced — without looking it up.

---

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | Required for AI extraction |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name |
| `OPENAI_BASE_URL` | OpenAI default | Override for compatible providers (Groq, Ollama, etc.) |
| `DATABASE_URL` | `./briefforge.db` | SQLite database path |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `LOG_LEVEL` | `info` | `trace \| debug \| info \| warn \| error` |
| `NODE_ENV` | `development` | `development \| production \| test` |

---

## CLI

Run extraction locally against a text file without starting the server:

```bash
pnpm extract ./tests/fixtures/meeting-notes.txt
pnpm extract ./my-notes.txt --model gpt-4o
```

Output:

```
BriefForge CLI
─────────────────────────────────
Request ID : req_K7gkJ_q3vR2nL8xH5eM0w
File       : /path/to/meeting-notes.txt
Model      : gpt-4o-mini
Text length: 1243 chars

Running extraction pipeline...

✓ Extraction complete

─────────────────────────────────
{
  "summary": "...",
  "actionItems": [...],
  ...
}
─────────────────────────────────

Run ID  : run_aX4_p9Qr2mNsK8vL5eJ7w
Model   : gpt-4o-mini-2024-07-18
Tokens  : 892p / 312c
Duration: 1843ms
```

---

## Using a different LLM provider

BriefForge ships with an OpenAI provider, but the interface is minimal:

```typescript
// src/modules/providers/interface.ts
export interface LLMProvider {
  readonly name: string;
  complete(prompt: string, options?: CompletionOptions): Promise<ProviderResult>;
}
```

To add a new provider, create a file in `src/modules/providers/`, implement the interface, and pass the instance to `runExtractionPipeline()`. The pipeline, repair logic, and routes don't know or care which provider is used.

You can also point the OpenAI provider at any compatible API by setting `OPENAI_BASE_URL`:

```bash
OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=llama3.2 pnpm dev
```

---

## Development

```bash
pnpm dev          # start server with hot reload
pnpm test         # run all tests
pnpm test:watch   # watch mode
pnpm lint         # Biome lint
pnpm format       # Biome format
pnpm typecheck    # tsc --noEmit
pnpm build        # production build to dist/
```

---

## Roadmap

Things that would make BriefForge more useful in real deployments:

- **Queue-based processing** — async extraction via a job queue (BullMQ, etc.) so `/ingest` is always fast
- **Webhooks** — notify downstream systems when an artifact is validated or promoted
- **Embeddings** — generate and store vector embeddings for semantic search across artifacts
- **Provider failover** — automatically retry with a fallback provider on timeout or error
- **Audit trail** — full history of status transitions and run details per artifact
- **Streaming extraction** — stream partial results as the model generates them
- **Dashboard UI** — simple read-only viewer for artifacts and runs
- **Rate limiting** — per-key limits on extraction requests
- **Batch ingestion** — accept arrays of texts in a single request

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, conventions, and the PR process.

---

## License

MIT — see [LICENSE](./LICENSE).
