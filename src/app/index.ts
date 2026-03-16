import { runMigrations } from "../db/migrate.js";
import logger from "../lib/logger.js";
import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  runMigrations();

  const app = buildServer();
  await app.listen({ port, host });

  logger.info(`BriefForge listening on http://${host}:${port}`);
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
