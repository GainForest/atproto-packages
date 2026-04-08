import type { ValidationIssue } from "@gainforest/atproto-mutations-core";

/**
 * Standardized API error response structure.
 * All REST API routes should return this format for consistency with tRPC.
 */
export type ApiErrorResponse = {
  /** Error code (e.g., "VALIDATION_FAILED", "NOT_FOUND") */
  error: string;
  /** User-safe error message */
  userMessage: string;
  /** Backwards compatibility with existing clients */
  message: string;
  /** Developer-only debug message (only in development) */
  debugMessage?: string;
  /** Structured validation issues for field-level errors */
  issues?: ValidationIssue[];
};

/**
 * Creates a standardized API error response.
 * Use this instead of Response.json({ error: "..." }) for consistency.
 *
 * @param status - HTTP status code
 * @param code - Error code string (e.g., "VALIDATION_FAILED")
 * @param userMessage - User-friendly error message
 * @param debugMessage - Optional developer debug info (only included in development)
 * @param issues - Optional structured validation issues
 *
 * @example
 * ```typescript
 * // Simple error
 * return apiError(404, "NOT_FOUND", "Organization not found");
 *
 * // Validation error with issues
 * return apiError(
 *   400,
 *   "VALIDATION_FAILED",
 *   "Invalid request data. Please review and try again.",
 *   parsed.error.issues[0]?.message,
 *   zodToValidationIssues(parsed.error.issues)
 * );
 * ```
 */
export function apiError(
  status: number,
  code: string,
  userMessage: string,
  debugMessage?: string,
  issues?: ValidationIssue[]
): Response {
  const body: ApiErrorResponse = {
    error: code,
    userMessage,
    message: userMessage, // Backwards compat
    ...(process.env.NODE_ENV === "development" && debugMessage
      ? { debugMessage }
      : {}),
    ...(issues ? { issues } : {}),
  };
  return Response.json(body, { status });
}

/**
 * Convert Zod error issues to ValidationIssue[] for API consistency.
 * Maps Zod validation errors to the same format as lexicon validation errors.
 *
 * @param zodIssues - Array of Zod validation issues
 * @returns Array of ValidationIssue objects
 *
 * @example
 * ```typescript
 * const parsed = schema.safeParse(data);
 * if (!parsed.success) {
 *   const issues = zodToValidationIssues(parsed.error.issues);
 *   return apiError(400, "VALIDATION_FAILED", "Invalid data", undefined, issues);
 * }
 * ```
 */
export function zodToValidationIssues(
  zodIssues: Array<{
    path: (string | number)[];
    message: string;
    code: string;
  }>
): ValidationIssue[] {
  return zodIssues.map((issue) => ({
    code: "custom" as const,
    path: issue.path,
    message: issue.message,
  }));
}
