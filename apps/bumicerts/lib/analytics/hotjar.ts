/**
 * Hotjar/Contentsquare Analytics Integration
 * Wrapper functions for Hotjar tracking via Contentsquare script
 * Also sends events to Supabase for custom analytics dashboard
 */

import {
  BUMICERT_FLOW_EVENTS,
  BUMICERT_STEP_NAMES,
  NAVIGATION_EVENTS,
  AUTH_EVENTS,
  MARKETPLACE_EVENTS,
  ERROR_EVENTS,
  TREE_UPLOAD_EVENTS,
  type PageViewedPayload,
  type WalletConnectedPayload,
  type BumicertFlowStartedPayload,
  type StepViewedPayload,
  type StepCompletedPayload,
  type BumicertPublishedPayload,
  type FlowAbandonedPayload,
  type ErrorPayload,
  type BumicertStepName,
  type TreeUploadEventName,
  type TreeUploadEventPayload,
} from "./events";

import * as supabaseTracking from "./supabase-tracking";
import { hasAnalyticsConsent } from "./consent";
import { isTreeUploadAnalyticsPath } from "./tree-upload";

type ContentsquareCommand = [string, ...unknown[]];

// Extend Window interface to include Hotjar
declare global {
  interface Window {
    hj?: (command: string, ...args: unknown[]) => void;
    _uxa?: ContentsquareCommand[];
    CS_CONF?: unknown;
  }
}

const hasTreeUploadRecordingAccess = (): boolean => {
  return (
    hasAnalyticsConsent() &&
    typeof window !== "undefined" &&
    isTreeUploadAnalyticsPath(window.location.pathname)
  );
};

// Check if Hotjar/Contentsquare is available
const isHotjarReady = (): boolean => {
  return (
    hasTreeUploadRecordingAccess() &&
    typeof window !== "undefined" &&
    typeof window.hj === "function"
  );
};

const getContentsquareQueue = (): ContentsquareCommand[] | null => {
  if (!hasTreeUploadRecordingAccess() || typeof window === "undefined") {
    return null;
  }

  window._uxa = window._uxa ?? [];
  return window._uxa;
};

const pushContentsquareCommand = (command: ContentsquareCommand): void => {
  const queue = getContentsquareQueue();
  if (!queue) {
    return;
  }

  queue.push(command);
};

const toDynamicValue = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return null;
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName: string): void => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  pushContentsquareCommand(["trackPageEvent", eventName]);

  if (!isHotjarReady()) {
    return;
  }

  try {
    window.hj?.("event", eventName);
  } catch (error) {
    console.error(`[Hotjar] Failed to track event "${eventName}":`, error);
  }
};

/**
 * Track a Contentsquare dynamic variable for aggregate context.
 */
export const trackDynamicVariable = (key: string, value: string | number): void => {
  pushContentsquareCommand(["trackDynamicVariable", { key, value }]);
};

/**
 * Identify a user with attributes
 */
export const identifyUser = (
  userId: string | null,
  attributes: Record<string, string | number | boolean>
): void => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    const dynamicValue = toDynamicValue(value);
    if (dynamicValue !== null) {
      trackDynamicVariable(`user_${key}`, dynamicValue);
    }
  }

  if (!isHotjarReady()) {
    return;
  }

  try {
    window.hj?.("identify", userId, attributes);
  } catch (error) {
    console.error("[Hotjar] Failed to identify user:", error);
  }
};

/**
 * Update state/tag for filtering recordings
 */
export const tagRecording = (tags: string[]): void => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  const tagValue = tags.join("/").slice(0, 255);
  trackDynamicVariable("recording_tag", tagValue);
};

// ============================================
// Navigation Events
// ============================================

export const trackPageViewed = (payload: PageViewedPayload): void => {
  trackEvent(NAVIGATION_EVENTS.PAGE_VIEWED);
  pushContentsquareCommand(["trackPageview", payload.path]);

  if (isHotjarReady()) {
    window.hj?.("stateChange", payload.path);
  }
};

// ============================================
// Authentication Events
// ============================================

export const trackWalletConnected = (payload: WalletConnectedPayload): void => {
  trackEvent(AUTH_EVENTS.WALLET_CONNECTED);
  identifyUser(payload.address, {
    walletAddress: payload.address,
    chainId: payload.chainId ?? 0,
    connectedAt: new Date().toISOString(),
  });
};

export const trackWalletDisconnected = (): void => {
  trackEvent(AUTH_EVENTS.WALLET_DISCONNECTED);
};

// ============================================
// Marketplace Events
// ============================================

export const trackBumicertCardClicked = (bumicertId: string): void => {
  trackEvent(`${MARKETPLACE_EVENTS.BUMICERT_CARD_CLICKED}_${bumicertId}`);
  trackEvent(MARKETPLACE_EVENTS.BUMICERT_CARD_CLICKED);
};

export const trackBumicertDetailViewed = (bumicertId: string): void => {
  trackEvent(`${MARKETPLACE_EVENTS.BUMICERT_DETAIL_VIEWED}_${bumicertId}`);
  trackEvent(MARKETPLACE_EVENTS.BUMICERT_DETAIL_VIEWED);
};

// ============================================
// Tree Upload Beta Events
// ============================================

const TREE_UPLOAD_DYNAMIC_KEYS: Array<keyof TreeUploadEventPayload> = [
  "uploadId",
  "stepIndex",
  "stepName",
  "datasetMode",
  "sourceFormat",
  "fileExtension",
  "fileSizeBucket",
  "mediaZipSizeBucket",
  "totalRows",
  "validRows",
  "invalidRows",
  "totalColumns",
  "mappedColumns",
  "skippedColumns",
  "requiredMissingCount",
  "duplicateMappingCount",
  "expectedSkippedKoboColumnCount",
  "savedRows",
  "partialRows",
  "failedRows",
  "photoTotal",
  "photoSucceeded",
  "photoFailed",
  "hasKoboZip",
  "mediaZipImageCount",
  "mediaZipSubmissionCount",
  "durationSeconds",
  "failureReason",
];

const trackTreeUploadDynamicVariables = (
  payload: TreeUploadEventPayload,
): void => {
  for (const key of TREE_UPLOAD_DYNAMIC_KEYS) {
    const value = payload[key];
    const dynamicValue = toDynamicValue(value);
    if (dynamicValue !== null) {
      trackDynamicVariable(`tree_upload_${key}`, dynamicValue);
    }
  }
};

const toTreeUploadEventData = (
  payload: TreeUploadEventPayload,
): Record<string, string | number | boolean> => {
  const eventData: Record<string, string | number | boolean> = {};

  for (const key of TREE_UPLOAD_DYNAMIC_KEYS) {
    const value = payload[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      eventData[key] = value;
    }
  }

  return eventData;
};

export const trackTreeUploadEvent = (
  eventName: TreeUploadEventName,
  payload: TreeUploadEventPayload = {},
): boolean => {
  if (!hasTreeUploadRecordingAccess()) {
    return false;
  }

  trackEvent(eventName);
  tagRecording(["tree-upload", eventName]);
  trackTreeUploadDynamicVariables(payload);
  pushContentsquareCommand(["trackEventTriggerRecording", eventName]);

  supabaseTracking.insertEvent(eventName, toTreeUploadEventData(payload)).catch(console.error);
  return true;
};

export const trackTreeUploadFeedbackPromptShown = (
  payload: TreeUploadEventPayload,
): void => {
  trackTreeUploadEvent(TREE_UPLOAD_EVENTS.FEEDBACK_PROMPT_SHOWN, payload);
};

// ============================================
// Bumicert Creation Flow Events
// ============================================

export const trackBumicertFlowStarted = (
  payload: BumicertFlowStartedPayload
): void => {
  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.FLOW_STARTED);
  tagRecording(["bumicert-creation", "flow-started"]);

  // Store flow start time in sessionStorage for duration calculation
  if (typeof window !== "undefined") {
    sessionStorage.setItem("bumicert_flow_start_time", Date.now().toString());
    if (payload.draftId) {
      sessionStorage.setItem("bumicert_flow_draft_id", payload.draftId);
    }
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackFlowStarted(payload.draftId ?? "0");
};

export const trackStepViewed = (payload: StepViewedPayload): void => {
  const stepName = BUMICERT_STEP_NAMES[payload.stepIndex] ?? payload.stepName;

  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.STEP_VIEWED);
  trackEvent(`step_${payload.stepIndex + 1}_${stepName}_viewed`);
  tagRecording(["bumicert-creation", `step-${payload.stepIndex + 1}`]);

  // Store step start time for duration calculation
  if (typeof window !== "undefined") {
    sessionStorage.setItem("bumicert_step_start_time", Date.now().toString());
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackStepViewed(
    payload.stepIndex,
    stepName,
    payload.draftId ?? "0"
  );
};

export const trackStepCompleted = (payload: StepCompletedPayload): void => {
  const stepName = BUMICERT_STEP_NAMES[payload.stepIndex] ?? payload.stepName;

  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.STEP_COMPLETED);
  trackEvent(`step_${payload.stepIndex + 1}_${stepName}_completed`);

  // Calculate time spent on step
  let timeSpentSeconds = 0;
  if (typeof window !== "undefined") {
    const stepStartTime = sessionStorage.getItem("bumicert_step_start_time");
    if (stepStartTime) {
      timeSpentSeconds = Math.round(
        (Date.now() - parseInt(stepStartTime, 10)) / 1000
      );
      identifyUser(null, {
        [`step_${payload.stepIndex + 1}_time_seconds`]: timeSpentSeconds,
      });
    }
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackStepCompleted(
    payload.stepIndex,
    stepName,
    timeSpentSeconds
  );
};

export const trackBumicertPublished = (
  payload: BumicertPublishedPayload
): void => {
  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.BUMICERT_PUBLISHED);
  tagRecording(["bumicert-creation", "completed"]);

  // Calculate total duration if not provided
  let totalDuration = payload.totalDurationSeconds;
  if (typeof window !== "undefined" && !totalDuration) {
    const flowStartTime = sessionStorage.getItem("bumicert_flow_start_time");
    if (flowStartTime) {
      totalDuration = Math.round(
        (Date.now() - parseInt(flowStartTime, 10)) / 1000
      );
    }
  }

  identifyUser(null, {
    bumicertCreated: true,
    completionTimeSeconds: totalDuration ?? 0,
    lastCompletedAt: new Date().toISOString(),
  });

  // Clean up session storage
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("bumicert_flow_start_time");
    sessionStorage.removeItem("bumicert_step_start_time");
    sessionStorage.removeItem("bumicert_flow_draft_id");
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackBumicertPublished(
    payload.draftId ?? "0",
    totalDuration ?? 0
  );
};

export const trackFlowAbandoned = (payload: FlowAbandonedPayload): void => {
  const stepName = BUMICERT_STEP_NAMES[payload.stepIndex] ?? payload.stepName;

  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.FLOW_ABANDONED);
  trackEvent(`flow_abandoned_at_step_${payload.stepIndex + 1}_${stepName}`);
  tagRecording(["bumicert-creation", "abandoned"]);

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackFlowAbandoned(
    payload.stepIndex,
    payload.timeSpentSeconds ?? 0
  );
};

// ============================================
// Draft Events
// ============================================

export type DraftSavedPayload = {
  draftId: number;
  stepIndex: number;
  isUpdate: boolean;
};

export const trackDraftSaved = (payload: DraftSavedPayload): void => {
  // Hotjar tracking
  trackEvent("draft_saved");
  tagRecording(["bumicert-creation", "draft-saved"]);

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackDraftSaved(
    payload.draftId,
    payload.stepIndex,
    payload.isUpdate
  );
};

// ============================================
// Error Events
// ============================================

export const trackError = (payload: ErrorPayload): void => {
  trackEvent(ERROR_EVENTS.ERROR_ENCOUNTERED);
  identifyUser(null, {
    lastError: payload.message,
    lastErrorPath: payload.path ?? "",
  });
};

// ============================================
// Helper to get step name from index
// ============================================

export const getStepName = (stepIndex: number): BumicertStepName => {
  return BUMICERT_STEP_NAMES[stepIndex] ?? "cover_details";
};

// ============================================
// Get flow duration from session
// ============================================

export const getFlowDurationSeconds = (): number | null => {
  if (typeof window === "undefined") return null;

  const flowStartTime = sessionStorage.getItem("bumicert_flow_start_time");
  if (!flowStartTime) return null;

  return Math.round((Date.now() - parseInt(flowStartTime, 10)) / 1000);
};
