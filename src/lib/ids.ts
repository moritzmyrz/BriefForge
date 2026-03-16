import { createTypedGenerator } from "sigilid/typed";
import type { IdOf } from "sigilid/typed";
import { parseId } from "sigilid/validate";

// Prefixed ID generators — one per domain entity type.
// All sigilid imports are centralized here; domain code only imports from this module.
export const newRequestId = createTypedGenerator<"Request">("req");
export const newRunId = createTypedGenerator<"Run">("run");
export const newArtifactId = createTypedGenerator<"Artifact">("art");
export const newTaskId = createTypedGenerator<"Task">("tsk");

// Branded ID types for compile-time entity safety.
// TypeScript will refuse to let you pass a RunId where a RequestId is expected.
export type RequestId = IdOf<"Request">;
export type RunId = IdOf<"Run">;
export type ArtifactId = IdOf<"Artifact">;
export type TaskId = IdOf<"Task">;

// Re-export parseId so callers can validate incoming IDs without importing sigilid directly.
export { parseId };
