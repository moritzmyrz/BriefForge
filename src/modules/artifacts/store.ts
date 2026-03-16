import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { artifacts, requests, runs } from "../../db/schema.js";
import { notFound } from "../../lib/errors.js";
import { newArtifactId, newTaskId } from "../../lib/ids.js";
import { ArtifactSchema as ArtifactValidator } from "../../schemas/artifact.js";
import type { IngestionRequest } from "../../schemas/ingestion.js";
import type { ActionItem, Artifact, Decision, Entity } from "../../types/index.js";
import type { PipelineResult } from "../extraction/pipeline.js";

function now(): string {
  return new Date().toISOString();
}

/**
 * Persist an ingestion request to the database.
 */
export async function createRequest(
  id: string,
  text: string,
  metadata?: IngestionRequest["metadata"],
): Promise<void> {
  const ts = now();
  await db.insert(requests).values({
    id,
    text,
    metadata: metadata ? JSON.stringify(metadata) : null,
    status: "pending",
    createdAt: ts,
    updatedAt: ts,
  });
}

/**
 * Fetch a single request by ID. Throws a 404 AppError if not found.
 */
export async function getRequest(id: string): Promise<IngestionRequest> {
  const row = await db.query.requests.findFirst({ where: eq(requests.id, id) });
  if (!row) throw notFound("Request", id);

  return {
    id: row.id,
    text: row.text,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    status: row.status as IngestionRequest["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Persist the extraction run record.
 */
export async function saveRun(result: PipelineResult, requestId: string): Promise<void> {
  await db.insert(runs).values({
    id: result.runId,
    requestId,
    provider: result.provider,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    durationMs: result.durationMs,
    repaired: result.repaired,
    status: "success",
    createdAt: now(),
  });
}

/**
 * Build and persist an Artifact from a successful pipeline run.
 * Sub-items (action items, decisions, entities) get stable sigilid IDs.
 */
export async function saveArtifact(requestId: string, result: PipelineResult): Promise<Artifact> {
  const artifactId = newArtifactId() as string;
  const ts = now();
  const { output } = result;

  const actionItems: ActionItem[] = output.actionItems.map((item) => ({
    ...item,
    id: newTaskId() as string,
  }));

  const decisions: Decision[] = output.decisions.map((d, i) => ({
    ...d,
    id: `dec_${result.runId.slice(4, 12)}_${i}`,
  }));

  const entities: Entity[] = output.entities.map((e, i) => ({
    ...e,
    id: `ent_${result.runId.slice(4, 12)}_${i}`,
  }));

  const artifact: Artifact = {
    id: artifactId,
    requestId,
    runId: result.runId,
    summary: output.summary,
    actionItems,
    decisions,
    entities,
    classification: output.classification,
    urgency: output.urgency,
    tags: output.tags,
    confidence: output.confidence,
    status: "validated",
    createdAt: ts,
    updatedAt: ts,
  };

  await db.insert(artifacts).values({
    id: artifactId,
    requestId,
    runId: result.runId,
    data: JSON.stringify(artifact),
    classification: output.classification,
    urgency: output.urgency,
    confidence: Math.round(output.confidence * 100),
    status: "validated",
    createdAt: ts,
    updatedAt: ts,
  });

  // Mark the source request as validated
  await db
    .update(requests)
    .set({ status: "validated", updatedAt: ts })
    .where(eq(requests.id, requestId));

  return artifact;
}

/**
 * Fetch an artifact by ID. Parses and validates the stored JSON blob.
 */
export async function getArtifact(id: string): Promise<Artifact> {
  const row = await db.query.artifacts.findFirst({ where: eq(artifacts.id, id) });
  if (!row) throw notFound("Artifact", id);

  const parsed = ArtifactValidator.parse(JSON.parse(row.data));
  return parsed;
}

/**
 * Update an artifact's status directly (used by the workflow engine).
 */
export async function updateArtifactStatus(
  id: string,
  status: Artifact["status"],
): Promise<Artifact> {
  const ts = now();

  // Load, update the blob, and write back — keeps the data column authoritative.
  const current = await getArtifact(id);
  const updated: Artifact = { ...current, status, updatedAt: ts };

  await db
    .update(artifacts)
    .set({ status, data: JSON.stringify(updated), updatedAt: ts })
    .where(eq(artifacts.id, id));

  return updated;
}
