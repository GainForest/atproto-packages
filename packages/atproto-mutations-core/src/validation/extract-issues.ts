import type { ValidationIssue } from "../result";

/**
 * Extracts structured validation issues from @atproto/lex ValidationError.
 * Handles ALL lexicon validation error types with field-level precision.
 *
 * @atproto/lex ValidationError structure:
 * {
 *   name: "ValidationError",
 *   message: string,  // Concatenated issue messages
 *   issues: Issue[]   // Array of structured validation issues
 * }
 *
 * @param error - Unknown error from lexicon $parse() validation
 * @returns Array of structured ValidationIssue objects
 *
 * @example
 * ```typescript
 * import { $parse } from "@gainforest/generated/app/gainforest/organization/info.defs";
 *
 * try {
 *   $parse({ displayName: "Test" }); // Too short
 * } catch (error) {
 *   const issues = extractValidationIssues(error);
 *   // [{
 *   //   code: "too_small",
 *   //   path: ["displayName"],
 *   //   message: "string too small (minimum 8) at $.displayName (got 4)",
 *   //   type: "string",
 *   //   minimum: 8,
 *   //   actual: 4
 *   // }]
 * }
 * ```
 */
export function extractValidationIssues(error: unknown): ValidationIssue[] {
  // Check if error has @atproto/lex ValidationError shape
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    const lexError = error as {
      issues: Array<{
        code: string;
        path: (string | number)[];
        message: string;
        [key: string]: unknown;
      }>;
    };

    return lexError.issues.map((issue) => {
      const base: ValidationIssue = {
        code: issue.code as ValidationIssue["code"],
        path: issue.path,
        message: issue.message,
      };

      // Extract type-specific fields based on error code
      switch (issue.code) {
        case "too_small":
          return {
            ...base,
            type: (issue.type as string) || "string",
            minimum: (issue.minimum as number) || 0,
            actual: issue.actual as number | undefined,
          };

        case "too_big":
          return {
            ...base,
            type: (issue.type as string) || "string",
            maximum: (issue.maximum as number) || 0,
            actual: issue.actual as number | undefined,
          };

        case "required_key":
          return {
            ...base,
            key: issue.key as string | number,
          };

        case "invalid_type":
          return {
            ...base,
            expected: (issue.expected as string[]) || [],
          };

        case "invalid_value":
          return {
            ...base,
            values: issue.values as unknown[],
          };

        case "invalid_format":
          return {
            ...base,
            format: (issue.format as string) || "unknown",
          };

        default:
          return base;
      }
    });
  }

  // Fallback: try to parse error message (for older @atproto/lex versions or manual errors)
  return parseErrorMessageFallback(error);
}

/**
 * Fallback parser for when structured issues aren't available.
 * Uses regex patterns to extract field info from error message strings.
 *
 * This handles cases where:
 * - @atproto/lex version doesn't include structured issues
 * - Error is thrown manually with just a message string
 * - Error is from a different validation library
 */
function parseErrorMessageFallback(error: unknown): ValidationIssue[] {
  const message = error instanceof Error ? error.message : String(error);

  // Pattern: "string too small (minimum 8) at $.displayName (got 6)"
  const tooSmallMatch = message.match(
    /(\w+) too small \(minimum (\d+)\) at \$((?:\.\w+|\[\d+\])*)(?: \(got (\d+)\))?/
  );
  if (tooSmallMatch) {
    return [
      {
        code: "too_small",
        path: jsonPathToArray(tooSmallMatch[3]!),
        message,
        type: tooSmallMatch[1]!,
        minimum: parseInt(tooSmallMatch[2]!, 10),
        actual: tooSmallMatch[4]
          ? parseInt(tooSmallMatch[4], 10)
          : undefined,
      },
    ];
  }

  // Pattern: "string too big (maximum 100) at $.displayName (got 150)"
  const tooBigMatch = message.match(
    /(\w+) too big \(maximum (\d+)\) at \$((?:\.\w+|\[\d+\])*)(?: \(got (\d+)\))?/
  );
  if (tooBigMatch) {
    return [
      {
        code: "too_big",
        path: jsonPathToArray(tooBigMatch[3]!),
        message,
        type: tooBigMatch[1]!,
        maximum: parseInt(tooBigMatch[2]!, 10),
        actual: tooBigMatch[4]
          ? parseInt(tooBigMatch[4], 10)
          : undefined,
      },
    ];
  }

  // Pattern: "Missing required key "displayName" at $"
  const requiredMatch = message.match(
    /Missing required key "([^"]+)" at \$((?:\.\w+|\[\d+\])*)/
  );
  if (requiredMatch) {
    return [
      {
        code: "required_key",
        path: jsonPathToArray(requiredMatch[2]!),
        message,
        key: requiredMatch[1]!,
      },
    ];
  }

  // Pattern: "Invalid DID at $.did (got "not-a-did")"
  const formatMatch = message.match(
    /Invalid (.+?) at \$((?:\.\w+|\[\d+\])*) \(got (.+)\)/
  );
  if (formatMatch) {
    return [
      {
        code: "invalid_format",
        path: jsonPathToArray(formatMatch[2]!),
        message,
        format: formatMatch[1]!,
      },
    ];
  }

  // Pattern: "Expected string value type at $.field (got integer)"
  const typeMatch = message.match(
    /Expected (?:one of )?(.+?) value type at \$((?:\.\w+|\[\d+\])*) \(got (\w+)\)/
  );
  if (typeMatch) {
    const expectedTypes = typeMatch[1]!
      .split(/,|\bor\b/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [
      {
        code: "invalid_type",
        path: jsonPathToArray(typeMatch[2]!),
        message,
        expected: expectedTypes,
      },
    ];
  }

  // Couldn't parse — return empty array
  return [];
}

/**
 * Converts JSONPath string to array of path segments.
 *
 * @param path - JSONPath string (e.g., ".displayName", ".parent.child", ".items[0]")
 * @returns Array of path segments
 *
 * @example
 * jsonPathToArray("") → []
 * jsonPathToArray(".displayName") → ["displayName"]
 * jsonPathToArray(".parent.child") → ["parent", "child"]
 * jsonPathToArray(".items[0]") → ["items", 0]
 */
function jsonPathToArray(path: string): (string | number)[] {
  if (!path) return [];

  const segments: (string | number)[] = [];
  const parts = path.split(/\.|\[|\]/).filter(Boolean);

  for (const part of parts) {
    const asNumber = parseInt(part, 10);
    segments.push(isNaN(asNumber) ? part : asNumber);
  }

  return segments;
}
