import { describe, expect, it } from "vitest";
import { ArtifactSchema } from "../../src/schemas/artifact.js";
import { ArtifactStatus } from "../../src/schemas/common.js";
import { ModelOutputSchema } from "../../src/schemas/extraction.js";
import { IngestBodySchema } from "../../src/schemas/ingestion.js";

describe("IngestBodySchema", () => {
  it("accepts valid minimal input", () => {
    const result = IngestBodySchema.safeParse({ text: "This is a valid meeting note." });
    expect(result.success).toBe(true);
  });

  it("rejects text that is too short", () => {
    const result = IngestBodySchema.safeParse({ text: "Short" });
    expect(result.success).toBe(false);
  });

  it("defaults extractImmediately to false", () => {
    const result = IngestBodySchema.safeParse({ text: "Valid text input here." });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.extractImmediately).toBe(false);
  });

  it("accepts metadata with optional fields", () => {
    const result = IngestBodySchema.safeParse({
      text: "Meeting note text here.",
      metadata: { source: "slack", author: "Alice", tags: ["q1", "planning"] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects text exceeding max length", () => {
    const result = IngestBodySchema.safeParse({ text: "x".repeat(50_001) });
    expect(result.success).toBe(false);
  });
});

describe("ModelOutputSchema", () => {
  it("accepts a well-formed model response", () => {
    const result = ModelOutputSchema.safeParse({
      summary: "Team decided to ship v2 next Friday.",
      actionItems: [
        {
          description: "Update the changelog",
          priority: "medium",
          confidence: 0.9,
        },
      ],
      decisions: [],
      entities: [{ value: "Alice", type: "person", confidence: 0.95 }],
      classification: "meeting",
      urgency: "medium",
      confidence: 0.87,
      tags: ["release", "v2"],
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for missing optional fields", () => {
    const result = ModelOutputSchema.safeParse({
      summary: "A quick summary.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionItems).toEqual([]);
      expect(result.data.decisions).toEqual([]);
      expect(result.data.tags).toEqual([]);
      expect(result.data.classification).toBe("unknown");
    }
  });

  it("rejects an empty summary", () => {
    const result = ModelOutputSchema.safeParse({ summary: "" });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside 0-1 range", () => {
    const result = ModelOutputSchema.safeParse({
      summary: "A summary.",
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid urgency value", () => {
    const result = ModelOutputSchema.safeParse({
      summary: "Summary.",
      urgency: "super-urgent",
    });
    expect(result.success).toBe(false);
  });
});

describe("ArtifactStatus", () => {
  it("accepts all valid statuses", () => {
    for (const status of ["pending", "validated", "rejected", "published"] as const) {
      expect(ArtifactStatus.safeParse(status).success).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(ArtifactStatus.safeParse("archived").success).toBe(false);
  });
});

describe("ArtifactSchema", () => {
  const validArtifact = {
    id: "art_abc123",
    requestId: "req_xyz789",
    runId: "run_def456",
    summary: "Meeting summary here.",
    actionItems: [],
    decisions: [],
    entities: [],
    classification: "meeting",
    urgency: "low",
    tags: [],
    confidence: 0.9,
    status: "validated",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("accepts a valid artifact", () => {
    expect(ArtifactSchema.safeParse(validArtifact).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const { summary: _omit, ...noSummary } = validArtifact;
    expect(ArtifactSchema.safeParse(noSummary).success).toBe(false);
  });
});
