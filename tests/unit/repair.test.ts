import { describe, expect, it, vi } from "vitest";
import { repairModelOutput } from "../../src/modules/extraction/repair.js";
import type { LLMProvider } from "../../src/modules/providers/interface.js";
import { ModelOutputSchema } from "../../src/schemas/extraction.js";

function makeMockProvider(returnValue: unknown): LLMProvider {
  return {
    name: "mock",
    complete: vi.fn().mockResolvedValue({
      rawContent: JSON.stringify(returnValue),
      parsed: returnValue,
      promptTokens: 10,
      completionTokens: 20,
      model: "mock-model",
      durationMs: 5,
    }),
  };
}

const validOutput = {
  summary: "A valid summary.",
  actionItems: [],
  decisions: [],
  entities: [],
  classification: "meeting",
  urgency: "low",
  confidence: 0.9,
  tags: [],
};

describe("repairModelOutput", () => {
  it("recovers from a fixable partial output via lenient parse", async () => {
    // Missing some optional fields — Zod defaults should fill them in
    const partial = { summary: "Partial but recoverable." };
    const originalError = ModelOutputSchema.safeParse(null);
    if (originalError.success) throw new Error("expected failure");

    // Trigger the lenient parse path by passing something Zod can default-fill
    const _partialParse = ModelOutputSchema.safeParse(partial);
    // This should actually succeed with defaults — simulate a partial that
    // only fails the strict first pass by passing a ZodError from null
    const { error } = ModelOutputSchema.safeParse({ summary: "" });
    if (!error) throw new Error("expected zod error");

    const provider = makeMockProvider(validOutput);
    const result = await repairModelOutput(partial, JSON.stringify(partial), provider, error);

    expect(result.repaired).toBe(true);
    expect(result.output.summary).toBe("Partial but recoverable.");
  });

  it("uses the provider for a second-pass repair when lenient parse fails", async () => {
    const badInput = { notSummary: "wrong shape" };
    const { error } = ModelOutputSchema.safeParse(badInput);
    if (!error) throw new Error("expected zod error");

    const provider = makeMockProvider(validOutput);
    const result = await repairModelOutput(badInput, JSON.stringify(badInput), provider, error);

    expect(result.repaired).toBe(true);
    expect(result.output.summary).toBe("A valid summary.");
    expect(provider.complete).toHaveBeenCalledOnce();
  });

  it("throws when both repair attempts fail", async () => {
    const badInput = { completely: "wrong" };
    const { error } = ModelOutputSchema.safeParse(badInput);
    if (!error) throw new Error("expected zod error");

    // Provider returns something still invalid
    const provider = makeMockProvider({ still: "bad" });

    await expect(
      repairModelOutput(badInput, JSON.stringify(badInput), provider, error),
    ).rejects.toThrow("could not be repaired");
  });
});
