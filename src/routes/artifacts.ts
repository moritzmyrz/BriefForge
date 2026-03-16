import type { FastifyInstance } from "fastify";
import { invalidId } from "../lib/errors.js";
import { parseId } from "../lib/ids.js";
import { getArtifact } from "../modules/artifacts/store.js";

export async function artifactRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/artifacts/:id", async (req, reply) => {
    const { id } = req.params;

    try {
      parseId(id, { prefix: "art" });
    } catch {
      throw invalidId(id, "art");
    }

    const artifact = await getArtifact(id);
    return reply.send(artifact);
  });
}
