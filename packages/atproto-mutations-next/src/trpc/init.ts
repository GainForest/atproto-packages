import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "./context";

export const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // error.cause is the Effect tagged error (e.g. OrganizationInfoPdsError).
    // error.cause.cause is the raw underlying error (e.g. XRPCError from @atproto/api).
    const effectError = error.cause as Record<string, unknown> | undefined;
    const rawCause =
      effectError && typeof effectError === "object" && "cause" in effectError
        ? effectError.cause
        : undefined;

    // Extract structured validation issues if present
    const issues =
      effectError && typeof effectError === "object" && "issues" in effectError
        ? effectError.issues
        : undefined;

    return {
      ...shape,
      data: {
        ...shape.data,
        // User-safe message from error mapper (now field-specific for validation errors).
        userMessage: error.message,
        // Structured validation issues for field-level error display
        issues,
        // Include the original Effect error tag if available for debugging
        effectTag:
          effectError && typeof effectError === "object" && "_tag" in effectError
            ? String(effectError._tag)
            : undefined,
        // Keep the original tagged error message for developer diagnostics.
        debugMessage:
          effectError &&
          typeof effectError === "object" &&
          "message" in effectError &&
          typeof effectError.message === "string"
            ? effectError.message
            : undefined,
        // Include the raw PDS / upstream error message for debugging
        causeMessage:
          rawCause instanceof Error ? rawCause.message : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
