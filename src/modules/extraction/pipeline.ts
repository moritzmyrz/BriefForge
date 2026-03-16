import { newRunId } from "../../lib/ids.js";
import logger from "../../lib/logger.js";
import { ModelOutputSchema } from "../../schemas/extraction.js";
import type { IngestionRequest } from "../../schemas/ingestion.js";
import type { LLMProvider } from "../providers/interface.js";
import { buildExtractionPrompt } from "./prompt.js";
import { repairModelOutput } from "./repair.js";

export interface PipelineResult {
  runId: string;
  output: import("../../schemas/extraction.js").ModelOutput;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  repaired: boolean;
  model: string;
  provider: string;
}

/**
 * The core extraction pipeline. One run per ingestion request.
 *
 * Flow: build prompt → call provider → validate output → repair if needed → return
 *
 * All LLM interaction is isolated here; routes and stores don't touch the provider directly.
 */
export async function runExtractionPipeline(
  request: IngestionRequest,
  provider: LLMProvider,
): Promise<PipelineResult> {
  const runId = newRunId();
  const start = Date.now();

  logger.info({ runId, requestId: request.id }, "Starting extraction run");

  const prompt = buildExtractionPrompt(request.text, request.metadata);

  const providerResult = await provider.complete(prompt, {
    jsonMode: true,
    temperature: 0.2,
  });

  logger.debug(
    { runId, tokens: providerResult.promptTokens + providerResult.completionTokens },
    "Provider call complete",
  );

  // First-pass validation
  const parseResult = ModelOutputSchema.safeParse(providerResult.parsed);

  let output: import("../../schemas/extraction.js").ModelOutput;
  let repaired = false;

  if (parseResult.success) {
    output = parseResult.data;
  } else {
    // Try to fix the output before giving up
    const repairResult = await repairModelOutput(
      providerResult.parsed,
      providerResult.rawContent,
      provider,
      parseResult.error,
    );
    output = repairResult.output;
    repaired = repairResult.repaired;
  }

  const totalDuration = Date.now() - start;

  logger.info(
    { runId, requestId: request.id, repaired, durationMs: totalDuration },
    "Run complete",
  );

  return {
    runId: runId as string,
    output,
    promptTokens: providerResult.promptTokens,
    completionTokens: providerResult.completionTokens,
    durationMs: totalDuration,
    repaired,
    model: providerResult.model,
    provider: provider.name,
  };
}
