import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL ?? "./briefforge.db";

const sqlite = new Database(url);

// WAL mode gives significantly better concurrent read performance.
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
