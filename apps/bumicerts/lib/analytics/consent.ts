import { links } from "@/lib/links";

export const ANALYTICS_CONSENT_STORAGE_KEY =
  "bumicerts_contentsquare_consent";

export const ANALYTICS_CONSENT_CHANGED_EVENT =
  "bumicerts:analytics-consent-changed";

export type AnalyticsConsent = "granted" | "denied";

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    getAnalyticsConsent() === "granted" &&
    window.location.pathname.startsWith(links.manage.trees)
  );
}

export function setAnalyticsConsent(value: AnalyticsConsent): void {
  if (typeof window === "undefined") {
    return;
  }

  if (value === "denied") {
    try {
      window.localStorage.removeItem("bumicert_analytics_session");
      window.localStorage.removeItem("bumicert_analytics_last_activity");
    } catch {
      // Storage cleanup is best-effort only.
    }
  }

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  } catch {
    // If localStorage is unavailable, still notify the in-memory UI state.
  }

  window.dispatchEvent(
    new CustomEvent<AnalyticsConsent>(ANALYTICS_CONSENT_CHANGED_EVENT, {
      detail: value,
    }),
  );
}
