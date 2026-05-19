"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, FileSpreadsheet, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { useCsvParser } from "@/lib/upload/use-csv-parser";
import { getPartnerEstablishmentMeansOptions } from "@/lib/upload/establishment-means";
import { detectKoboFormat } from "@/lib/upload/kobo-mapper";
import { autoDetectMappings } from "@/lib/upload/column-mapper";
import {
  fetchUploadTreeDatasets,
  type UploadTreeDatasetItem,
  uploadTreeDatasetsQueryKey,
} from "@/lib/upload/tree-upload-datasets";
import { TREE_UPLOAD_EVENTS } from "@/lib/analytics/events";
import { getFileExtension, getFileSizeBucket } from "@/lib/analytics/tree-upload";
import { trackTreeUploadEvent } from "@/lib/analytics/hotjar";
import { cn } from "@/lib/utils";
import type { ColumnMapping } from "@/lib/upload/types";
import {
  buildKoboMediaZipIndex,
  type KoboMediaZipIndex,
} from "@/lib/upload/kobo-media-zip";
import TreeDataGuide, { KoboExportGuide } from "./TreeDataGuide";
import type {
  ExistingUploadDatasetSelection,
  UploadDatasetSelection,
} from "@/lib/upload/upload-dataset-selection";
import {
  resolveUploadSiteSelection,
  toUploadSiteSelection,
  uploadSiteHasBoundary,
  type UploadSiteSelection,
} from "@/lib/upload/site-selection";
import {
  fetchUploadSiteBoundary,
  uploadSiteBoundaryQueryKey,
} from "@/lib/upload/site-boundary";

type FileDropStepProps = {
  uploadId: string;
  did: string;
  initialEstablishmentMeans: string | null;
  initialDatasetSelection: UploadDatasetSelection;
  initialSiteSelection: UploadSiteSelection | null;
  onFileAndMappings: (
    file: File,
    koboMediaZipFile: File | null,
    koboMediaZipIndex: KoboMediaZipIndex | null,
    parsedData: Record<string, string>[],
    headers: string[],
    mappings: ColumnMapping[],
    establishmentMeans: string | null,
    datasetSelection: UploadDatasetSelection,
    siteSelection: UploadSiteSelection,
  ) => void;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_MEDIA_ZIP_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const ACCEPTED_EXTENSIONS = [".csv", ".tsv"];
const ACCEPTED_MIME_TYPES = ["text/csv", "text/tab-separated-values", "application/csv"];
const ACCEPTED_MEDIA_ZIP_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
];
const DATASET_MODE_OPTIONS: Array<{
  mode: UploadDatasetSelection["mode"];
  titleKey: "noneTitle" | "newTitle" | "existingTitle";
  descriptionKey: "noneDescription" | "newDescription" | "existingDescription";
}> = [
  { mode: "none", titleKey: "noneTitle", descriptionKey: "noneDescription" },
  { mode: "new", titleKey: "newTitle", descriptionKey: "newDescription" },
  { mode: "existing", titleKey: "existingTitle", descriptionKey: "existingDescription" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ACCEPTED_MIME_TYPES.includes(file.type);
  return hasValidExtension || (file.type !== "" && hasValidMime);
}

function isAcceptedMediaZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExtension = name.endsWith(".zip");
  const hasValidMime = ACCEPTED_MEDIA_ZIP_MIME_TYPES.includes(file.type);
  return hasValidExtension || (file.type !== "" && hasValidMime);
}

function formatDatasetDate(
  value: string | null | undefined,
  unavailableLabel: string,
  formatDate: (date: Date) => string,
): string {
  if (!value) {
    return unavailableLabel;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return unavailableLabel;
  }

  return formatDate(parsed);
}

function toExistingUploadDatasetSelection(
  dataset: UploadTreeDatasetItem,
): ExistingUploadDatasetSelection {
  return {
    uri: dataset.uri,
    rkey: dataset.rkey,
    name: dataset.name,
    description: dataset.description,
    recordCount: dataset.recordCount,
  };
}

export default function FileDropStep({
  uploadId,
  did,
  initialEstablishmentMeans,
  initialDatasetSelection,
  initialSiteSelection,
  onFileAndMappings,
}: FileDropStepProps) {
  const t = useTranslations("upload.trees.fileDrop");
  const tCommon = useTranslations("upload.trees.common");
  const tEstablishmentMeans = useTranslations("upload.trees.establishmentMeans");
  const format = useFormatter();
  const { parsedData, headers, rowCount, error, isParsing, parseFile, reset } =
    useCsvParser();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMediaZipFile, setSelectedMediaZipFile] = useState<File | null>(
    null,
  );
  const [mediaZipIndex, setMediaZipIndex] = useState<KoboMediaZipIndex | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [mediaZipError, setMediaZipError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMediaZipParsing, setIsMediaZipParsing] = useState(false);
  const [establishmentMeans, setEstablishmentMeans] = useState<string | null>(
    initialEstablishmentMeans,
  );
  const [datasetMode, setDatasetMode] =
    useState<UploadDatasetSelection["mode"]>(initialDatasetSelection.mode);
  const [datasetName, setDatasetName] = useState(
    initialDatasetSelection.mode === "new"
      ? initialDatasetSelection.name
      : "",
  );
  const [datasetDescription, setDatasetDescription] = useState(
    initialDatasetSelection.mode === "new"
      ? initialDatasetSelection.description
      : "",
  );
  const [selectedExistingDatasetUri, setSelectedExistingDatasetUri] =
    useState<string>(
      initialDatasetSelection.mode === "existing"
        ? initialDatasetSelection.dataset.uri
        : "",
    );
  const [selectedSiteUri, setSelectedSiteUri] = useState<string | null>(
    initialSiteSelection?.uri ?? null,
  );
  const sitesQuery = indexerTrpc.locations.list.useQuery({ did });
  const defaultSiteQuery = indexerTrpc.organization.defaultSite.useQuery({ did });
  const existingDatasetsQuery = useQuery({
    queryKey: uploadTreeDatasetsQueryKey(did),
    queryFn: fetchUploadTreeDatasets,
    enabled: datasetMode === "existing",
    staleTime: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaZipInputRef = useRef<HTMLInputElement>(null);
  const mediaZipParseRequestRef = useRef(0);
  const lastTrackedParseErrorRef = useRef<string | null>(null);

  const detectedFormat =
    headers.length > 0 ? detectKoboFormat(headers) : null;
  const existingDatasets = useMemo(
    () => existingDatasetsQuery.data ?? [],
    [existingDatasetsQuery.data],
  );
  const establishmentMeansOptions = useMemo(
    () => getPartnerEstablishmentMeansOptions(tEstablishmentMeans),
    [tEstablishmentMeans],
  );
  const selectedExistingDataset = useMemo(() => {
    const match = existingDatasets.find(
      (dataset) => dataset.uri === selectedExistingDatasetUri,
    );

    return match ? toExistingUploadDatasetSelection(match) : null;
  }, [existingDatasets, selectedExistingDatasetUri]);
  const uploadSites = useMemo(
    () => (sitesQuery.data ?? []).flatMap((site) => {
      const uploadSite = toUploadSiteSelection(site);
      return uploadSite ? [uploadSite] : [];
    }),
    [sitesQuery.data],
  );
  const selectedSite = useMemo(
    () =>
      resolveUploadSiteSelection({
        sites: uploadSites,
        selectedSiteUri,
        defaultSiteUri: defaultSiteQuery.data,
      }),
    [defaultSiteQuery.data, selectedSiteUri, uploadSites],
  );
  const selectedSiteHasBoundary = selectedSite
    ? uploadSiteHasBoundary(selectedSite)
    : false;
  const siteBoundaryQuery = useQuery({
    queryKey: uploadSiteBoundaryQueryKey(selectedSite?.uri),
    queryFn: () => {
      if (!selectedSite) {
        throw new Error(t("selectSiteBeforeUpload"));
      }

      return fetchUploadSiteBoundary(selectedSite);
    },
    enabled: selectedSiteHasBoundary,
    staleTime: 5 * 60 * 1000,
  });
  const selectedSiteBoundaryReady =
    selectedSiteHasBoundary && siteBoundaryQuery.isSuccess;

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);

      if (!isAcceptedFile(file)) {
        trackTreeUploadEvent(TREE_UPLOAD_EVENTS.FILE_REJECTED, {
          uploadId,
          fileExtension: getFileExtension(file.name),
          fileSizeBucket: getFileSizeBucket(file.size),
          failureReason: "unsupported_file_type",
        });
        setFileError(t("csvOnly"));
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        trackTreeUploadEvent(TREE_UPLOAD_EVENTS.FILE_REJECTED, {
          uploadId,
          fileExtension: getFileExtension(file.name),
          fileSizeBucket: getFileSizeBucket(file.size),
          failureReason: "file_too_large",
        });
        setFileError(t("fileTooLarge", { size: formatBytes(file.size) }));
        return;
      }

      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.FILE_ACCEPTED, {
        uploadId,
        fileExtension: getFileExtension(file.name),
        fileSizeBucket: getFileSizeBucket(file.size),
      });
      lastTrackedParseErrorRef.current = null;
      reset();
      setSelectedFile(file);
      parseFile(file);
    },
    [parseFile, reset, t, uploadId]
  );

  const handleMediaZipFile = useCallback(async (file: File) => {
    const requestId = mediaZipParseRequestRef.current + 1;
    mediaZipParseRequestRef.current = requestId;
    setMediaZipError(null);
    setMediaZipIndex(null);
    setSelectedMediaZipFile(null);
    setIsMediaZipParsing(false);

    if (!isAcceptedMediaZipFile(file)) {
      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.MEDIA_ZIP_REJECTED, {
        uploadId,
        fileExtension: getFileExtension(file.name),
        mediaZipSizeBucket: getFileSizeBucket(file.size),
        failureReason: "unsupported_media_zip_type",
      });
      setMediaZipError(t("zipOnly"));
      return;
    }

    if (file.size > MAX_MEDIA_ZIP_SIZE_BYTES) {
      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.MEDIA_ZIP_REJECTED, {
        uploadId,
        fileExtension: getFileExtension(file.name),
        mediaZipSizeBucket: getFileSizeBucket(file.size),
        failureReason: "media_zip_too_large",
      });
      setMediaZipError(t("zipTooLarge", { size: formatBytes(file.size) }));
      return;
    }

    setIsMediaZipParsing(true);
    try {
      const index = await buildKoboMediaZipIndex(file);
      if (mediaZipParseRequestRef.current !== requestId) {
        return;
      }

      if (index.entries.length === 0) {
        trackTreeUploadEvent(TREE_UPLOAD_EVENTS.MEDIA_ZIP_REJECTED, {
          uploadId,
          fileExtension: getFileExtension(file.name),
          mediaZipSizeBucket: getFileSizeBucket(file.size),
          mediaZipImageCount: 0,
          mediaZipSubmissionCount: index.submissionCount,
          failureReason: "media_zip_no_supported_images",
        });
        setMediaZipError(t("zipNoImages"));
        return;
      }

      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.MEDIA_ZIP_ACCEPTED, {
        uploadId,
        fileExtension: getFileExtension(file.name),
        mediaZipSizeBucket: getFileSizeBucket(file.size),
        mediaZipImageCount: index.entries.length,
        mediaZipSubmissionCount: index.submissionCount,
      });
      setSelectedMediaZipFile(file);
      setMediaZipIndex(index);
    } catch {
      if (mediaZipParseRequestRef.current !== requestId) {
        return;
      }

      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.MEDIA_ZIP_REJECTED, {
        uploadId,
        fileExtension: getFileExtension(file.name),
        mediaZipSizeBucket: getFileSizeBucket(file.size),
        failureReason: "media_zip_read_failed",
      });
      setMediaZipError(t("zipReadError"));
    } finally {
      if (mediaZipParseRequestRef.current === requestId) {
        setIsMediaZipParsing(false);
      }
    }
  }, [t, uploadId]);

  useEffect(() => {
    if (!error || lastTrackedParseErrorRef.current === error) {
      return;
    }

    lastTrackedParseErrorRef.current = error;
    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.FILE_REJECTED, {
      uploadId,
      fileExtension: selectedFile ? getFileExtension(selectedFile.name) : undefined,
      fileSizeBucket: selectedFile ? getFileSizeBucket(selectedFile.size) : undefined,
      failureReason: "parse_error",
    });
  }, [error, selectedFile, uploadId]);

  const handleRemoveMediaZip = () => {
    mediaZipParseRequestRef.current += 1;
    setSelectedMediaZipFile(null);
    setMediaZipIndex(null);
    setMediaZipError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleMediaZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleMediaZipFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleContinue = () => {
    if (!selectedFile || parsedData.length === 0 || !selectedSite) return;

    const koboResult = detectKoboFormat(headers);
    const mappings = koboResult.isKobo
      ? koboResult.mappings
      : autoDetectMappings(headers);

    const trimmedDatasetName = datasetName.trim();
    const trimmedDatasetDescription = datasetDescription.trim();
    const datasetSelection: UploadDatasetSelection =
      datasetMode === "new"
        ? {
            mode: "new",
            name: trimmedDatasetName,
            description: trimmedDatasetDescription,
          }
        : datasetMode === "existing" && selectedExistingDataset
          ? {
              mode: "existing",
              dataset: selectedExistingDataset,
            }
          : { mode: "none" };

    onFileAndMappings(
      selectedFile,
      selectedMediaZipFile,
      mediaZipIndex,
      parsedData,
      headers,
      mappings,
      establishmentMeans,
      datasetSelection,
      selectedSite,
    );

    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.STEP_COMPLETED, {
      uploadId,
      stepIndex: 1,
      stepName: "file",
      datasetMode: datasetSelection.mode,
      sourceFormat: koboResult.isKobo ? "kobo" : "generic",
      fileExtension: getFileExtension(selectedFile.name),
      fileSizeBucket: getFileSizeBucket(selectedFile.size),
      totalRows: parsedData.length,
      totalColumns: headers.length,
      mappedColumns: mappings.length,
      skippedColumns: headers.length - mappings.length,
      hasKoboZip: selectedMediaZipFile !== null,
      mediaZipImageCount: mediaZipIndex?.entries.length,
      mediaZipSubmissionCount: mediaZipIndex?.submissionCount,
    });
  };

  const hasFile = selectedFile !== null;
  const isParsed = hasFile && !isParsing && parsedData.length > 0;
  const canContinue =
    isParsed &&
    !error &&
    !fileError &&
    !mediaZipError &&
    !isMediaZipParsing &&
    selectedSite !== null &&
    selectedSiteBoundaryReady &&
    (datasetMode !== "new" || datasetName.trim().length > 0) &&
    (datasetMode !== "existing" || selectedExistingDataset !== null);
  const hasUnavailableExistingSelection =
    datasetMode === "existing" &&
    !existingDatasetsQuery.isLoading &&
    !existingDatasetsQuery.error &&
    selectedExistingDatasetUri.length > 0 &&
    selectedExistingDataset === null;
  const hasUnavailableSiteSelection =
    selectedSiteUri !== null &&
    !sitesQuery.isLoading &&
    !sitesQuery.error &&
    selectedSite === null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <TreeDataGuide />
        <KoboExportGuide />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{t("uploadFileTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("uploadFileDescription")}
        </p>
      </div>

      {/* Drop zone */}
      <Card
        className={`cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-dashed hover:border-primary/60 hover:bg-muted/30"
        }`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          {isParsing ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">{t("parsingFile")}</span>
            </div>
          ) : hasFile && isParsed ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(selectedFile.size)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-10 w-10" />
              <span className="text-sm font-medium">
                {t("dragDrop")}
              </span>
              <span className="text-xs">{t("acceptedCsv")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,text/csv,text/tab-separated-values"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Optional Kobo media ZIP input */}
      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t("koboZipTitle")}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("koboZipDescription")}
          </p>
        </div>

        <Card
          className="cursor-pointer border-dashed bg-background transition-colors hover:border-primary/60 hover:bg-muted/30"
          onClick={() => mediaZipInputRef.current?.click()}
        >
          <CardContent className="flex items-center justify-between gap-3 py-4">
            {isMediaZipParsing ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">{t("readingZip")}</span>
              </div>
            ) : selectedMediaZipFile && mediaZipIndex ? (
              <div className="flex min-w-0 items-center gap-3">
                <Archive className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedMediaZipFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("imageSubmissionCount", {
                      images: mediaZipIndex.entries.length,
                      submissions: mediaZipIndex.submissionCount,
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Archive className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t("clickSelectZip")}</p>
                  <p className="text-xs">{t("acceptedZip")}</p>
                </div>
              </div>
            )}

            {selectedMediaZipFile || mediaZipError ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveMediaZip();
                }}
              >
                <X />
                {selectedMediaZipFile ? tCommon("remove") : tCommon("clear")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <input
          ref={mediaZipInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={handleMediaZipInputChange}
        />

        {mediaZipError ? (
          <p className="text-sm text-destructive">{mediaZipError}</p>
        ) : null}
      </div>

      {/* File error */}
      {fileError && (
        <p className="text-sm text-destructive">{fileError}</p>
      )}

      {/* Parse error */}
      {error && (
        <p className="text-sm text-destructive">
          {t("parseError", { error })}
        </p>
      )}

      {/* File info card */}
      {isParsed && !error && !fileError && (
        <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{selectedFile?.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block font-medium text-foreground">
                {format.number(rowCount)}
              </span>
              <span>{tCommon("rows")}</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">{headers.length}</span>
              <span>{tCommon("columns")}</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">
                {detectedFormat?.isKobo ? t("autoMappedCsv") : t("genericCsv")}
              </span>
              <span>{tCommon("format")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Required site selection */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="space-y-1.5">
          <label htmlFor="site-boundary-select" className="text-sm font-medium">
            {t("siteBoundary")}
          </label>
          <p className="text-xs text-muted-foreground">
            {t("siteBoundaryDescription")}
          </p>
        </div>

        {sitesQuery.isLoading ? (
          <div
            className="space-y-3 rounded-lg border border-border bg-background/80 p-4"
            role="status"
            aria-live="polite"
            aria-label={t("loadingSitesAria")}
          >
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("loadingSites")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("loadingSitesDescription")}
                </p>
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-md" aria-hidden="true" />
          </div>
        ) : sitesQuery.error ? (
          <p className="text-sm text-destructive">
            {t("sitesLoadError")}
          </p>
        ) : uploadSites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noSites")}
          </p>
        ) : (
          <>
            <Select
              value={selectedSite?.uri}
              onValueChange={setSelectedSiteUri}
            >
              <SelectTrigger id="site-boundary-select">
                <SelectValue placeholder={t("selectSite")} />
              </SelectTrigger>
              <SelectContent>
                {uploadSites.map((site) => {
                  const isDefault = defaultSiteQuery.data === site.uri;
                  const hasBoundary = uploadSiteHasBoundary(site);

                  return (
                    <SelectItem
                      key={site.uri}
                      value={site.uri}
                      disabled={!hasBoundary}
                    >
                      {site.name}
                      {isDefault ? ` (${tCommon("default")})` : ""}
                      {!hasBoundary ? ` — ${tCommon("noBoundary")}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedSite ? (
              <div className="rounded-lg border border-border bg-background p-3 text-sm">
                <p className="font-medium text-foreground">{selectedSite.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("boundaryOnly")}
                </p>
              </div>
            ) : null}

            {selectedSite && selectedSiteHasBoundary && siteBoundaryQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("checkingBoundary")}
              </p>
            ) : null}

            {selectedSite && selectedSiteHasBoundary && siteBoundaryQuery.error ? (
              <p className="text-sm text-destructive">
                {t("boundaryLoadError")}
              </p>
            ) : null}

            {hasUnavailableSiteSelection ? (
              <p className="text-sm text-destructive">
                {t("siteUnavailable")}
              </p>
            ) : null}

            {selectedSite && !selectedSiteHasBoundary ? (
              <p className="text-sm text-destructive">
                {t("siteNoBoundary")}
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* Dataset selection */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("datasetQuestion")}</label>
          <p className="text-xs text-muted-foreground">
            {t("datasetDescription")}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {DATASET_MODE_OPTIONS.map((option) => {
            const isSelected = datasetMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => setDatasetMode(option.mode)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/30",
                )}
              >
                <p className="text-sm font-medium text-foreground">
                  {t(`modes.${option.titleKey}`)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`modes.${option.descriptionKey}`)}
                </p>
              </button>
            );
          })}
        </div>

        {datasetMode === "new" ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-1.5">
              <label htmlFor="dataset-name" className="text-sm font-medium">
                {t("datasetName")} {" "}
                <span className="text-muted-foreground font-normal">
                  ({tCommon("recommended")})
                </span>
              </label>
              <Input
                id="dataset-name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder={t("datasetNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dataset-description" className="text-sm font-medium">
                {t("datasetDescriptionLabel")} {" "}
                <span className="text-muted-foreground font-normal">
                  ({tCommon("optional")})
                </span>
              </label>
              <Textarea
                id="dataset-description"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                placeholder={t("datasetDescriptionPlaceholder")}
                rows={2}
              />
            </div>
          </div>
        ) : null}

        {datasetMode === "existing" ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("chooseDataset")}</label>
              <p className="text-xs text-muted-foreground">
                {t("chooseDatasetDescription")}
              </p>
            </div>

            {existingDatasetsQuery.isLoading ? (
              <div
                className="space-y-4 rounded-lg border border-border bg-background/80 p-4"
                role="status"
                aria-live="polite"
                aria-label={t("loadingDatasetsAria")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {t("loadingDatasets")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("loadingDatasetsDescription")}
                    </p>
                  </div>
                </div>
                <div className="space-y-2" aria-hidden="true">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            ) : existingDatasetsQuery.error ? (
              <p className="text-sm text-destructive">
                {t("datasetsLoadError")}
              </p>
            ) : existingDatasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noDatasets")}
              </p>
            ) : (
              <>
                <Select
                  value={selectedExistingDatasetUri}
                  onValueChange={setSelectedExistingDatasetUri}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectDataset")} />
                  </SelectTrigger>
                  <SelectContent>
                    {existingDatasets.map((dataset) => {
                      const count = dataset.recordCount ?? 0;
                      const createdAt = formatDatasetDate(
                        dataset.createdAt,
                        tCommon("dateUnavailable"),
                        (date) => format.dateTime(date, { dateStyle: "medium" }),
                      );

                      return (
                        <SelectItem key={dataset.uri} value={dataset.uri}>
                          {`${dataset.name} (${count} ${count === 1 ? tCommon("tree") : tCommon("trees")} - ${createdAt})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedExistingDataset ? (
                  <div className="rounded-lg border border-border bg-background p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {selectedExistingDataset.name}
                      </p>
                      <span className="text-muted-foreground">
                        {format.number(selectedExistingDataset.recordCount ?? 0)} {" "}
                        {(selectedExistingDataset.recordCount ?? 0) === 1
                          ? tCommon("tree")
                          : tCommon("trees")}
                      </span>
                    </div>
                    {selectedExistingDataset.description ? (
                      <p className="mt-2 text-muted-foreground">
                        {selectedExistingDataset.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-muted-foreground">
                        {t("noDescription")}
                      </p>
                    )}
                  </div>
                ) : null}

                {hasUnavailableExistingSelection ? (
                  <p className="text-sm text-destructive">
                    {t("datasetUnavailable")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Establishment means guidance */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {t("establishmentQuestion")} {" "}
            <span className="text-muted-foreground font-normal">
              ({tCommon("optional")})
            </span>
          </label>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gbifDescription")}
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          {establishmentMeansOptions.map((option) => {
            const isSelected = establishmentMeans === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setEstablishmentMeans(isSelected ? null : option.value)
                }
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0",
                  isSelected
                    ? "bg-primary/10"
                    : "bg-background hover:bg-muted/30"
                )}
              >
                <span
                  className={cn(
                    "mt-1 flex size-4 shrink-0 rounded-full border transition-colors",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40 bg-background"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-foreground">
                      {option.label}
                    </span>
                    <Badge
                      variant="success"
                      className="px-1.5 py-0.5 font-mono text-[10px] lowercase"
                    >
                      {option.gbifCodeLabel}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GBIF disclaimer */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("gbifDisclaimer")}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-end pt-2 border-t border-border">
        <Button onClick={handleContinue} disabled={!canContinue}>
          {t("continueToMapping")}
        </Button>
      </div>
    </div>
  );
}
