import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../../src/app/server.js";
import { runMigrations } from "../../src/db/migrate.js";

let app: FastifyInstance;

beforeAll(async () => {
  // vitest.config.ts sets DATABASE_URL=":memory:" for tests
  runMigrations();
  app = buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });
});

describe("POST /ingest", () => {
  it("returns 202 for a valid text input (no immediate extraction)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ingest",
      payload: {
        text: "This is a meeting note about the quarterly planning session.",
        metadata: { source: "slack", author: "Alice" },
      },
    });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.requestId).toMatch(/^req_/);
    expect(body.status).toBe("pending");
  });

  it("returns 400 for text that is too short", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ingest",
      payload: { text: "Short" },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing text field", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ingest",
      payload: { metadata: { source: "email" } },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /requests/:id", () => {
  it("returns the request after ingestion", async () => {
    const ingest = await app.inject({
      method: "POST",
      url: "/ingest",
      payload: { text: "Another test input for retrieval verification." },
    });
    const { requestId } = ingest.json();

    const res = await app.inject({ method: "GET", url: `/requests/${requestId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(requestId);
    expect(body.text).toBe("Another test input for retrieval verification.");
  });

  it("returns 400 for a non-req_ ID", async () => {
    const res = await app.inject({ method: "GET", url: "/requests/art_something" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_ID");
  });

  it("returns 404 for an unknown req_ ID", async () => {
    const res = await app.inject({ method: "GET", url: "/requests/req_doesnotexist00" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });
});

describe("GET /artifacts/:id", () => {
  it("returns 400 for a non-art_ ID", async () => {
    const res = await app.inject({ method: "GET", url: "/artifacts/req_something" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_ID");
  });

  it("returns 404 for an unknown artifact ID", async () => {
    const res = await app.inject({ method: "GET", url: "/artifacts/art_doesnotexist00" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });
});

describe("POST /extract", () => {
  it("returns 400 for a non-req_ requestId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/extract",
      payload: { requestId: "not-a-valid-id" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /workflows/:id/promote", () => {
  it("returns 400 for a non-art_ ID", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workflows/req_something/promote",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_ID");
  });

  it("returns 404 for an unknown artifact", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workflows/art_doesnotexist00/promote",
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });
});
