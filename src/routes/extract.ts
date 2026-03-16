import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { invalidId, validationError } from "../lib/errors.js";
import { parseId } from "../lib/ids.js";
import { getRequest, saveArtifact, saveRun } from "../modules/artifacts/store.js";
import { runExtractionPipeline } from "../modules/extraction/pipeline.js";
import { getDefaultProvider } from "../modules/providers/openai.js";

const ExtractBodySchema = z.object({
  requestId: z.string(),
  // Optional provider override for power users
  model: z.string().optional(),
});

export async function extractRoutes(app: FastifyInstance) {
  app.post("/extract", async (req, reply) => {
    const parse = ExtractBodySchema.safeParse(req.body);
    if (!parse.success) {
      throw validationError("Invalid request body", parse.error.flatten());
    }

    const { requestId } = parse.data;

    // Validate the incoming ID at the boundary before touching the DB
    try {
      parseId(requestId, { prefix: "req" });
    } catch {
      throw invalidId(requestId, "req");
    }

    const request = await getRequest(requestId);
    const provider = getDefaultProvider();
    const result = await runExtractionPipeline(request, provider);

    await saveRun(result, requestId);
    const artifact = await saveArtifact(requestId, result);

    return reply.code(201).send({
      runId: result.runId,
      artifact,
      meta: {
        model: result.model,
        provider: result.provider,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        durationMs: result.durationMs,
        repaired: result.repaired,
      },
    });
  });
}
