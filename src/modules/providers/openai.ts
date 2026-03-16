import OpenAI from "openai";
import { providerError } from "../../lib/errors.js";
import type { ProviderResult } from "../../schemas/extraction.js";
import type { CompletionOptions, LLMProvider } from "./interface.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, baseUrl?: string, defaultModel?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      ...(baseUrl && { baseURL: baseUrl }),
    });
    this.defaultModel = defaultModel ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<ProviderResult> {
    const model = options.model ?? this.defaultModel;
    const start = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.2,
        ...(options.jsonMode && { response_format: { type: "json_object" } }),
      });

      const choice = response.choices[0];
      if (!choice) {
        throw providerError("Provider returned no choices");
      }

      const rawContent = choice.message.content ?? "";
      let parsed: unknown = null;

      try {
        parsed = JSON.parse(rawContent);
      } catch {
        // Parsed stays null; pipeline will attempt repair
      }

      return {
        rawContent,
        parsed,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        model: response.model,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw providerError(`OpenAI API error ${err.status}: ${err.message}`, {
          status: err.status,
          code: err.code,
        });
      }
      throw err;
    }
  }
}

// Singleton for use in production; tests can inject their own instance.
let _defaultProvider: OpenAIProvider | null = null;

export function getDefaultProvider(): OpenAIProvider {
  if (!_defaultProvider) {
    _defaultProvider = new OpenAIProvider();
  }
  return _defaultProvider;
}
