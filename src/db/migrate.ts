import { sql } from "drizzle-orm";
import logger from "../lib/logger.js";
import { db } from "./client.js";

/**
 * Runs lightweight inline migrations on startup.
 * We use raw SQL here rather than drizzle-kit migration files to keep the setup
 * dependency-free for contributors — no migration runner step required.
 *
 * Migrations run on the shared db client so that the same SQLite connection
 * (including :memory: in tests) gets the schema.
 */
export function runMigrations() {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS requests (
      id          TEXT PRIMARY KEY,
      text        TEXT NOT NULL,
      metadata    TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS runs (
      id                 TEXT PRIMARY KEY,
      request_id         TEXT NOT NULL REFERENCES requests(id),
      provider           TEXT NOT NULL,
      model              TEXT NOT NULL,
      prompt_tokens      INTEGER NOT NULL DEFAULT 0,
      completion_tokens  INTEGER NOT NULL DEFAULT 0,
      duration_ms        INTEGER NOT NULL DEFAULT 0,
      repaired           INTEGER NOT NULL DEFAULT 0,
      status             TEXT NOT NULL,
      error              TEXT,
      created_at         TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS artifacts (
      id              TEXT PRIMARY KEY,
      request_id      TEXT NOT NULL REFERENCES requests(id),
      run_id          TEXT NOT NULL REFERENCES runs(id),
      data            TEXT NOT NULL,
      classification  TEXT NOT NULL DEFAULT 'unknown',
      urgency         TEXT NOT NULL DEFAULT 'low',
      confidence      INTEGER NOT NULL DEFAULT 80,
      status          TEXT NOT NULL DEFAULT 'pending',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    )
  `);

  logger.info("Database migrations applied");
}
