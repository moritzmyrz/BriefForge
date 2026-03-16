import type { ProviderResult } from "../../schemas/extraction.js";

export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  // If true, tell the provider to return JSON (e.g. OpenAI response_format)
  jsonMode?: boolean;
}

/**
 * Minimal interface any LLM provider must implement.
 * Adding a new provider (Anthropic, Gemini, Ollama) means implementing this
 * interface and passing the instance to the pipeline.
 */
export interface LLMProvider {
  readonly name: string;
  complete(prompt: string, options?: CompletionOptions): Promise<ProviderResult>;
}
