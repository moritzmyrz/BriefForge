import { z } from "zod";
import { ConfidenceScore, ContentType, IsoTimestamp, UrgencyLevel } from "./common.js";

// The shape we expect the LLM to return — validated strictly before storage.
export const RawActionItemSchema = z.object({
  description: z.string().min(1),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  priority: UrgencyLevel.default("medium"),
  confidence: ConfidenceScore.default(0.8),
});

export const RawDecisionSchema = z.object({
  description: z.string().min(1),
  madeBy: z.string().optional(),
  rationale: z.string().optional(),
  confidence: ConfidenceScore.default(0.8),
});

export const RawEntitySchema = z.object({
  value: z.string().min(1),
  type: z.enum(["person", "organization", "location", "date", "product", "other"]),
  confidence: ConfidenceScore.default(0.8),
});

// This is the schema we validate against when the model returns JSON.
export const ModelOutputSchema = z.object({
  summary: z.string().min(1),
  actionItems: z.array(RawActionItemSchema).default([]),
  decisions: z.array(RawDecisionSchema).default([]),
  entities: z.array(RawEntitySchema).default([]),
  classification: ContentType.default("unknown"),
  urgency: UrgencyLevel.default("low"),
  confidence: ConfidenceScore.default(0.8),
  tags: z.array(z.string()).default([]),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

// The run record stored in DB, tracking what happened during extraction.
export const ExtractionRunSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  provider: z.string(),
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  repaired: z.boolean(),
  status: z.enum(["success", "failed"]),
  error: z.string().optional(),
  createdAt: IsoTimestamp,
});
export type ExtractionRun = z.infer<typeof ExtractionRunSchema>;

// What the provider returns before we validate it against ModelOutputSchema.
export const ProviderResultSchema = z.object({
  rawContent: z.string(),
  parsed: z.unknown(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  model: z.string(),
  durationMs: z.number().int().nonnegative(),
});
export type ProviderResult = z.infer<typeof ProviderResultSchema>;
