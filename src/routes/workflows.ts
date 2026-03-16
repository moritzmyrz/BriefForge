import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { invalidId, validationError } from "../lib/errors.js";
import { parseId } from "../lib/ids.js";
import { transitionArtifact } from "../modules/workflows/engine.js";
import { ArtifactStatus } from "../schemas/common.js";

const PromoteBodySchema = z.object({
  // Allow explicit target status, defaulting to "published"
  status: ArtifactStatus.optional().default("published"),
});

export async function workflowRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/workflows/:id/promote", async (req, reply) => {
    const { id } = req.params;

    try {
      parseId(id, { prefix: "art" });
    } catch {
      throw invalidId(id, "art");
    }

    const parse = PromoteBodySchema.safeParse(req.body ?? {});
    if (!parse.success) {
      throw validationError("Invalid request body", parse.error.flatten());
    }

    const artifact = await transitionArtifact(id, parse.data.status);
    return reply.send(artifact);
  });
}
