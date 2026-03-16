import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    return reply.send({
      status: "ok",
      version: process.env.npm_package_version ?? "unknown",
      uptime: Math.floor(process.uptime()),
    });
  });
}
