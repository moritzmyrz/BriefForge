// Domain types are inferred from Zod schemas — single source of truth.
// Import types from here rather than from the schema files directly.

export type { ArtifactStatus, ContentType, UrgencyLevel } from "../schemas/common.js";

export type { IngestBody, IngestionRequest } from "../schemas/ingestion.js";

export type { ActionItem, Artifact, Decision, Entity } from "../schemas/artifact.js";

export type {
  ExtractionRun,
  ModelOutput,
  ProviderResult,
} from "../schemas/extraction.js";

export type { ArtifactId, RequestId, RunId, TaskId } from "../lib/ids.js";
