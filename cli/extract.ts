#!/usr/bin/env tsx
/**
 * Local extraction CLI — runs the full pipeline against a text file without
 * starting the API server. Useful for quick testing and demos.
 *
 * Usage:
 *   pnpm extract <file> [--model gpt-4o]
 *   pnpm extract ./examples/payloads/meeting-notes.txt
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runMigrations } from "../src/db/migrate.js";
import { newRequestId } from "../src/lib/ids.js";
import { runExtractionPipeline } from "../src/modules/extraction/pipeline.js";
import { OpenAIProvider } from "../src/modules/providers/openai.js";

const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
  console.error("Usage: pnpm extract <file> [--model <model-name>]");
  process.exit(1);
}

const modelFlagIdx = args.indexOf("--model");
const modelOverride = modelFlagIdx !== -1 ? args[modelFlagIdx + 1] : undefined;

async function main() {
  const absolutePath = resolve(filePath as string);
  let text: string;

  try {
    text = readFileSync(absolutePath, "utf-8").trim();
  } catch {
    console.error(`Could not read file: ${absolutePath}`);
    process.exit(1);
  }

  if (text.length < 10) {
    console.error("File is too short to extract from (minimum 10 characters).");
    process.exit(1);
  }

  runMigrations();

  const requestId = newRequestId() as string;
  const provider = new OpenAIProvider(undefined, undefined, modelOverride);

  console.log("\nBriefForge CLI");
  console.log("─────────────────────────────────");
  console.log(`Request ID : ${requestId}`);
  console.log(`File       : ${absolutePath}`);
  console.log(`Model      : ${modelOverride ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini"}`);
  console.log(`Text length: ${text.length} chars\n`);
  console.log("Running extraction pipeline...\n");

  const start = Date.now();

  try {
    const result = await runExtractionPipeline(
      {
        id: requestId,
        text,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      provider,
    );

    const elapsed = Date.now() - start;

    console.log("✓ Extraction complete\n");
    console.log("─────────────────────────────────");
    console.log(JSON.stringify(result.output, null, 2));
    console.log("─────────────────────────────────");
    console.log(`\nRun ID  : ${result.runId}`);
    console.log(`Model   : ${result.model}`);
    console.log(`Tokens  : ${result.promptTokens}p / ${result.completionTokens}c`);
    console.log(`Duration: ${elapsed}ms`);
    if (result.repaired) console.log("⚠ Output was repaired before validation");
  } catch (err) {
    console.error("\nExtraction failed:");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
