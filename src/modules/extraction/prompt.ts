import type { IngestBody } from "../../schemas/ingestion.js";

/**
 * Builds the extraction prompt. Keeping prompt logic here means it's testable
 * and can be iterated without touching the pipeline or provider code.
 */
export function buildExtractionPrompt(text: string, metadata?: IngestBody["metadata"]): string {
  const contextHints: string[] = [];

  if (metadata?.source) contextHints.push(`Source: ${metadata.source}`);
  if (metadata?.author) contextHints.push(`Author: ${metadata.author}`);
  if (metadata?.contentType) contextHints.push(`Content type hint: ${metadata.contentType}`);

  const contextBlock = contextHints.length > 0 ? `\nContext:\n${contextHints.join("\n")}\n` : "";

  return `You are a precise information extraction assistant. Extract structured data from the following text and return it as a single valid JSON object matching the schema below. Do not include any explanation or markdown — only the raw JSON object.

${contextBlock}
Text to analyze:
---
${text}
---

Return a JSON object with exactly these fields:
{
  "summary": "A clear 1–3 sentence summary of the content",
  "actionItems": [
    {
      "description": "What needs to be done",
      "assignee": "Person responsible (optional)",
      "dueDate": "ISO date string if mentioned (optional)",
      "priority": "low | medium | high | critical",
      "confidence": 0.0–1.0
    }
  ],
  "decisions": [
    {
      "description": "What was decided",
      "madeBy": "Who made the decision (optional)",
      "rationale": "Why (optional)",
      "confidence": 0.0–1.0
    }
  ],
  "entities": [
    {
      "value": "The entity value",
      "type": "person | organization | location | date | product | other",
      "confidence": 0.0–1.0
    }
  ],
  "classification": "meeting | email | ticket | document | transcript | crm_note | unknown",
  "urgency": "low | medium | high | critical",
  "confidence": 0.0–1.0,
  "tags": ["tag1", "tag2"]
}

Rules:
- actionItems, decisions, entities, and tags may be empty arrays if nothing is present.
- confidence values reflect how certain you are about that specific extraction.
- The top-level confidence reflects overall extraction quality.
- Only extract what is genuinely present in the text. Do not invent information.`;
}
