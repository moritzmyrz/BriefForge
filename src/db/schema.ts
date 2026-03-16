import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(), // req_...
  text: text("text").notNull(),
  metadata: text("metadata"), // JSON string
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(), // run_...
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  repaired: integer("repaired", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(), // art_...
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  // Store the full extraction result as a JSON blob.
  // Fields we query on (status, classification, urgency) are broken out as columns.
  data: text("data").notNull(),
  classification: text("classification").notNull().default("unknown"),
  urgency: text("urgency").notNull().default("low"),
  confidence: integer("confidence").notNull().default(80), // stored as 0–100 integer
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
