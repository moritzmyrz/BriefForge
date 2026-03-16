import type { ZodError } from "zod";
import { extractionFailed } from "../../lib/errors.js";
import logger from "../../lib/logger.js";
import { type ModelOutput, ModelOutputSchema } from "../../schemas/extraction.js";
import type { LLMProvider } from "../providers/interface.js";

/**
 * Attempts to coerce a partial or slightly malformed model output into a valid
 * ModelOutput. The strategy is:
 *
 * 1. Try a lenient parse: strip unknown keys, apply Zod defaults where possible.
 * 2. If that still fails, ask the model to fix its own output with a focused prompt.
 * 3. If the second attempt fails, throw with diagnostics.
 *
 * This keeps the happy path fast (no repair needed) while giving the pipeline
 * resilience against occasional model formatting drift.
 */
export async function repairModelOutput(
  raw: unknown,
  rawContent: string,
  provider: LLMProvider,
  originalError: ZodError,
): Promise<{ output: ModelOutput; repaired: boolean }> {
  // Step 1: try a lenient parse — Zod defaults fill in missing optional fields
  const lenientResult = ModelOutputSchema.safeParse(raw);
  if (lenientResult.success) {
    logger.debug("Repair: lenient parse succeeded");
    return { output: lenientResult.data, repaired: true };
  }

  logger.warn({ issues: originalError.issues }, "Model output invalid — attempting repair via LLM");

  // Step 2: ask the model to fix its output
  const repairPrompt = buildRepairPrompt(rawContent, originalError);

  let repairResult: Awaited<ReturnType<typeof provider.complete>>;
  try {
    repairResult = await provider.complete(repairPrompt, { jsonMode: true, temperature: 0 });
  } catch (err) {
    throw extractionFailed("Repair call failed", { originalError: originalError.issues, err });
  }

  const repairParse = ModelOutputSchema.safeParse(repairResult.parsed);
  if (repairParse.success) {
    logger.info("Repair: second-pass LLM repair succeeded");
    return { output: repairParse.data, repaired: true };
  }

  throw extractionFailed("Model output could not be repaired after two attempts", {
    originalIssues: originalError.issues,
    repairIssues: repairParse.error.issues,
    rawContent,
  });
}

function buildRepairPrompt(rawContent: string, error: ZodError): string {
  const issues = error.issues
    .slice(0, 5)
    .map((i) => `- ${i.path.join(".")}: ${i.message}`)
    .join("\n");

  return `The following JSON failed schema validation. Fix it and return only the corrected JSON object with no explanation.

Validation errors:
${issues}

Original JSON:
${rawContent}

Return only the fixed JSON object matching this schema: { summary, actionItems, decisions, entities, classification, urgency, confidence, tags }`;
}
