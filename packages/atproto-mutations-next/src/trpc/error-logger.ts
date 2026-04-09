import type { TRPCError } from "@trpc/server";

type OnErrorParams = {
  path: string | undefined;
  error: TRPCError;
};

/**
 * Logs tRPC errors with both user-friendly and developer-friendly info.
 * 
 * - `userMessage`: The sanitized message shown to users
 * - `cause`: The original error details for debugging (tag, message, nested causes, stack in dev)
 * 
 * Use this in fetchRequestHandler's onError callback.
 */
export function logTRPCError({ path, error }: OnErrorParams): void {
  const isDev = process.env.NODE_ENV === "development";
  
  /**
   * Recursively extract the cause chain to show the full error trail.
   * 
   * For PDS errors, the chain typically looks like:
   * OrganizationInfoPdsError -> FetchError -> Undici/Node internal error
   * 
   * This extracts all levels so developers can see the root cause.
   */
  function extractCauseChain(err: unknown, depth = 0): Record<string, unknown> | undefined {
    // Prevent infinite loops and overly deep chains
    if (depth > 5 || !err) return undefined;
    
    if (err && typeof err === "object") {
      const tag = "_tag" in err ? (err as { _tag: string })._tag : undefined;
      const message = err instanceof Error ? err.message : 
        "message" in err ? String((err as { message: unknown }).message) : String(err);
      const nestedCause = "cause" in err ? (err as { cause: unknown }).cause : undefined;
      
      const result: Record<string, unknown> = { message };
      
      if (tag) {
        result.tag = tag;
      }
      
      if (nestedCause) {
        const extracted = extractCauseChain(nestedCause, depth + 1);
        if (extracted) {
          result.cause = extracted;
        }
      }
      
      if (isDev && err instanceof Error && err.stack) {
        result.stack = err.stack;
      }
      
      return result;
    }
    
    return typeof err === "string" ? { message: err } : undefined;
  }

  const causeInfo = extractCauseChain(error.cause);

  const logData: Record<string, unknown> = {
    code: error.code,
    userMessage: error.message,
  };

  if (causeInfo) {
    logData.cause = causeInfo;
  }

  if (isDev && error.stack) {
    logData.stack = error.stack;
  }

  console.error(`tRPC error on ${path ?? "<no-path>"}:`, logData);
}
