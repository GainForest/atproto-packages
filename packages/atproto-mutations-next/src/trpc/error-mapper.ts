import { TRPCError } from "@trpc/server";
import { Cause } from "effect";

// Symbol used by Effect to store the Cause in FiberFailure
const FiberFailureCauseSymbol = Symbol.for("effect/Runtime/FiberFailure/Cause");

/**
 * Extracts the actual error from an Effect FiberFailure.
 * Effect wraps errors in FiberFailure when runPromise rejects.
 * The actual tagged error is buried inside: FiberFailure[Symbol] -> Cause -> failure
 */
function extractEffectError(error: unknown): unknown {
  if (error && typeof error === "object" && FiberFailureCauseSymbol in error) {
    const cause = (error as Record<symbol, unknown>)[FiberFailureCauseSymbol];
    if (cause && Cause.isCause(cause)) {
      // Cause.squash extracts the primary failure from the Cause
      return Cause.squash(cause);
    }
  }
  return error;
}

/**
 * Maps Effect tagged errors to TRPCError.
 * Preserves original error in cause for debugging.
 */
export function mapEffectErrorToTRPC(error: unknown): TRPCError {
  // Extract the actual error from Effect's FiberFailure wrapper
  const actualError = extractEffectError(error);

  if (actualError && typeof actualError === "object" && "_tag" in actualError) {
    const tag = (actualError as { _tag: string })._tag;
    const message =
      "message" in actualError ? String((actualError as { message: unknown }).message) : tag;

    // Not found errors
    if (tag.includes("NotFound")) {
      return new TRPCError({ code: "NOT_FOUND", message, cause: actualError });
    }

    // Validation errors
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new TRPCError({ code: "BAD_REQUEST", message, cause: actualError });
    }

    // Already exists
    if (tag.includes("AlreadyExists")) {
      return new TRPCError({ code: "CONFLICT", message, cause: actualError });
    }

    // Auth errors
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new TRPCError({ code: "UNAUTHORIZED", message, cause: actualError });
    }

    // Is default (can't delete)
    if (tag.includes("IsDefault")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message, cause: actualError });
    }

    // PDS errors
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: actualError });
    }

    // GeoJSON errors
    if (tag.includes("GeoJson")) {
      return new TRPCError({ code: "BAD_REQUEST", message, cause: actualError });
    }
  }

  // Fallback for unknown errors
  const fallbackMessage = actualError instanceof Error ? actualError.message : String(actualError);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage, cause: actualError });
}
