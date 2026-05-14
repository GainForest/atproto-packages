/**
 * Analytics Event Definitions
 * Centralized event names and types for tracking
 */

// Navigation Events
export const NAVIGATION_EVENTS = {
  PAGE_VIEWED: "page_viewed",
} as const;

// Authentication Events
export const AUTH_EVENTS = {
  WALLET_CONNECTED: "wallet_connected",
  WALLET_DISCONNECTED: "wallet_disconnected",
} as const;

// Marketplace Events
export const MARKETPLACE_EVENTS = {
  BUMICERT_CARD_CLICKED: "bumicert_card_clicked",
  BUMICERT_DETAIL_VIEWED: "bumicert_detail_viewed",
} as const;

// Bumicert Creation Flow Events
export const BUMICERT_FLOW_EVENTS = {
  FLOW_STARTED: "bumicert_flow_started",
  STEP_VIEWED: "bumicert_step_viewed",
  STEP_COMPLETED: "bumicert_step_completed",
  FLOW_ABANDONED: "bumicert_flow_abandoned",
  BUMICERT_PUBLISHED: "bumicert_published",
} as const;

// Error Events
export const ERROR_EVENTS = {
  ERROR_ENCOUNTERED: "error_encountered",
} as const;

// Tree upload beta onboarding events. Keep these aggregate-only; do not attach
// DIDs, file names, row values, coordinates, species names, or raw errors.
export const TREE_UPLOAD_EVENTS = {
  FLOW_STARTED: "tree_upload_flow_started",
  STEP_VIEWED: "tree_upload_step_viewed",
  STEP_COMPLETED: "tree_upload_step_completed",
  FILE_ACCEPTED: "tree_upload_file_accepted",
  FILE_REJECTED: "tree_upload_file_rejected",
  MEDIA_ZIP_ACCEPTED: "tree_upload_media_zip_accepted",
  MEDIA_ZIP_REJECTED: "tree_upload_media_zip_rejected",
  UPLOAD_STARTED: "tree_upload_started",
  UPLOAD_COMPLETED: "tree_upload_completed",
  UPLOAD_FAILED: "tree_upload_failed",
  PHOTO_UPLOAD_STARTED: "tree_upload_photo_upload_started",
  PHOTO_UPLOAD_COMPLETED: "tree_upload_photo_upload_completed",
  FEEDBACK_PROMPT_SHOWN: "tree_upload_feedback_prompt_shown",
  FEEDBACK_FORM_OPENED: "tree_upload_feedback_form_opened",
  FEEDBACK_FORM_CLOSED: "tree_upload_feedback_form_closed",
  FEEDBACK_DISMISSED: "tree_upload_feedback_dismissed",
  VIEW_TREES_CLICKED: "tree_upload_view_trees_clicked",
  UPLOAD_MORE_CLICKED: "tree_upload_more_clicked",
} as const;

// Step names for the Bumicert creation flow
export const BUMICERT_STEP_NAMES = [
  "cover_details",
  "impact_details",
  "site_details",
  "review",
  "submit",
] as const;

export type BumicertStepName = (typeof BUMICERT_STEP_NAMES)[number];

export const TREE_UPLOAD_STEP_NAMES = [
  "file",
  "mapping",
  "preview",
  "upload",
] as const;

export type TreeUploadStepName = (typeof TREE_UPLOAD_STEP_NAMES)[number];

export type TreeUploadEventName =
  (typeof TREE_UPLOAD_EVENTS)[keyof typeof TREE_UPLOAD_EVENTS];

export type TreeUploadDatasetMode = "none" | "new" | "existing";

export type TreeUploadSourceFormat = "kobo" | "generic";

export const TREE_UPLOAD_FAILURE_REASONS = [
  "unsupported_file_type",
  "file_too_large",
  "parse_error",
  "unsupported_media_zip_type",
  "media_zip_too_large",
  "media_zip_no_supported_images",
  "media_zip_read_failed",
  "missing_kobo_media_zip",
  "site_selection_missing",
  "site_boundary_validation_failed",
  "dataset_create_failed",
] as const;

export type TreeUploadFailureReason =
  (typeof TREE_UPLOAD_FAILURE_REASONS)[number];

export type TreeUploadEventPayload = {
  uploadId?: string;
  stepIndex?: number;
  stepName?: TreeUploadStepName;
  datasetMode?: TreeUploadDatasetMode;
  sourceFormat?: TreeUploadSourceFormat;
  fileExtension?: string;
  fileSizeBucket?: string;
  mediaZipSizeBucket?: string;
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  totalColumns?: number;
  mappedColumns?: number;
  skippedColumns?: number;
  requiredMissingCount?: number;
  duplicateMappingCount?: number;
  expectedSkippedKoboColumnCount?: number;
  savedRows?: number;
  partialRows?: number;
  failedRows?: number;
  photoTotal?: number;
  photoSucceeded?: number;
  photoFailed?: number;
  hasKoboZip?: boolean;
  mediaZipImageCount?: number;
  mediaZipSubmissionCount?: number;
  durationSeconds?: number;
  failureReason?: TreeUploadFailureReason;
};

// Event payload types
export type PageViewedPayload = {
  path: string;
  title?: string;
  referrer?: string;
};

export type WalletConnectedPayload = {
  address: string;
  chainId?: number;
};

export type BumicertFlowStartedPayload = {
  draftId?: string;
};

export type StepViewedPayload = {
  stepIndex: number;
  stepName: BumicertStepName;
  draftId: string;
};

export type StepCompletedPayload = {
  stepIndex: number;
  stepName: BumicertStepName;
  draftId: string;
  timeSpentSeconds?: number;
};

export type BumicertPublishedPayload = {
  draftId: string;
  totalDurationSeconds: number;
};

export type FlowAbandonedPayload = {
  stepIndex: number;
  stepName: BumicertStepName;
  draftId: string;
  timeSpentSeconds?: number;
};

export type ErrorPayload = {
  message: string;
  stack?: string;
  componentStack?: string;
  path?: string;
};
