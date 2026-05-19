"use client";

import { useMemo, useState, Fragment } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TREE_UPLOAD_EVENTS } from "@/lib/analytics/events";
import { trackTreeUploadEvent } from "@/lib/analytics/hotjar";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { applyMappings } from "@/lib/upload/column-mapper";
import { parseAndValidateRows } from "@/lib/upload/schemas";
import { getTargetFieldLabel } from "@/lib/upload/types";
import type {
  ColumnMapping,
  TreeUploadRowAttentionSummary,
  ValidatedRow,
} from "@/lib/upload/types";
import { buildPreviewRowAttentionSummaries } from "@/lib/upload/row-attention";
import type { KoboMediaZipIndex } from "@/lib/upload/kobo-media-zip";
import type { UploadSiteSelection } from "@/lib/upload/site-selection";
import {
  fetchUploadSiteBoundary,
  uploadSiteBoundaryQueryKey,
} from "@/lib/upload/site-boundary";

const MAX_PREVIEW_ROWS = 20;

type PreviewStepProps = {
  uploadId: string;
  parsedData: Record<string, string>[];
  mappings: ColumnMapping[];
  koboMediaZipIndex: KoboMediaZipIndex | null;
  siteSelection: UploadSiteSelection | null;
  onBack: () => void;
  onNext: (
    validRows: ValidatedRow[],
    skippedRows: TreeUploadRowAttentionSummary[],
  ) => void;
};

/** Get the human-readable label for a target field */
function getFieldLabel(
  field: string,
  siteBoundaryLabel: string,
  targetFieldLabel: (field: string) => string,
): string {
  if (field === "siteBoundary") {
    return siteBoundaryLabel;
  }

  return targetFieldLabel(field);
}

/** Summarise errors: count occurrences of each field path */
function buildErrorSummary(
  errors: { index: number; issues: { path: string; message: string }[] }[]
): { path: string; count: number; message: string }[] {
  const map = new Map<string, { count: number; message: string }>();
  for (const err of errors) {
    for (const issue of err.issues) {
      const existing = map.get(issue.path);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(issue.path, { count: 1, message: issue.message });
      }
    }
  }
  return Array.from(map.entries())
    .map(([path, { count, message }]) => ({ path, count, message }))
    .sort((a, b) => b.count - a.count);
}

export default function PreviewStep({
  uploadId,
  parsedData,
  mappings,
  koboMediaZipIndex,
  siteSelection,
  onNext,
  onBack,
}: PreviewStepProps) {
  const t = useTranslations("upload.trees.preview");
  const tValidation = useTranslations("upload.trees.validation");
  const tTargetFields = useTranslations("upload.trees.targetFields");
  const tRowAttention = useTranslations("upload.trees.rowAttention");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [errorSectionOpen, setErrorSectionOpen] = useState(false);
  const siteBoundaryQuery = useQuery({
    queryKey: uploadSiteBoundaryQueryKey(siteSelection?.uri),
    queryFn: () => {
      if (!siteSelection) {
        throw new Error(t("selectSiteBeforePreview"));
      }

      return fetchUploadSiteBoundary(siteSelection);
    },
    enabled: siteSelection !== null,
    staleTime: 5 * 60 * 1000,
  });
  const siteBoundary = siteBoundaryQuery.data ?? null;
  const boundaryValidationReady = siteSelection !== null && siteBoundary !== null;

  // Apply mappings then validate — computed once on mount.
  // mappedRows is returned here to avoid calling applyMappings a second time.
  const { validationResult, mappedHeaders, mappedRows, hasAnyPhotos } = useMemo(() => {
    const mapped = applyMappings(parsedData, mappings);
    const result = parseAndValidateRows(mapped, parsedData, mappings, {
      koboMediaZipIndex,
      siteBoundary:
        siteSelection && siteBoundary
          ? { geoJson: siteBoundary, siteRef: siteSelection.uri }
          : null,
      t: tValidation,
    });
    // Collect the unique target field names that appear in the mapped data
    // Exclude photoUrl — it's replaced by a synthetic "Photos" column
    const headerSet = new Set<string>();
    for (const row of mapped) {
      for (const key of Object.keys(row)) {
        if (key !== "photoUrl") {
          headerSet.add(key);
        }
      }
    }

    // Check if any valid row has photos
    const anyPhotos = result.valid.some((r) => r.photos && r.photos.length > 0);

    return {
      validationResult: result,
      mappedHeaders: Array.from(headerSet),
      mappedRows: mapped,
      hasAnyPhotos: anyPhotos,
    };
  }, [koboMediaZipIndex, parsedData, mappings, siteBoundary, siteSelection, tValidation]);

  const { valid, errors } = validationResult;
  const totalRows = parsedData.length;
  const validCount = valid.length;
  const errorCount = errors.length;

  // Build a lookup: original row index → photo count (from validated rows)
  const photoCountByIndex = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of valid) {
      if (row.photos && row.photos.length > 0) {
        map.set(row.index, row.photos.length);
      }
    }
    return map;
  }, [valid]);

  const totalPhotoCount = useMemo(
    () => valid.reduce((sum, row) => sum + (row.photos?.length ?? 0), 0),
    [valid],
  );

  // Build a lookup: row index -> error issues
  const errorByIndex = useMemo(() => {
    const map = new Map<number, { path: string; message: string }[]>();
    for (const err of errors) {
      map.set(err.index, err.issues);
    }
    return map;
  }, [errors]);

  const errorSummary = useMemo(() => buildErrorSummary(errors), [errors]);
  const previewSkippedRows = useMemo(
    () => buildPreviewRowAttentionSummaries(errors, mappedRows, tRowAttention),
    [errors, mappedRows, tRowAttention],
  );

  // Pair each preview row with its actual index in mappedRows (before slicing)
  // so that errorByIndex (keyed by original row index) is looked up correctly.
  const previewRows = mappedRows
    .slice(0, MAX_PREVIEW_ROWS)
    .map((row, sliceIdx) => ({ row, rowIndex: sliceIdx }));
  const showingNote = totalRows > MAX_PREVIEW_ROWS;

  const toggleRow = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  // Summary banner variant
  const allValid = errorCount === 0;
  const allInvalid = validCount === 0;
  const canContinue = boundaryValidationReady && validCount > 0;

  const handleNext = () => {
    if (!canContinue) {
      return;
    }

    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.STEP_COMPLETED, {
      uploadId,
      stepIndex: 3,
      stepName: "preview",
      totalRows,
      validRows: validCount,
      invalidRows: errorCount,
      mappedColumns: mappedHeaders.length,
      photoTotal: totalPhotoCount,
    });
    onNext(valid, previewSkippedRows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("description")}
        </p>
      </div>

      {/* Summary banner */}
      {siteSelection === null ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{t("selectSiteBeforePreview")}</span>
        </div>
      ) : siteBoundaryQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("checkingBoundary", { siteName: siteSelection.name })}</span>
        </div>
      ) : siteBoundaryQuery.error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>
            {t("boundaryLoadError")}
          </span>
        </div>
      ) : allValid ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            {t("allValid", { totalRows, siteName: siteSelection.name })}
          </span>
        </div>
      ) : allInvalid ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>
            {t("allInvalid")}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("partialValid", { validCount, errorCount })}
          </span>
        </div>
      )}

      {/* Data preview table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">{t("dataPreview")}</h3>
          {showingNote && (
            <span className="text-xs text-muted-foreground">
              {t("showingRows", { maxRows: MAX_PREVIEW_ROWS, totalRows })}
            </span>
          )}
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide w-8">
                  #
                </th>
                {mappedHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {getFieldLabel(header, t("siteBoundaryField"), (field) => getTargetFieldLabel(field, tTargetFields))}
                  </th>
                ))}
                {hasAnyPhotos && (
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {t("photos")}
                  </th>
                )}
                <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide w-16">
                  {t("status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {previewRows.map(({ row, rowIndex }) => {
                // Use rowIndex (position in the full mappedRows array) to look up
                // errors — errorByIndex is keyed by the original row index from
                // parseAndValidateRows, not by the slice-local display position.
                const rowErrors = errorByIndex.get(rowIndex);
                const hasError = !!rowErrors;
                const isExpanded = expandedRows.has(rowIndex);

                return (
                  <Fragment key={rowIndex}>
                    <tr
                      className={`${
                        hasError
                          ? "border-l-2 border-l-destructive bg-destructive/5 cursor-pointer hover:bg-destructive/10"
                          : "hover:bg-muted/20"
                      }`}
                      onClick={hasError ? () => toggleRow(rowIndex) : undefined}
                    >
                      <td className="px-3 py-2 text-muted-foreground font-mono">
                        {rowIndex + 1}
                      </td>
                      {mappedHeaders.map((header) => (
                        <td
                          key={header}
                          className="px-3 py-2 font-mono text-foreground max-w-[160px] truncate"
                        >
                          {row[header] ?? (
                            <span className="text-muted-foreground/50 italic">
                              —
                            </span>
                          )}
                        </td>
                      ))}
                      {hasAnyPhotos && (
                        <td className="px-3 py-2">
                          {(() => {
                            const count = photoCountByIndex.get(rowIndex);
                            if (!count) {
                              return (
                                <span className="text-muted-foreground/50 italic text-xs">
                                  —
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Camera className="h-3 w-3" />
                                {count}
                              </span>
                            );
                          })()}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        {hasError ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            )}
                          </div>
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </td>
                    </tr>
                    {hasError && isExpanded && (
                      <tr
                        key={`${rowIndex}-errors`}
                        className="bg-destructive/5"
                      >
                        <td
                          colSpan={mappedHeaders.length + (hasAnyPhotos ? 3 : 2)}
                          className="px-4 py-2"
                        >
                          <ul className="space-y-0.5">
                            {rowErrors.map((issue, i) => (
                              <li
                                key={i}
                                className="text-xs text-destructive flex items-start gap-1.5"
                              >
                                <span className="font-medium shrink-0">
                                  {getFieldLabel(issue.path, t("siteBoundaryField"), (field) => getTargetFieldLabel(field, tTargetFields))}:
                                </span>
                                <span>{issue.message}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error summary section */}
      {errorCount > 0 && (
        <div className="rounded-lg border border-destructive/30 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/30 transition-colors"
            onClick={() => setErrorSectionOpen((v) => !v)}
          >
            <span className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {t("rowsWithErrors", { count: errorCount })}
            </span>
            {errorSectionOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {errorSectionOpen && (
            <div className="border-t border-destructive/20 px-4 py-3 space-y-4">
              {/* Common errors */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t("commonIssues")}
                </p>
                <ul className="space-y-1">
                  {errorSummary.map((item) => (
                    <li key={item.path} className="text-sm flex items-start gap-2">
                      <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-medium px-1.5 py-0.5 min-w-[1.5rem]">
                        {item.count}
                      </span>
                      <span>
                        <span className="font-medium">
                          {getFieldLabel(item.path, t("siteBoundaryField"), (field) => getTargetFieldLabel(field, tTargetFields))}
                        </span>
                        {" — "}
                        <span className="text-muted-foreground">
                          {item.message}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* All error rows */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t("errorRows")}
                </p>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {errors.map((err) => (
                    <li
                      key={err.index}
                      className="text-xs border border-destructive/20 rounded-md p-2 space-y-0.5"
                    >
                      <p className="font-medium text-foreground">
                        {t("rowNumber", { number: err.index + 1 })}
                      </p>
                      {err.issues.map((issue, i) => (
                        <p key={i} className="text-muted-foreground">
                          <span className="text-destructive font-medium">
                            {getFieldLabel(issue.path, t("siteBoundaryField"), (field) => getTargetFieldLabel(field, tTargetFields))}:
                          </span>{" "}
                          {issue.message}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          {t("backToMapping")}
        </Button>
        <Button onClick={handleNext} disabled={!canContinue}>
          {t("uploadValidRows", { count: validCount })}
        </Button>
      </div>
    </div>
  );
}
