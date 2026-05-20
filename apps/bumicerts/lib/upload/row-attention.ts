import type {
  RowError,
  TreeUploadRowAttentionKind,
  TreeUploadRowAttentionSummary,
  ValidatedRow,
} from "./types";

type RowAttentionTranslator = (
  key:
    | "fallbackIssue"
    | "rowLabel"
    | "failed"
    | "partial"
    | "skipped",
  values?: Record<string, string | number>,
) => string;

const FALLBACK_ROW_ISSUE_MESSAGE = "This row needs review.";

function normalizeRowMessages(
  messages: readonly string[],
  t?: RowAttentionTranslator,
): string[] {
  const normalized = messages
    .map((message) => message.trim())
    .filter((message) => message.length > 0);

  return normalized.length > 0
    ? normalized
    : [t ? t("fallbackIssue") : FALLBACK_ROW_ISSUE_MESSAGE];
}

export function getMappedRowLabel(
  rowIndex: number,
  row: Record<string, string> | undefined,
  t?: RowAttentionTranslator,
): string {
  const scientificName = row?.scientificName?.trim() ?? "";

  return scientificName.length > 0
    ? scientificName
    : t
      ? t("rowLabel", { number: rowIndex + 1 })
      : `Row ${rowIndex + 1}`;
}

export function getValidatedRowLabel(
  row: ValidatedRow,
  t?: RowAttentionTranslator,
): string {
  const scientificName = row.occurrence.scientificName.trim();

  return scientificName.length > 0
    ? scientificName
    : t
      ? t("rowLabel", { number: row.index + 1 })
      : `Row ${row.index + 1}`;
}

export function createTreeUploadRowAttentionSummary(input: {
  sourceRowIndex: number;
  rowLabel: string;
  messages: readonly string[];
  kind: TreeUploadRowAttentionKind;
  t?: RowAttentionTranslator;
}): TreeUploadRowAttentionSummary {
  const rowLabel = input.rowLabel.trim();

  return {
    sourceRowIndex: input.sourceRowIndex,
    rowLabel:
      rowLabel.length > 0
        ? rowLabel
        : input.t
          ? input.t("rowLabel", { number: input.sourceRowIndex + 1 })
          : `Row ${input.sourceRowIndex + 1}`,
    messages: normalizeRowMessages(input.messages, input.t),
    kind: input.kind,
  };
}

export function getTreeUploadRowAttentionKindLabel(
  kind: TreeUploadRowAttentionKind,
  t?: RowAttentionTranslator,
): string {
  switch (kind) {
    case "failed":
      return t ? t("failed") : "Failed";
    case "partial":
      return t ? t("partial") : "Needs follow-up";
    case "skipped":
      return t ? t("skipped") : "Skipped";
  }
}

export function buildPreviewRowAttentionSummaries(
  errors: RowError[],
  mappedRows: Record<string, string>[],
  t?: RowAttentionTranslator,
): TreeUploadRowAttentionSummary[] {
  return errors.map((error) =>
    createTreeUploadRowAttentionSummary({
      sourceRowIndex: error.index,
      rowLabel: getMappedRowLabel(error.index, mappedRows[error.index], t),
      messages: error.issues.map((issue) => issue.message),
      kind: "skipped",
      t,
    }),
  );
}
