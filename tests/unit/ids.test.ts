import { describe, expect, it } from "vitest";
import { newArtifactId, newRequestId, newRunId, newTaskId, parseId } from "../../src/lib/ids.js";

describe("ID generators", () => {
  it("newRequestId produces req_ prefix", () => {
    const id = newRequestId() as string;
    expect(id).toMatch(/^req_/);
  });

  it("newRunId produces run_ prefix", () => {
    const id = newRunId() as string;
    expect(id).toMatch(/^run_/);
  });

  it("newArtifactId produces art_ prefix", () => {
    const id = newArtifactId() as string;
    expect(id).toMatch(/^art_/);
  });

  it("newTaskId produces tsk_ prefix", () => {
    const id = newTaskId() as string;
    expect(id).toMatch(/^tsk_/);
  });

  it("generates unique IDs on repeated calls", () => {
    const ids = Array.from({ length: 100 }, () => newRequestId() as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it("generated IDs are URL-safe", () => {
    const id = newArtifactId() as string;
    // After the prefix_, the rest should only contain URL-safe chars
    const suffix = id.slice(4); // "art_" = 4 chars
    expect(suffix).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("parseId", () => {
  it("accepts a valid req_ ID", () => {
    const id = newRequestId() as string;
    expect(() => parseId(id, { prefix: "req" })).not.toThrow();
  });

  it("rejects an art_ ID when expecting req_", () => {
    const id = newArtifactId() as string;
    expect(() => parseId(id, { prefix: "req" })).toThrow();
  });

  it("rejects an arbitrary string", () => {
    expect(() => parseId("not-an-id", { prefix: "req" })).toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => parseId("", { prefix: "art" })).toThrow();
  });
});
