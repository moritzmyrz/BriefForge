export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "PROVIDER_ERROR"
  | "EXTRACTION_FAILED"
  | "REPAIR_FAILED"
  | "INVALID_ID"
  | "INVALID_STATUS_TRANSITION"
  | "INTERNAL_ERROR";

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toEnvelope(): ErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
      },
    };
  }
}

export function notFound(entity: string, id: string): AppError {
  return new AppError("NOT_FOUND", `${entity} not found: ${id}`, 404);
}

export function invalidId(id: string, expectedPrefix: string): AppError {
  return new AppError(
    "INVALID_ID",
    `Invalid ID "${id}". Expected a "${expectedPrefix}_..." prefixed identifier.`,
    400,
  );
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError("VALIDATION_ERROR", message, 400, details);
}

export function providerError(message: string, details?: unknown): AppError {
  return new AppError("PROVIDER_ERROR", message, 502, details);
}

export function extractionFailed(message: string, details?: unknown): AppError {
  return new AppError("EXTRACTION_FAILED", message, 422, details);
}
