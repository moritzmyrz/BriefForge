import { z } from "zod";
import { ArtifactStatus, ConfidenceScore, IsoTimestamp, UrgencyLevel } from "./common.js";

export const ActionItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(), // ISO date candidate extracted from text
  priority: UrgencyLevel,
  confidence: ConfidenceScore,
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const DecisionSchema = z.object({
  id: z.string(),
  description: z.string(),
  madeBy: z.string().optional(),
  rationale: z.string().optional(),
  confidence: ConfidenceScore,
});
export type Decision = z.infer<typeof DecisionSchema>;

export const EntitySchema = z.object({
  id: z.string(),
  value: z.string(),
  type: z.enum(["person", "organization", "location", "date", "product", "other"]),
  confidence: ConfidenceScore,
});
export type Entity = z.infer<typeof EntitySchema>;

// An Artifact is the top-level extracted result from one ingestion request.
export const ArtifactSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  runId: z.string(),
  summary: z.string(),
  actionItems: z.array(ActionItemSchema),
  decisions: z.array(DecisionSchema),
  entities: z.array(EntitySchema),
  classification: z.enum([
    "meeting",
    "email",
    "ticket",
    "document",
    "transcript",
    "crm_note",
    "unknown",
  ]),
  urgency: UrgencyLevel,
  tags: z.array(z.string()),
  confidence: ConfidenceScore,
  status: ArtifactStatus,
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
});
export type Artifact = z.infer<typeof ArtifactSchema>;
