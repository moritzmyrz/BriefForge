import { z } from "zod";

// Reusable building blocks shared across schema files.

export const IsoTimestamp = z.string().datetime();

export const ConfidenceScore = z.number().min(0).max(1);

export const ArtifactStatus = z.enum(["pending", "validated", "rejected", "published"]);
export type ArtifactStatus = z.infer<typeof ArtifactStatus>;

export const ContentType = z.enum([
  "meeting",
  "email",
  "ticket",
  "document",
  "transcript",
  "crm_note",
  "unknown",
]);
export type ContentType = z.infer<typeof ContentType>;

export const UrgencyLevel = z.enum(["low", "medium", "high", "critical"]);
export type UrgencyLevel = z.infer<typeof UrgencyLevel>;

export const PrefixedId = (prefix: string) =>
  z.string().refine((val) => val.startsWith(`${prefix}_`), {
    message: `ID must start with "${prefix}_"`,
  });
