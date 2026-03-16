import { AppError } from "../../lib/errors.js";
import type { Artifact, ArtifactStatus } from "../../types/index.js";
import { getArtifact, updateArtifactStatus } from "../artifacts/store.js";

/**
 * Valid status transitions. The system only allows forward movement.
 *
 *   pending → validated → published
 *   pending → rejected
 *   validated → rejected
 */
const ALLOWED_TRANSITIONS: Record<ArtifactStatus, readonly ArtifactStatus[]> = {
  pending: ["validated", "rejected"],
  validated: ["published", "rejected"],
  rejected: [],
  published: [],
};

function assertTransitionAllowed(from: ArtifactStatus, to: ArtifactStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new AppError(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition artifact from "${from}" to "${to}". Allowed: ${allowed.join(", ") || "none"}`,
      409,
    );
  }
}

/**
 * Promote an artifact to "published".
 * The artifact must currently be in "validated" status.
 */
export async function promoteArtifact(id: string): Promise<Artifact> {
  const artifact = await getArtifact(id);
  assertTransitionAllowed(artifact.status, "published");
  return updateArtifactStatus(id, "published");
}

/**
 * Reject an artifact. Works from "pending" or "validated".
 */
export async function rejectArtifact(id: string): Promise<Artifact> {
  const artifact = await getArtifact(id);
  assertTransitionAllowed(artifact.status, "rejected");
  return updateArtifactStatus(id, "rejected");
}

/**
 * Apply an arbitrary status transition — used when the caller specifies the
 * target status explicitly (e.g. from the workflow route).
 */
export async function transitionArtifact(id: string, to: ArtifactStatus): Promise<Artifact> {
  const artifact = await getArtifact(id);
  assertTransitionAllowed(artifact.status, to);
  return updateArtifactStatus(id, to);
}
