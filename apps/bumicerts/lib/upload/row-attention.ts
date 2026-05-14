import type {
  RowError,
  TreeUploadRowAttentionKind,
  TreeUploadRowAttentionSummary,
  ValidatedRow,
} from "./types";

const FALLBACK_ROW_ISSUE_MESSAGE = "This row needs review.";

function normalizeRowMessages(messages: readonly string[]): string[] {
  const normalized = messages
    .map((message) => message.trim())
    .filter((message) => message.length > 0);

  return normalized.length > 0 ? normalized : [FALLBACK_ROW_ISSUE_MESSAGE];
}

export function getMappedRowLabel(
  rowIndex: number,
  row: Record<string, string> | undefined,
): string {
  const scientificName = row?.scientificName?.trim() ?? "";

  return scientificName.length > 0 ? scientificName : `Row ${rowIndex + 1}`;
}

export function getValidatedRowLabel(row: ValidatedRow): string {
  const scientificName = row.occurrence.scientificName.trim();

  return scientificName.length > 0 ? scientificName : `Row ${row.index + 1}`;
}

export function createTreeUploadRowAttentionSummary(input: {
  sourceRowIndex: number;
  rowLabel: string;
  messages: readonly string[];
  kind: TreeUploadRowAttentionKind;
}): TreeUploadRowAttentionSummary {
  const rowLabel = input.rowLabel.trim();

  return {
    sourceRowIndex: input.sourceRowIndex,
    rowLabel:
      rowLabel.length > 0 ? rowLabel : `Row ${input.sourceRowIndex + 1}`,
    messages: normalizeRowMessages(input.messages),
    kind: input.kind,
  };
}

export function getTreeUploadRowAttentionKindLabel(
  kind: TreeUploadRowAttentionKind,
): string {
  switch (kind) {
    case "failed":
      return "Failed";
    case "partial":
      return "Needs follow-up";
    case "skipped":
      return "Skipped";
  }
}

export function buildPreviewRowAttentionSummaries(
  errors: RowError[],
  mappedRows: Record<string, string>[],
): TreeUploadRowAttentionSummary[] {
  return errors.map((error) =>
    createTreeUploadRowAttentionSummary({
      sourceRowIndex: error.index,
      rowLabel: getMappedRowLabel(error.index, mappedRows[error.index]),
      messages: error.issues.map((issue) => issue.message),
      kind: "skipped",
    }),
  );
}
