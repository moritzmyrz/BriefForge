import type { FastifyInstance } from "fastify";
import { invalidId } from "../lib/errors.js";
import { parseId } from "../lib/ids.js";
import { getRequest } from "../modules/artifacts/store.js";

export async function requestRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/requests/:id", async (req, reply) => {
    const { id } = req.params;

    try {
      parseId(id, { prefix: "req" });
    } catch {
      throw invalidId(id, "req");
    }

    const request = await getRequest(id);
    return reply.send(request);
  });
}
