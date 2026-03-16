import { z } from "zod";
import { ArtifactStatus, ContentType, IsoTimestamp } from "./common.js";

export const IngestBodySchema = z.object({
  text: z.string().min(10, "Text must be at least 10 characters").max(50_000),
  // Optional metadata the caller can attach — passed through to extraction context
  metadata: z
    .object({
      source: z.string().optional(),
      author: z.string().optional(),
      contentType: ContentType.optional(),
      tags: z.array(z.string()).max(20).optional(),
    })
    .optional(),
  // If true, kick off extraction immediately (synchronous)
  extractImmediately: z.boolean().default(false),
});
export type IngestBody = z.infer<typeof IngestBodySchema>;

export const IngestionRequestSchema = z.object({
  id: z.string(),
  text: z.string(),
  metadata: z
    .object({
      source: z.string().optional(),
      author: z.string().optional(),
      contentType: ContentType.optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  status: ArtifactStatus,
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
});
export type IngestionRequest = z.infer<typeof IngestionRequestSchema>;
