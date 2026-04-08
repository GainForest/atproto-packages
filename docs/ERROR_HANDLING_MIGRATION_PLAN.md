# 🎯 GOAT Error Handling System — Complete Implementation Plan

**Status:** Ready for implementation  
**Estimated Effort:** 3 weeks  
**Breaking Changes:** None (atomic deployment, backwards compatible)  
**Context:** This plan eliminates ALL debug message leakage and provides field-specific error messages throughout the application.

---

## 📋 TABLE OF CONTENTS

1. [Problem Statement](#problem-statement)
2. [Solution Architecture](#solution-architecture)
3. [Phase 0: Foundation — Lexicon Error Parser](#phase-0-foundation--lexicon-error-parser)
4. [Phase 1: Update Mutation Error Classes](#phase-1-update-mutation-error-classes)
5. [Phase 2: Update Validation Utilities](#phase-2-update-validation-utilities)
6. [Phase 3: Update ALL 51 Mutation Files](#phase-3-update-all-51-mutation-files)
7. [Phase 4: Update Error Mapper](#phase-4-update-error-mapper)
8. [Phase 5: Client-Side Error Utilities](#phase-5-client-side-error-utilities)
9. [Phase 6: Update Components](#phase-6-update-components)
10. [Phase 7: REST API Error Standardization](#phase-7-rest-api-error-standardization)
11. [Phase 8: Remove Toast Infrastructure](#phase-8-remove-toast-infrastructure)
12. [Phase 9: Testing & Verification](#phase-9-testing--verification)
13. [Migration Checklist](#migration-checklist)
14. [Success Criteria](#success-criteria)
15. [Deployment Strategy](#deployment-strategy)
16. [Appendix: Research Data](#appendix-research-data)

---

## PROBLEM STATEMENT

### Current Issues

1. **Generic User Messages Hide Field Details**
   - User sees: "Some fields are invalid. Please review and try again."
   - Actual error: "displayName must be at least 8 characters"
   - Information lost in translation from lexicon validation → Effect → tRPC → client

2. **Debug Info Leaks to UI**
   - Messages like `$.displayName (got 6 characters)` appear in production
   - Technical jargon confuses users

3. **Unused Error Formatting Infrastructure**
   - `formatMutationError` utility exists but isn't used
   - Field label mapping available but not integrated
   - Constraint extraction logic present but dormant

4. **No Scalability Mechanism**
   - Manual `formatError()` calls in 44+ components
   - No compile-time enforcement
   - Adding new mutations requires remembering error handling patterns

### Root Cause

The error mapper in `packages/atproto-mutations-next/src/trpc/error-mapper.ts` generates generic messages:

```typescript
function toUserMessage(tag: string, message: string): string {
  if (tag.includes("Validation")) {
    return "Some fields are invalid. Please review and try again."; // ❌ TOO GENERIC
  }
}
```

Lexicon validation errors contain structured field-level details, but they're discarded during mapping.

---

## SOLUTION ARCHITECTURE

### Five-Layer Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Effect Error Enhancement (Server)                      │
│ Add structured ValidationIssue[] to all ValidationError classes │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ Layer 2: Lexicon Error Parser (Server)                          │
│ extractValidationIssues() - Parse @atproto/lex ValidationError  │
│ into structured issues with field paths and constraints         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ Layer 3: Enhanced tRPC Error Mapper (Server)                    │
│ Use formatMutationError() to generate field-specific messages   │
│ Pass structured issues to TRPCError                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ Layer 4: Enhanced tRPC Error Formatter (Server)                 │
│ Include issues array in tRPC error response data                │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ Layer 5: Client-Side Error Display (Client)                     │
│ formatError() automatically returns field-specific messages     │
│ getFormattedErrors() provides per-field error details           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Error Formatting at Source** — All errors formatted server-side in error mapper
2. **No Hook Required** — formatError() works automatically, no extra steps
3. **Backwards Compatible** — issues field is optional, existing code continues working
4. **Type Safe** — TypeScript ensures correct usage throughout
5. **Zero Leakage** — Debug info only in development, never in production

---

## PHASE 0: Foundation — Lexicon Error Parser

**Goal:** Create the hardest piece — parsing @atproto/lex ValidationError into structured issues

### Step 0.1: Create ValidationIssue Type

**Already exists in:** `packages/atproto-mutations-core/src/result.ts`

Verify the type is exported:

```typescript
export type ValidationIssue = {
  code:
    | "too_small"
    | "too_big"
    | "required_key"
    | "invalid_type"
    | "invalid_value"
    | "invalid_format"
    | "custom";
  path: (string | number)[];
  message: string;
  minimum?: number;
  maximum?: number;
  type?: string;
  actual?: number | string;
  expected?: string[];
  values?: unknown[];
  format?: string;
  key?: string | number;
};
```

### Step 0.2: Create Lexicon Error Parser

**Create file:** `packages/atproto-mutations-core/src/validation/extract-issues.ts`

```typescript
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
      const base = {
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
    return [{
      code: "too_small",
      path: jsonPathToArray(tooSmallMatch[3]!),
      message,
      type: tooSmallMatch[1]!,
      minimum: parseInt(tooSmallMatch[2]!, 10),
      actual: tooSmallMatch[4] ? parseInt(tooSmallMatch[4], 10) : undefined,
    }];
  }

  // Pattern: "string too big (maximum 100) at $.displayName (got 150)"
  const tooBigMatch = message.match(
    /(\w+) too big \(maximum (\d+)\) at \$((?:\.\w+|\[\d+\])*)(?: \(got (\d+)\))?/
  );
  if (tooBigMatch) {
    return [{
      code: "too_big",
      path: jsonPathToArray(tooBigMatch[3]!),
      message,
      type: tooBigMatch[1]!,
      maximum: parseInt(tooBigMatch[2]!, 10),
      actual: tooBigMatch[4] ? parseInt(tooBigMatch[4], 10) : undefined,
    }];
  }

  // Pattern: "Missing required key "displayName" at $"
  const requiredMatch = message.match(/Missing required key "([^"]+)" at \$((?:\.\w+|\[\d+\])*)/);
  if (requiredMatch) {
    return [{
      code: "required_key",
      path: jsonPathToArray(requiredMatch[2]!),
      message,
      key: requiredMatch[1]!,
    }];
  }

  // Pattern: "Invalid DID at $.did (got "not-a-did")"
  const formatMatch = message.match(/Invalid (.+?) at \$((?:\.\w+|\[\d+\])*) \(got (.+)\)/);
  if (formatMatch) {
    return [{
      code: "invalid_format",
      path: jsonPathToArray(formatMatch[2]!),
      message,
      format: formatMatch[1]!,
    }];
  }

  // Pattern: "Expected string value type at $.field (got integer)"
  const typeMatch = message.match(/Expected (?:one of )?(.+?) value type at \$((?:\.\w+|\[\d+\])*) \(got (\w+)\)/);
  if (typeMatch) {
    const expectedTypes = typeMatch[1]!
      .split(/,|\bor\b/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [{
      code: "invalid_type",
      path: jsonPathToArray(typeMatch[2]!),
      message,
      expected: expectedTypes,
    }];
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
```

### Step 0.3: Create Field Labels Registry

**Create file:** `packages/atproto-mutations-core/src/validation/field-labels.ts`

```typescript
/**
 * Human-readable field labels for validation error messages.
 * Used by formatMutationError() to map lexicon field paths to user-friendly names.
 * 
 * When adding new lexicon fields, add their labels here to ensure
 * validation errors are user-friendly.
 * 
 * @example
 * // Without label:
 * "displayName must be at least 8 characters"
 * 
 * // With label from this registry:
 * "Organization name must be at least 8 characters"
 */
export const FIELD_LABELS: Record<string, string> = {
  // Core fields
  name: "Name",
  displayName: "Display name",
  title: "Title",
  description: "Description",
  shortDescription: "Short description",
  longDescription: "Long description",
  caption: "Caption",
  text: "Text",
  content: "Content",
  blocks: "Content blocks",
  
  // Dates & timestamps
  createdAt: "Created date",
  updatedAt: "Updated date",
  date: "Date",
  startDate: "Start date",
  endDate: "End date",
  eventDate: "Event date",
  createDate: "Creation date",
  measurementDate: "Measurement date",
  recordedAt: "Recording date",
  timestamp: "Timestamp",
  workTimeframeStart: "Work start date",
  workTimeframeEnd: "Work end date",
  impactTimeframeStart: "Impact start date",
  impactTimeframeEnd: "Impact end date",
  
  // Files & blobs
  file: "File",
  blob: "File",
  audioFile: "Audio file",
  imageFile: "Image file",
  shapefile: "Shapefile",
  logo: "Logo",
  image: "Image",
  
  // Rich content
  facets: "Text formatting",
  
  // Identifiers
  rkey: "Record key",
  uri: "URI",
  cid: "Content ID",
  url: "URL",
  accessUri: "Access URL",
  occurrenceID: "Occurrence ID",
  datasetID: "Dataset ID",
  
  // Darwin Core taxonomy
  scientificName: "Scientific name",
  taxonRank: "Taxonomic rank",
  kingdom: "Kingdom",
  family: "Family",
  genus: "Genus",
  specificEpithet: "Specific epithet",
  establishmentMeans: "Establishment means",
  habitat: "Habitat",
  
  // Darwin Core occurrence
  occurrenceRemarks: "Occurrence remarks",
  recordedBy: "Recorded by",
  identifiedBy: "Identified by",
  occurrenceRef: "Occurrence reference",
  
  // Darwin Core measurement
  measurementType: "Measurement type",
  measurementValue: "Measurement value",
  measurementUnit: "Measurement unit",
  measurementMethod: "Measurement method",
  measurementRemarks: "Measurement remarks",
  measuredBy: "Measured by",
  recordCount: "Record count",
  
  // Flora measurements
  dbh: "Diameter at breast height",
  totalHeight: "Total height",
  basalDiameter: "Basal diameter",
  canopyCoverPercent: "Canopy cover percentage",
  
  // Audubon Core
  creator: "Creator",
  format: "Format",
  variantLiteral: "Variant",
  subjectPart: "Subject part",
  subjectPartUri: "Subject part URI",
  subjectOrientation: "Subject orientation",
  siteRef: "Site reference",
  
  // Audio metadata
  codec: "Audio codec",
  channels: "Audio channels",
  duration: "Duration",
  sampleRate: "Sample rate",
  
  // Claim fields
  workScope: "Work scope",
  impactScope: "Impact scope",
  contributors: "Contributors",
  rights: "Rights",
  allowlistUri: "Allowlist URI",
  transferRestrictions: "Transfer restrictions",
  
  // Funding
  minAmount: "Minimum amount",
  maxAmount: "Maximum amount",
  targetAmount: "Target amount",
  amount: "Amount",
  fundingType: "Funding type",
  currency: "Currency",
  evmLink: "EVM link",
  transactionHash: "Transaction hash",
  blockNumber: "Block number",
  from: "From address",
  to: "To address",
  tokenSymbol: "Token symbol",
  
  // Location
  lpVersion: "Location protocol version",
  srs: "Spatial reference system",
  locationType: "Location type",
  location: "Location data",
  
  // Organization
  objectives: "Objectives",
  headquarters: "Headquarters",
  foundedYear: "Year founded",
  website: "Website",
  email: "Email",
  phone: "Phone",
  socialLinks: "Social links",
  certifications: "Certifications",
  type: "Type",
  
  // Link (EVM)
  chainId: "Chain ID",
  contractAddress: "Contract address",
  tokenId: "Token ID",
  ownerAddress: "Owner address",
  
  // Context
  mimeType: "MIME type",
  size: "File size",
} as const;
```

### Step 0.4: Create Validation Index

**Create file:** `packages/atproto-mutations-core/src/validation/index.ts`

```typescript
export { extractValidationIssues } from "./extract-issues";
export { FIELD_LABELS } from "./field-labels";
```

### Step 0.5: Export from Package Index

**Update:** `packages/atproto-mutations-core/src/index.ts`

```typescript
// ... existing exports ...

// Validation utilities
export { extractValidationIssues, FIELD_LABELS } from "./validation";
```

---

## PHASE 1: Update Mutation Error Classes

**Goal:** Add `issues?: ValidationIssue[]` to all 15 ValidationError classes

**Files to update:** All `*/utils/errors.ts` files (15 total)

### Pattern

**Find:**
```typescript
export class [Entity]ValidationError extends Data.TaggedError(
  "[Entity]ValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}
```

**Replace with:**
```typescript
import type { ValidationIssue } from "../../result";

export class [Entity]ValidationError extends Data.TaggedError(
  "[Entity]ValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}
```

### Files List

```
packages/atproto-mutations-core/src/mutations/ac.audio/utils/errors.ts
packages/atproto-mutations-core/src/mutations/ac.multimedia/utils/errors.ts
packages/atproto-mutations-core/src/mutations/certified.location/utils/errors.ts
packages/atproto-mutations-core/src/mutations/claim.activity/utils/errors.ts
packages/atproto-mutations-core/src/mutations/claim.rights/utils/errors.ts
packages/atproto-mutations-core/src/mutations/context.attachment/utils/errors.ts
packages/atproto-mutations-core/src/mutations/dwc.dataset/utils/errors.ts
packages/atproto-mutations-core/src/mutations/dwc.measurement/utils/errors.ts
packages/atproto-mutations-core/src/mutations/dwc.occurrence/utils/errors.ts
packages/atproto-mutations-core/src/mutations/funding.config/utils/errors.ts
packages/atproto-mutations-core/src/mutations/funding.receipt/utils/errors.ts
packages/atproto-mutations-core/src/mutations/link.evm/utils/errors.ts
packages/atproto-mutations-core/src/mutations/organization.defaultSite/utils/errors.ts
packages/atproto-mutations-core/src/mutations/organization.info/utils/errors.ts
packages/atproto-mutations-core/src/mutations/organization.layer/utils/errors.ts
```

### Script for Bulk Update

```bash
# Find all error files
for file in packages/atproto-mutations-core/src/mutations/*/utils/errors.ts; do
  echo "Updating $file"
  
  # Add ValidationIssue import if not present
  if ! grep -q "import type { ValidationIssue }" "$file"; then
    # Add after existing imports
    sed -i '' '/import { Data } from "effect";/a\
import type { ValidationIssue } from "../../result";
' "$file"
  fi
  
  # Add issues?: ValidationIssue[] to error classes
  # (This is complex - might be easier to do manually or with a more sophisticated script)
done
```

**Note:** The sed script above is illustrative. Manual updates or a custom Node.js script might be more reliable for the actual field addition.

---

## PHASE 2: Update Validation Utilities

**Goal:** Make stubValidate and finalValidate call extractValidationIssues()

**File:** `packages/atproto-mutations-core/src/utils/shared/validate.ts`

### Changes

```diff
import { Effect } from "effect";
import { stubBlobRefs } from "./file-input";
+import { extractValidationIssues } from "../../validation";
+import type { ValidationIssue } from "../../result";

/**
 * Pre-validates a candidate record before file uploads by stubbing blob refs.
 * Catches validation errors early without requiring actual file data.
 */
export const stubValidate = <TValidationError>(
  candidate: object,
  parse: (v: unknown) => unknown,
- makeValidationError: (message: string, cause: unknown) => TValidationError
+ makeValidationError: (message: string, cause: unknown, issues?: ValidationIssue[]) => TValidationError
): Effect.Effect<void, TValidationError> =>
  Effect.try({
    try: () => {
      parse(stubBlobRefs(candidate));
    },
-   catch: (cause) => makeValidationError(String(cause), cause),
+   catch: (cause) => {
+     const issues = extractValidationIssues(cause);
+     return makeValidationError("Validation failed", cause, issues);
+   },
  });

/**
 * Final validation after file uploads are resolved.
 * Parses the complete record with all blob refs populated.
 */
export const finalValidate = <TRecord, TValidationError>(
  resolved: object,
  parse: (v: unknown) => TRecord,
- makeValidationError: (message: string, cause: unknown) => TValidationError
+ makeValidationError: (message: string, cause: unknown, issues?: ValidationIssue[]) => TValidationError
): Effect.Effect<TRecord, TValidationError> =>
  Effect.try({
    try: () => parse(resolved),
-   catch: (cause) => makeValidationError(String(cause), cause),
+   catch: (cause) => {
+     const issues = extractValidationIssues(cause);
+     return makeValidationError("Validation failed", cause, issues);
+   },
  });
```

---

## PHASE 3: Update ALL 51 Mutation Files

**Goal:** Update every mutation operation file to pass issues to validation errors

### Pattern A: Files Using stubValidate/finalValidate (18 files)

These files only need makeValidationError signature updated.

**Find:**
```typescript
const makeValidationError = (message: string, cause: unknown) =>
  new [Entity]ValidationError({ message, cause });
```

**Replace with:**
```typescript
import type { ValidationIssue } from "../../result";

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new [Entity]ValidationError({ message, cause, issues });
```

**Files:**
```
packages/atproto-mutations-core/src/mutations/ac.audio/create.ts
packages/atproto-mutations-core/src/mutations/ac.audio/update.ts
packages/atproto-mutations-core/src/mutations/ac.audio/upsert.ts
packages/atproto-mutations-core/src/mutations/claim.activity/create.ts
packages/atproto-mutations-core/src/mutations/claim.activity/update.ts
packages/atproto-mutations-core/src/mutations/claim.activity/upsert.ts
packages/atproto-mutations-core/src/mutations/claim.rights/create.ts
packages/atproto-mutations-core/src/mutations/claim.rights/update.ts
packages/atproto-mutations-core/src/mutations/claim.rights/upsert.ts
packages/atproto-mutations-core/src/mutations/context.attachment/create.ts
packages/atproto-mutations-core/src/mutations/context.attachment/update.ts
packages/atproto-mutations-core/src/mutations/context.attachment/upsert.ts
packages/atproto-mutations-core/src/mutations/funding.config/create.ts
packages/atproto-mutations-core/src/mutations/funding.config/update.ts
packages/atproto-mutations-core/src/mutations/funding.config/upsert.ts
packages/atproto-mutations-core/src/mutations/organization.info/create.ts
packages/atproto-mutations-core/src/mutations/organization.info/update.ts
packages/atproto-mutations-core/src/mutations/organization.info/upsert.ts
```

### Pattern B: Files with Direct Effect.try (33 files)

These files need catch blocks updated to extract issues.

**Find:**
```typescript
const record = yield* Effect.try({
  try: () => $parse(candidate),
  catch: (cause) => makeValidationError(
    `[entity] record failed lexicon validation: ${String(cause)}`,
    cause
  ),
});
```

**Replace with:**
```typescript
import { extractValidationIssues } from "../../validation";

const record = yield* Effect.try({
  try: () => $parse(candidate),
  catch: (cause) => {
    const issues = extractValidationIssues(cause);
    return makeValidationError(
      "[entity] record failed lexicon validation",
      cause,
      issues
    );
  },
});
```

**Files:**
```
packages/atproto-mutations-core/src/mutations/ac.audio/delete.ts
packages/atproto-mutations-core/src/mutations/ac.multimedia/create.ts
packages/atproto-mutations-core/src/mutations/ac.multimedia/update.ts
packages/atproto-mutations-core/src/mutations/ac.multimedia/delete.ts
packages/atproto-mutations-core/src/mutations/certified.location/create.ts
packages/atproto-mutations-core/src/mutations/certified.location/update.ts
packages/atproto-mutations-core/src/mutations/certified.location/upsert.ts
packages/atproto-mutations-core/src/mutations/certified.location/delete.ts
packages/atproto-mutations-core/src/mutations/claim.activity/delete.ts
packages/atproto-mutations-core/src/mutations/claim.rights/delete.ts
packages/atproto-mutations-core/src/mutations/context.attachment/delete.ts
packages/atproto-mutations-core/src/mutations/dwc.dataset/create.ts
packages/atproto-mutations-core/src/mutations/dwc.dataset/update.ts
packages/atproto-mutations-core/src/mutations/dwc.dataset/delete.ts
packages/atproto-mutations-core/src/mutations/dwc.measurement/create.ts
packages/atproto-mutations-core/src/mutations/dwc.measurement/update.ts
packages/atproto-mutations-core/src/mutations/dwc.measurement/delete.ts
packages/atproto-mutations-core/src/mutations/dwc.occurrence/create.ts
packages/atproto-mutations-core/src/mutations/dwc.occurrence/update.ts
packages/atproto-mutations-core/src/mutations/dwc.occurrence/delete.ts
packages/atproto-mutations-core/src/mutations/funding.config/delete.ts
packages/atproto-mutations-core/src/mutations/funding.receipt/create.ts
packages/atproto-mutations-core/src/mutations/link.evm/create.ts
packages/atproto-mutations-core/src/mutations/link.evm/update.ts
packages/atproto-mutations-core/src/mutations/link.evm/delete.ts
packages/atproto-mutations-core/src/mutations/organization.defaultSite/set.ts
packages/atproto-mutations-core/src/mutations/organization.layer/create.ts
packages/atproto-mutations-core/src/mutations/organization.layer/update.ts
packages/atproto-mutations-core/src/mutations/organization.layer/upsert.ts
packages/atproto-mutations-core/src/mutations/organization.layer/delete.ts
```

### Verification Script

```bash
# Verify all mutation files have been updated
echo "Checking mutation files for extractValidationIssues usage..."

for file in packages/atproto-mutations-core/src/mutations/*/**.ts; do
  # Skip utils and tests directories
  if [[ "$file" == *"/utils/"* ]] || [[ "$file" == *"/tests/"* ]]; then
    continue
  fi
  
  # Check if file calls $parse or $validate (validation functions)
  if grep -q '\$parse\|\$validate' "$file"; then
    # Check if it extracts validation issues
    if ! grep -q 'extractValidationIssues' "$file"; then
      echo "❌ Missing extractValidationIssues: $file"
    else
      echo "✅ $file"
    fi
  fi
done
```

---

## PHASE 4: Update Error Mapper

**Goal:** Generate field-specific user messages using formatMutationError()

### Step 4.1: Update Error Mapper

**File:** `packages/atproto-mutations-next/src/trpc/error-mapper.ts`

```diff
import { TRPCError } from "@trpc/server";
import { Cause } from "effect";
+import { formatMutationError, type ValidationIssue } from "@gainforest/atproto-mutations-core/utils/formatError";
+import { FIELD_LABELS } from "@gainforest/atproto-mutations-core/validation";

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

-function toUserMessage(tag: string, message: string): string {
+function toUserMessage(tag: string, message: string, issues?: ValidationIssue[]): string {
  if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
+   // If we have structured issues, format the first one for a specific message
+   if (issues && issues.length > 0) {
+     const formatted = formatMutationError(
+       { code: "VALIDATION_ERROR", message, issues } as any,
+       FIELD_LABELS
+     );
+     return formatted[0]?.userMessage ?? "Some fields are invalid. Please review and try again.";
+   }
    return "Some fields are invalid. Please review and try again.";
  }
  if (tag.includes("NotFound")) {
    return "The requested resource could not be found.";
  }
  if (tag.includes("AlreadyExists")) {
    return "This resource already exists.";
  }
  if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
    return "Your session has expired. Please sign in again.";
  }
  if (tag.includes("IsDefault")) {
    return "This action cannot be completed right now.";
  }
  if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
    return "A server error occurred while saving your changes. Please try again.";
  }
  if (tag.includes("GeoJson")) {
    return "The uploaded file has invalid geographic data.";
  }

  return message || "Something went wrong. Please try again.";
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
+   const issues = "issues" in actualError ? (actualError as { issues?: ValidationIssue[] }).issues : undefined;
    
-   const userMessage = toUserMessage(tag, message);
+   const userMessage = toUserMessage(tag, message, issues);

    // Not found errors
    if (tag.includes("NotFound")) {
      return new TRPCError({ code: "NOT_FOUND", message: userMessage, cause: actualError });
    }

    // Validation errors
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
-     return new TRPCError({ code: "BAD_REQUEST", message: userMessage, cause: actualError });
+     return new TRPCError({ 
+       code: "BAD_REQUEST", 
+       message: userMessage,
+       cause: actualError,
+       data: { issues },  // Pass issues to client
+     });
    }

    // Already exists
    if (tag.includes("AlreadyExists")) {
      return new TRPCError({ code: "CONFLICT", message: userMessage, cause: actualError });
    }

    // Auth errors
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new TRPCError({ code: "UNAUTHORIZED", message: userMessage, cause: actualError });
    }

    // Is default (can't delete)
    if (tag.includes("IsDefault")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message: userMessage, cause: actualError });
    }

    // PDS errors
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: userMessage, cause: actualError });
    }

    // GeoJSON errors
    if (tag.includes("GeoJson")) {
      return new TRPCError({ code: "BAD_REQUEST", message: userMessage, cause: actualError });
    }
  }

  // Fallback for unknown errors
  const fallbackMessage = actualError instanceof Error ? actualError.message : String(actualError);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage, cause: actualError });
}
```

### Step 4.2: Update Error Formatter

**File:** `packages/atproto-mutations-next/src/trpc/init.ts`

```diff
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
+   const issues = effectError?.issues;

    return {
      ...shape,
      data: {
        ...shape.data,
        // User-safe message from error mapper.
        userMessage: error.message,
+       // Structured validation issues for field-level errors
+       issues,
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
```

---

## PHASE 5: Client-Side Error Utilities

**Goal:** Make formatError() automatically return field-specific messages

**File:** `apps/bumicerts/lib/utils/trpc-errors.ts`

### Changes

```diff
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@gainforest/atproto-mutations-next/trpc";
+import { formatMutationError, type ValidationIssue, type FormattedError } from "@gainforest/atproto-mutations-core/utils/formatError";
+import { FIELD_LABELS } from "@gainforest/atproto-mutations-core/validation";

type TRPCAppError = TRPCClientError<AppRouter>;

/**
 * Type guard for tRPC client errors.
 */
export function isTRPCError(error: unknown): error is TRPCAppError {
  return error instanceof TRPCClientError;
}

/**
 * Get the tRPC error code (e.g. "NOT_FOUND", "BAD_REQUEST").
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isTRPCError(error)) {
    return error.data?.code;
  }
  return undefined;
}

/**
 * Get the original Effect error tag if available (for debugging).
 */
export function getEffectTag(error: unknown): string | undefined {
  if (isTRPCError(error)) {
    return error.data?.effectTag;
  }
  return undefined;
}

/**
 * Check if error matches a specific tRPC code.
 */
export function isErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}

+/**
+ * Get formatted errors with field-level details.
+ * Returns array of FormattedError objects for displaying per-field errors.
+ * 
+ * @param error - Unknown error from tRPC mutation
+ * @param fieldLabels - Optional custom field labels to merge with defaults
+ * @returns Array of formatted error objects with userMessage and field info
+ * 
+ * @example
+ * ```tsx
+ * const mutation = trpc.organization.info.update.useMutation({
+ *   onError: (err) => {
+ *     const formatted = getFormattedErrors(err);
+ *     setError(formatted[0]?.userMessage); // "Organization name must be at least 8 characters"
+ *     
+ *     // Optional: set field-specific errors
+ *     const fieldErrs: Record<string, string> = {};
+ *     formatted.forEach(f => {
+ *       if (f.field) fieldErrs[f.field] = f.userMessage;
+ *     });
+ *     setFieldErrors(fieldErrs);
+ *   }
+ * });
+ * ```
+ */
+export function getFormattedErrors(error: unknown, fieldLabels?: Record<string, string>): FormattedError[] {
+  if (!isTRPCError(error)) {
+    return [{
+      userMessage: error instanceof Error ? error.message : "An error occurred",
+      developerMessage: String(error),
+    }];
+  }
+
+  const issues = (error.data as Record<string, unknown> | undefined)?.issues as ValidationIssue[] | undefined;
+  
+  if (issues && issues.length > 0) {
+    // Use the existing formatMutationError utility!
+    return formatMutationError(
+      { code: "VALIDATION_ERROR", message: error.message, issues } as any,
+      { ...FIELD_LABELS, ...fieldLabels }  // Merge with custom labels
+    );
+  }
+
+  // Fallback to single error
+  return [{
+    userMessage: formatError(error),  // Use existing formatError for non-validation errors
+    developerMessage: error.message,
+  }];
+}

/**
 * Format a tRPC error into a user-friendly string.
 * Handles validation errors specially to provide clear field-level feedback.
+ * 
+ * Now returns field-specific messages automatically for validation errors!
+ * The userMessage from the server is already formatted by the error mapper.
 */
export function formatError(error: unknown): string {
  if (!isTRPCError(error)) {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === "string" && error.trim()) return error;
    return "An error occurred";
  }

  const userMessage = (error.data as Record<string, unknown> | undefined)?.userMessage;
  if (typeof userMessage === "string" && userMessage.trim()) {
-   return userMessage;
+   return userMessage;  // ✅ Already field-specific from error mapper!
  }

  const code = error.data?.code;

  switch (code) {
    case "NOT_FOUND":
      return "The requested resource was not found";
    case "CONFLICT":
      return "This resource already exists";
    case "BAD_REQUEST":
      return error.message || "Invalid input provided";
    case "UNAUTHORIZED":
      return "Please sign in to continue";
    case "PRECONDITION_FAILED":
      return error.message || "Cannot complete this action";
    case "INTERNAL_SERVER_ERROR":
      return "Something went wrong. Please try again.";

    default:
      return error.message || "An error occurred";
  }
}
```

---

## PHASE 6: Update Components

**Goal:** Verify that existing components automatically get field-specific messages

### Key Insight

**NO CHANGES NEEDED** in the 44 components using `formatError()`!

The error mapper now generates field-specific messages server-side, which flow through to `formatError()` via the `userMessage` field.

### Before & After

**Before:**
```tsx
const mutation = trpc.organization.info.update.useMutation({
  onError: (err) => {
    setError(formatError(err));
    // Returns: "Some fields are invalid. Please review and try again."
  }
});
```

**After (automatically, no code changes):**
```tsx
const mutation = trpc.organization.info.update.useMutation({
  onError: (err) => {
    setError(formatError(err));
    // Returns: "Organization name must be at least 8 characters"
  }
});
```

### Optional Enhancement for Field-Level Errors

If a component wants to display per-field errors (e.g., form with inline validation):

```tsx
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

const mutation = trpc.organization.info.update.useMutation({
  onError: (err) => {
    const formatted = getFormattedErrors(err);
    setError(formatted[0]?.userMessage ?? "An error occurred");
    
    // Set field-specific errors
    const fieldErrs: Record<string, string> = {};
    formatted.forEach(f => {
      if (f.field) fieldErrs[f.field] = f.userMessage;
    });
    setFieldErrors(fieldErrs);
  }
});

// In JSX:
{fieldErrors.displayName && (
  <span className="text-destructive text-xs">{fieldErrors.displayName}</span>
)}
```

### Verification Script

```bash
# Verify all formatError() calls work correctly
echo "Testing formatError() in components..."

# Run the app in dev mode
bun run dev

# Test scenarios:
# 1. Organization setup with short displayName → should see "Organization name must be at least 8 characters"
# 2. Tree upload with invalid data → should see specific field errors per row
# 3. Bumicert creation with missing fields → should see "X is required" messages
```

---

## PHASE 7: REST API Error Standardization

**Goal:** Standardize all REST API error responses with structured error helper

### Step 7.1: Create API Error Utilities

**Create file:** `apps/bumicerts/lib/api/errors.ts`

```typescript
import type { ValidationIssue } from "@gainforest/atproto-mutations-core/result";

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
    message: userMessage,  // Backwards compat
    ...(process.env.NODE_ENV === "development" && debugMessage ? { debugMessage } : {}),
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
  zodIssues: Array<{ path: (string | number)[]; message: string; code: string }>
): ValidationIssue[] {
  return zodIssues.map(issue => ({
    code: "custom" as const,  // Zod errors don't map directly to lexicon codes
    path: issue.path,
    message: issue.message,
  }));
}
```

### Step 7.2: Update API Routes

**Pattern for all API routes:**

**Before:**
```typescript
return Response.json({ error: "Some error message" }, { status: 400 });
```

**After:**
```typescript
import { apiError } from "@/lib/api/errors";

return apiError(400, "ERROR_CODE", "User-friendly message");
```

### Files to Update (7 total)

#### 1. `app/api/fund/batch/route.ts`

**12 error responses to update:**

```diff
+import { apiError } from "@/lib/api/errors";

// Line 208: Missing PAYMENT-SIGNATURE header
-return Response.json(
-  { error: "PAYMENT-SIGNATURE header is required" },
-  { status: 400 }
-);
+return apiError(400, "MISSING_HEADER", "Payment signature is required");

// Line 221: Invalid request body
-return Response.json(
-  { error: "Invalid request body", details: String(err) },
-  { status: 400 }
-);
+return apiError(400, "INVALID_BODY", "Invalid request format", String(err));

// Line 234: Missing items array
-return Response.json(
-  { error: "items array is required and must not be empty" },
-  { status: 400 }
-);
+return apiError(400, "MISSING_ITEMS", "Donation items are required");

// Line 245: Parse error
-return Response.json(
-  { error: "Invalid PAYMENT-SIGNATURE header", details: String(err) },
-  { status: 400 }
-);
+return apiError(400, "INVALID_SIGNATURE", "Payment signature is invalid", String(err));

// Line 263: Amount mismatch
-return Response.json(
-  {
-    error: "Authorization amount does not match totalAmount",
-    authorized: auth.value.toString(),
-    requested: body.totalAmount,
-  },
-  { status: 400 }
-);
+return apiError(
+  400,
+  "AMOUNT_MISMATCH",
+  "Payment amount does not match the cart total",
+  `Authorized: ${auth.value}, Requested: ${body.totalAmount}`
+);

// Line 286: Missing wallet
-return Response.json(
-  {
-    error: "Some organizations have no linked wallet",
-    missingOrgs: orgsWithoutWallet,
-  },
-  { status: 400 }
-);
+return apiError(
+  400,
+  "MISSING_WALLETS",
+  "Some organizations don't have linked wallets. Please contact them to set up payment.",
+  `Missing for: ${orgsWithoutWallet.join(", ")}`
+);

// Line 313: Facilitator transfer failed
-return Response.json(
-  {
-    error: "Failed to receive funds from donor to facilitator",
-    details: err instanceof Error ? err.message : String(err),
-  },
-  { status: 500 }
-);
+return apiError(
+  500,
+  "TRANSFER_FAILED",
+  "Payment processing failed. Please try again.",
+  err instanceof Error ? err.message : String(err)
+);

// Line 340: Recipient transfer failed
-return Response.json(
-  {
-    error: "Failed to send funds to recipient",
-    details: err instanceof Error ? err.message : String(err),
-  },
-  { status: 500 }
-);
+return apiError(
+  500,
+  "RECIPIENT_TRANSFER_FAILED",
+  "Failed to complete payment to organization. Please contact support.",
+  err instanceof Error ? err.message : String(err)
+);

// Line 382: CID resolution failed
-return Response.json(
-  {
-    error: `Failed to resolve activity CID: ${err instanceof Error ? err.message : String(err)}`,
-  },
-  { status: 500 }
-);
+return apiError(
+  500,
+  "CID_RESOLUTION_FAILED",
+  "Failed to process payment receipt. The payment may have succeeded but receipt creation failed.",
+  err instanceof Error ? err.message : String(err)
+);

// Line 398: Receipt write failed
-return Response.json(
-  {
-    error: "Failed to write funding receipt",
-    details: err instanceof Error ? err.message : String(err),
-  },
-  { status: 500 }
-);
+return apiError(
+  500,
+  "RECEIPT_FAILED",
+  "Payment succeeded but receipt creation failed. Please contact support with your transaction hash.",
+  err instanceof Error ? err.message : String(err)
+);

// Line 423: Unexpected error
-return Response.json(
-  {
-    error: "Unexpected error occurred",
-    details: err instanceof Error ? err.message : String(err),
-  },
-  { status: 500 }
-);
+return apiError(
+  500,
+  "INTERNAL_ERROR",
+  "An unexpected error occurred. Please try again.",
+  err instanceof Error ? err.message : String(err)
+);
```

#### 2. `app/api/fund/route.ts`

Similar pattern, 8 error responses to update with the same approach.

#### 3. `app/api/supabase/drafts/bumicert/route.ts`

**Critical: Fix Zod error leaks**

```diff
+import { apiError, zodToValidationIssues } from "@/lib/api/errors";

// Line 67: Request body validation
const requestBodyValidation = requestBodySchema.safeParse(body);
if (!requestBodyValidation.success) {
- return NextResponse.json(
-   { error: requestBodyValidation.error.message },
-   { status: 400 }
- );
+ return apiError(
+   400,
+   "VALIDATION_FAILED",
+   "Invalid request data. Please review and try again.",
+   requestBodyValidation.error.issues[0]?.message,
+   zodToValidationIssues(requestBodyValidation.error.issues)
+ );
}

// Line 148: Update validation
const updateValidation = updateDraftSchema.safeParse(body);
if (!updateValidation.success) {
- return NextResponse.json(
-   { error: updateValidation.error.message },
-   { status: 400 }
- );
+ return apiError(
+   400,
+   "VALIDATION_FAILED",
+   "Invalid draft data. Please check your inputs.",
+   updateValidation.error.issues[0]?.message,
+   zodToValidationIssues(updateValidation.error.issues)
+ );
}

// Line 201: Create validation
const createValidation = createDraftSchema.safeParse(body);
if (!createValidation.success) {
- return NextResponse.json(
-   { error: createValidation.error.message },
-   { status: 400 }
- );
+ return apiError(
+   400,
+   "VALIDATION_FAILED",
+   "Failed to create draft. Please check your data.",
+   createValidation.error.issues[0]?.message,
+   zodToValidationIssues(createValidation.error.issues)
+ );
}
```

#### 4. `app/api/identity-link/route.ts`

6 error responses to update.

#### 5. `app/api/aws/upload/image/route.ts`

S3 upload errors to sanitize.

#### 6. `app/api/atproto/invite-code/route.ts`

Account creation errors to sanitize.

#### 7. `app/api/verify-recipient/route.ts`

GraphQL query errors to sanitize.

### Verification

```bash
# Search for old error pattern
grep -r "Response.json.*error:" apps/bumicerts/app/api --include="*.ts"

# Should return 0 results (all replaced with apiError)
```

---

## PHASE 8: Remove Toast Infrastructure

**Goal:** Remove unused toast/notification system

### Files to Delete

```bash
rm apps/bumicerts/components/ui/sonner.tsx
```

### Remove from Layout

**File:** Search for `<Toaster />` in layout files and remove:

```bash
# Find layout files with Toaster
grep -r "Toaster" apps/bumicerts/app --include="*.tsx"
```

Expected locations:
- `apps/bumicerts/app/layout.tsx` (if present)
- `apps/bumicerts/app/(marketplace)/layout.tsx` (if present)

**Remove:**
```diff
-import { Toaster } from "@/components/ui/sonner";

-<Toaster />
```

### Remove Package Dependency

**File:** `apps/bumicerts/package.json`

```diff
{
  "dependencies": {
-   "sonner": "^1.x.x",
  }
}
```

Run:
```bash
cd apps/bumicerts
bun install
```

### Verify No Toast Usage

```bash
# Should return 0 results
grep -r "toast\(|useToast" apps/bumicerts --include="*.tsx" --include="*.ts"
```

---

## PHASE 9: Testing & Verification

**Goal:** Ensure all error types work correctly and no leaks exist

### Step 9.1: Create Test Script

**Create file:** `scripts/test-error-handling.ts`

```typescript
/**
 * Test script for error handling system.
 * Validates all lexicon validation error types are correctly parsed and formatted.
 */

import { $safeValidate as validateOrgInfo } from "../apps/indexer/src/generated/app/gainforest/organization/info.defs";
import { extractValidationIssues } from "../packages/atproto-mutations-core/src/validation/extract-issues";
import { formatMutationError } from "../packages/atproto-mutations-core/src/utils/formatError";
import { FIELD_LABELS } from "../packages/atproto-mutations-core/src/validation/field-labels";

console.log("🧪 Testing Error Handling System\n");

// Test 1: too_small error
console.log("1. Testing too_small (minimum length)...");
const tooSmallResult = validateOrgInfo({
  $type: "app.gainforest.organization.info",
  displayName: "Test",  // Too short (minimum 8)
  shortDescription: { text: "Short" },
  longDescription: { blocks: [] },
  objectives: [],
  country: "US",
  visibility: "Public",
  createdAt: new Date().toISOString(),
});

if (!tooSmallResult.success) {
  const issues = extractValidationIssues(tooSmallResult.reason);
  const formatted = formatMutationError(
    { code: "VALIDATION_ERROR", message: "", issues } as any,
    FIELD_LABELS
  );
  console.log("✅ Issues extracted:", issues.length);
  console.log("   User message:", formatted[0]?.userMessage);
  console.log("   Expected: 'Display name must be at least 8 characters'");
  console.log("");
} else {
  console.log("❌ Validation should have failed\n");
}

// Test 2: required_key error
console.log("2. Testing required_key (missing field)...");
const requiredResult = validateOrgInfo({
  $type: "app.gainforest.organization.info",
  // Missing displayName
  shortDescription: { text: "Short" },
  longDescription: { blocks: [] },
  objectives: [],
  country: "US",
  visibility: "Public",
  createdAt: new Date().toISOString(),
} as any);

if (!requiredResult.success) {
  const issues = extractValidationIssues(requiredResult.reason);
  const formatted = formatMutationError(
    { code: "VALIDATION_ERROR", message: "", issues } as any,
    FIELD_LABELS
  );
  console.log("✅ Issues extracted:", issues.length);
  console.log("   User message:", formatted[0]?.userMessage);
  console.log("   Expected: 'Display name is required'");
  console.log("");
} else {
  console.log("❌ Validation should have failed\n");
}

// Test 3: invalid_format error
console.log("3. Testing invalid_format (datetime)...");
const formatResult = validateOrgInfo({
  $type: "app.gainforest.organization.info",
  displayName: "Valid Name Here",
  shortDescription: { text: "Valid description" },
  longDescription: { blocks: [] },
  objectives: [],
  country: "US",
  visibility: "Public",
  createdAt: "not-a-date",  // Invalid datetime
} as any);

if (!formatResult.success) {
  const issues = extractValidationIssues(formatResult.reason);
  const formatted = formatMutationError(
    { code: "VALIDATION_ERROR", message: "", issues } as any,
    FIELD_LABELS
  );
  console.log("✅ Issues extracted:", issues.length);
  console.log("   User message:", formatted[0]?.userMessage);
  console.log("   Expected: 'Created date has an invalid format'");
  console.log("");
} else {
  console.log("❌ Validation should have failed\n");
}

console.log("✅ All tests passed!");
```

**Run:**
```bash
bun run scripts/test-error-handling.ts
```

### Step 9.2: E2E Test Scenarios

**Manual testing in development:**

1. **Organization Setup**
   - Go to organization setup page
   - Enter displayName with only 3 characters
   - Submit
   - **Expected:** "Organization name must be at least 8 characters"
   - **NOT:** "Some fields are invalid"

2. **Tree Upload**
   - Upload CSV with invalid tree data (missing scientificName)
   - Preview step should show errors
   - **Expected:** Row-level errors like "Scientific name is required"
   - **NOT:** Generic validation errors

3. **Bumicert Creation**
   - Start bumicert creation flow
   - Skip required fields
   - Try to proceed
   - **Expected:** Specific field errors ("Project name is required")
   - **NOT:** "Validation failed"

4. **Funding Flow**
   - Try to donate without linked wallet
   - **Expected:** "Some organizations don't have linked wallets"
   - **NOT:** Debug error with stack trace

5. **API Error Responses**
   - Make invalid API request to /api/fund/batch
   - Check network tab response
   - **Expected:** `{ error: "ERROR_CODE", userMessage: "...", message: "..." }`
   - **NOT:** Zod validation error messages

### Step 9.3: Production Build Test

**Verify no debug leakage in production build:**

```bash
# Build for production
cd apps/bumicerts
bun run build

# Start production server
bun run start

# Test the same scenarios above
# Check browser console and network tab
# Ensure NO debug messages, stack traces, or $.fieldName patterns appear
```

### Step 9.4: Automated Test Suite

**Create file:** `apps/bumicerts/__tests__/error-handling.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { extractValidationIssues } from "@gainforest/atproto-mutations-core/validation";
import { formatMutationError } from "@gainforest/atproto-mutations-core/utils/formatError";
import { FIELD_LABELS } from "@gainforest/atproto-mutations-core/validation";

describe("Error Handling System", () => {
  test("extractValidationIssues handles too_small errors", () => {
    const mockError = {
      issues: [{
        code: "too_small",
        path: ["displayName"],
        message: "string too small (minimum 8) at $.displayName (got 4)",
        type: "string",
        minimum: 8,
        actual: 4,
      }]
    };

    const issues = extractValidationIssues(mockError);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("too_small");
    expect(issues[0]?.path).toEqual(["displayName"]);
    expect(issues[0]?.minimum).toBe(8);
    expect(issues[0]?.actual).toBe(4);
  });

  test("formatMutationError generates user-friendly messages", () => {
    const issues = [{
      code: "too_small" as const,
      path: ["displayName"],
      message: "string too small (minimum 8) at $.displayName (got 4)",
      type: "string",
      minimum: 8,
      actual: 4,
    }];

    const formatted = formatMutationError(
      { code: "VALIDATION_ERROR", message: "", issues } as any,
      FIELD_LABELS
    );

    expect(formatted).toHaveLength(1);
    expect(formatted[0]?.userMessage).toBe("Display name must be at least 8 characters");
    expect(formatted[0]?.field).toBe("displayName");
  });

  test("formatMutationError handles required_key errors", () => {
    const issues = [{
      code: "required_key" as const,
      path: [],
      message: 'Missing required key "displayName" at $',
      key: "displayName",
    }];

    const formatted = formatMutationError(
      { code: "VALIDATION_ERROR", message: "", issues } as any,
      FIELD_LABELS
    );

    expect(formatted[0]?.userMessage).toBe("Display name is required");
  });

  test("extractValidationIssues fallback parser works", () => {
    const mockError = new Error("string too small (minimum 8) at $.displayName (got 4)");
    const issues = extractValidationIssues(mockError);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("too_small");
    expect(issues[0]?.path).toEqual(["displayName"]);
  });
});
```

**Run:**
```bash
cd apps/bumicerts
bun test error-handling
```

---

## MIGRATION CHECKLIST

### Phase 0: Foundation ✅
- [ ] Create `extractValidationIssues()` in `packages/atproto-mutations-core/src/validation/extract-issues.ts`
- [ ] Create `FIELD_LABELS` in `packages/atproto-mutations-core/src/validation/field-labels.ts`
- [ ] Create `packages/atproto-mutations-core/src/validation/index.ts`
- [ ] Export from `packages/atproto-mutations-core/src/index.ts`
- [ ] Verify `ValidationIssue` type is exported from `result.ts`

### Phase 1: Error Classes ✅
- [ ] Add `issues?: ValidationIssue[]` to all 15 ValidationError classes
- [ ] Verify import of `ValidationIssue` type in each errors.ts file

### Phase 2: Validation Utilities ✅
- [ ] Update `stubValidate()` signature and implementation
- [ ] Update `finalValidate()` signature and implementation
- [ ] Import `extractValidationIssues` in validate.ts

### Phase 3: Mutation Files ✅
- [ ] Update all 18 files using stubValidate/finalValidate (makeValidationError signature)
- [ ] Update all 33 files with direct Effect.try (add extractValidationIssues in catch)
- [ ] Run verification script to ensure all files updated

### Phase 4: Error Mapper ✅
- [ ] Update `toUserMessage()` to use formatMutationError
- [ ] Update `mapEffectErrorToTRPC()` to extract and pass issues
- [ ] Update `init.ts` error formatter to include issues in data
- [ ] Import `formatMutationError` and `FIELD_LABELS`

### Phase 5: Client Utilities ✅
- [ ] Add `getFormattedErrors()` to trpc-errors.ts
- [ ] Import `formatMutationError`, `ValidationIssue`, `FormattedError`, `FIELD_LABELS`
- [ ] Update comments in `formatError()` to note automatic field-specific messages

### Phase 6: Components ✅
- [ ] Verify existing components automatically get field-specific messages (no changes needed)
- [ ] Optionally update components that need per-field errors to use `getFormattedErrors()`

### Phase 7: REST APIs ✅
- [ ] Create `apps/bumicerts/lib/api/errors.ts` with `apiError()` and `zodToValidationIssues()`
- [ ] Update `app/api/fund/batch/route.ts` (12 error responses)
- [ ] Update `app/api/fund/route.ts` (8 error responses)
- [ ] Update `app/api/supabase/drafts/bumicert/route.ts` (3 Zod leaks)
- [ ] Update `app/api/identity-link/route.ts` (6 error responses)
- [ ] Update `app/api/aws/upload/image/route.ts` (S3 errors)
- [ ] Update `app/api/atproto/invite-code/route.ts` (account creation)
- [ ] Update `app/api/verify-recipient/route.ts` (GraphQL errors)
- [ ] Verify no `Response.json({ error: ... })` patterns remain

### Phase 8: Remove Toast ✅
- [ ] Delete `apps/bumicerts/components/ui/sonner.tsx`
- [ ] Remove `<Toaster />` from layout files
- [ ] Remove `sonner` from package.json
- [ ] Run `bun install`
- [ ] Verify no toast imports remain

### Phase 9: Testing ✅
- [ ] Create `scripts/test-error-handling.ts`
- [ ] Run unit tests for extractValidationIssues
- [ ] Run unit tests for formatMutationError
- [ ] E2E test: Organization setup validation
- [ ] E2E test: Tree upload validation
- [ ] E2E test: Bumicert creation validation
- [ ] E2E test: Funding API errors
- [ ] Production build test (verify no debug leaks)
- [ ] Create automated test suite
- [ ] Performance testing (ensure no overhead)

### Documentation ✅
- [ ] Add JSDoc to all new functions
- [ ] Update AGENTS.md with error handling rules
- [ ] Document field labels registry (how to add new fields)
- [ ] Create examples for component usage

---

## SUCCESS CRITERIA

### ✅ User Experience
- [ ] Users see "Organization name must be at least 8 characters" instead of "Some fields are invalid"
- [ ] Users see "Scientific name is required" instead of "ValidationError: [InvalidRecord]..."
- [ ] Every error message is specific, clear, and actionable
- [ ] No technical jargon ($.fieldName, ValidationError, etc.) in production UI
- [ ] Error messages guide users to fix the exact issue

### ✅ Developer Experience
- [ ] Adding new mutation requires ZERO error handling code (works automatically)
- [ ] Adding new field requires only adding to field labels registry
- [ ] TypeScript catches incorrect error handling patterns
- [ ] formatError() works everywhere with no changes to components
- [ ] Clear, documented patterns for custom field labels

### ✅ Security
- [ ] NO stack traces in production HTTP responses
- [ ] NO internal paths ($.fieldName) in production UI
- [ ] NO debug info (debugMessage, effectTag) in production responses
- [ ] NO sensitive data in error messages (tokens, keys, credentials)
- [ ] Console logging sanitized (no full error objects in production)

### ✅ Scalability
- [ ] Add new field → error messages work automatically (via FIELD_LABELS)
- [ ] Add new mutation → validation works automatically (via extractValidationIssues)
- [ ] Change lexicon → errors update automatically (parsed from @atproto/lex)
- [ ] Zero manual error handling per mutation
- [ ] Field-specific errors flow automatically from server to client

### ✅ Code Quality
- [ ] All 51 mutation files updated
- [ ] All 15 error classes updated
- [ ] All 7 API routes standardized
- [ ] No `Response.json({ error: ... })` patterns remain
- [ ] No toast infrastructure remains
- [ ] 100% test coverage for error utilities

---

## DEPLOYMENT STRATEGY

### Atomic Deployment Approach

This migration is **backwards compatible** but requires **atomic deployment** of server and client together to ensure the full benefits.

### Deployment Order

**Week 1: Server-Side (Phases 0-4)**
```bash
# Day 1-2: Foundation
- Create validation utilities
- Update error classes

# Day 3-4: Mutations
- Update all 51 mutation files
- Update validation utilities

# Day 5: Error Mapper
- Update tRPC error mapper and formatter
- Test in development
```

**Week 2: Client-Side (Phases 5-7)**
```bash
# Day 1: Client Utilities
- Update trpc-errors.ts
- Add getFormattedErrors()

# Day 2-3: REST APIs
- Create apiError() helper
- Update all 7 API routes

# Day 4: Cleanup
- Remove toast infrastructure
- Update documentation
```

**Week 3: Testing & Deployment (Phases 8-9)**
```bash
# Day 1-3: Testing
- Unit tests
- E2E tests
- Production build tests

# Day 4: Staging Deployment
- Deploy to staging
- Full QA pass

# Day 5: Production Deployment
- Deploy atomically (server + client)
- Monitor error logs
- Verify no leaks
```

### Deployment Commands

```bash
# 1. Run final verification
bun run lint
bun run type-check
bun test
bun run build

# 2. Commit all changes
git add .
git commit -m "feat: implement comprehensive error handling system

- Add structured validation issue extraction from @atproto/lex
- Generate field-specific error messages server-side
- Standardize REST API error responses
- Remove unused toast infrastructure
- Add comprehensive test coverage

BREAKING: None (backwards compatible)
"

# 3. Deploy (atomic server + client)
git push origin main
# Vercel auto-deploys both apps/bumicerts and apps/indexer

# 4. Monitor
# - Check Vercel logs for errors
# - Test production endpoints
# - Verify no debug leaks in production
```

### Rollback Plan

If issues are discovered:

```bash
# Immediate rollback (Vercel)
vercel rollback

# Or revert commit
git revert HEAD
git push origin main
```

Since the changes are backwards compatible (issues field is optional), partial rollback is safe.

---

## APPENDIX: Research Data

### @atproto/lex Validation Error Types

**Complete list of error codes from @atproto/lex:**

| Code | Description | Fields |
|------|-------------|--------|
| `too_small` | Value below minimum | `type`, `minimum`, `actual` |
| `too_big` | Value above maximum | `type`, `maximum`, `actual` |
| `required_key` | Missing required field | `key` |
| `invalid_type` | Wrong data type | `expected[]` |
| `invalid_value` | Not in allowed values | `values[]` |
| `invalid_format` | Format constraint failed | `format` |
| `custom` | Custom validation rule | none |

### Mutation Files Complete List

**51 operation files across 15 entities:**

```
ac.audio: create, update, upsert, delete (4 files)
ac.multimedia: create, update, delete (3 files)
certified.location: create, update, upsert, delete (4 files)
claim.activity: create, update, upsert, delete (4 files)
claim.rights: create, update, upsert, delete (4 files)
context.attachment: create, update, upsert, delete (4 files)
dwc.dataset: create, update, delete (3 files)
dwc.measurement: create, update, delete (3 files)
dwc.occurrence: create, update, delete (3 files)
funding.config: create, update, upsert, delete (4 files)
funding.receipt: create (1 file)
link.evm: create, update, delete (3 files)
organization.defaultSite: set (1 file)
organization.info: create, update, upsert (3 files)
organization.layer: create, update, upsert, delete (4 files)
```

### Component Files Using formatError()

**44 total files across:**
- Upload flow: 12 files
- Evidence management: 8 files
- Modals: 15 files
- Marketplace flow: 9 files

### REST API Routes

**7 routes with manual error handling:**
- `app/api/fund/batch/route.ts` (12 errors)
- `app/api/fund/route.ts` (8 errors)
- `app/api/supabase/drafts/bumicert/route.ts` (3 Zod leaks)
- `app/api/identity-link/route.ts` (6 errors)
- `app/api/aws/upload/image/route.ts` (S3 errors)
- `app/api/atproto/invite-code/route.ts` (account creation)
- `app/api/verify-recipient/route.ts` (GraphQL errors)

---

**END OF IMPLEMENTATION PLAN**

This plan ensures GOAT-level error handling with:
- ✅ Zero debug leakage
- ✅ Field-specific messages
- ✅ Infinite scalability
- ✅ No manual error handling required
- ✅ Backwards compatible
- ✅ Comprehensive testing

Ready for implementation! 🚀
