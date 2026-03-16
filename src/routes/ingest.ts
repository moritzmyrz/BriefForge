import type { FastifyInstance } from "fastify";
import { validationError } from "../lib/errors.js";
import { newRequestId } from "../lib/ids.js";
import { createRequest, saveArtifact, saveRun } from "../modules/artifacts/store.js";
import { runExtractionPipeline } from "../modules/extraction/pipeline.js";
import { getDefaultProvider } from "../modules/providers/openai.js";
import { IngestBodySchema } from "../schemas/ingestion.js";

export async function ingestRoutes(app: FastifyInstance) {
  app.post("/ingest", async (req, reply) => {
    const parse = IngestBodySchema.safeParse(req.body);
    if (!parse.success) {
      throw validationError("Invalid request body", parse.error.flatten());
    }

    const { text, metadata, extractImmediately } = parse.data;
    const requestId = newRequestId() as string;

    await createRequest(requestId, text, metadata);

    if (!extractImmediately) {
      return reply.code(202).send({
        requestId,
        status: "pending",
        message: "Request accepted. POST /extract with this requestId to run extraction.",
      });
    }

    // Synchronous extraction path
    const provider = getDefaultProvider();
    const ingestionRequest = {
      id: requestId,
      text,
      metadata,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await runExtractionPipeline(ingestionRequest, provider);
    await saveRun(result, requestId);
    const artifact = await saveArtifact(requestId, result);

    return reply.code(201).send({ requestId, artifact });
  });
}
