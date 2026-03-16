import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { AppError } from "../lib/errors.js";
import logger from "../lib/logger.js";
import { artifactRoutes } from "../routes/artifacts.js";
import { extractRoutes } from "../routes/extract.js";
import { healthRoutes } from "../routes/health.js";
import { ingestRoutes } from "../routes/ingest.js";
import { requestRoutes } from "../routes/requests.js";
import { workflowRoutes } from "../routes/workflows.js";

export function buildServer() {
  const app = Fastify({
    logger: false, // We use pino directly for consistent log formatting
    disableRequestLogging: true,
  });

  // Plugins
  app.register(cors);
  app.register(sensible);

  // Request logging
  app.addHook("onRequest", (req, _reply, done) => {
    logger.info({ method: req.method, url: req.url, id: req.id }, "→ request");
    done();
  });

  app.addHook("onResponse", (req, reply, done) => {
    logger.info({ method: req.method, url: req.url, status: reply.statusCode }, "← response");
    done();
  });

  // Global error handler — normalizes AppErrors and unexpected errors into
  // a consistent { error: { code, message, details? } } envelope.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      logger.warn({ code: err.code, message: err.message }, "App error");
      return reply.code(err.statusCode).send(err.toEnvelope());
    }

    // Fastify validation errors (shouldn't happen with manual Zod validation,
    // but good to handle defensively)
    if (err.statusCode && err.statusCode < 500) {
      return reply.code(err.statusCode).send({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
    }

    logger.error({ err }, "Unhandled error");
    return reply.code(500).send({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });

  // Routes
  app.register(healthRoutes);
  app.register(ingestRoutes);
  app.register(extractRoutes);
  app.register(requestRoutes);
  app.register(artifactRoutes);
  app.register(workflowRoutes);

  return app;
}
