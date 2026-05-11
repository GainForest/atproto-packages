"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackPageViewed } from "@/lib/analytics/hotjar";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics/consent";
import { isTreeUploadAnalyticsPath } from "@/lib/analytics/tree-upload";
import { clientEnv } from "@/lib/env/client";

type ContentsquareProviderProps = {
  children: React.ReactNode;
};

function getTrackedPath(pathname: string): string {
  const hash =
    typeof window === "undefined"
      ? ""
      : window.location.hash.replace("#", "?__");

  return `${pathname}${hash}`;
}

function pushContentsquarePrivacyCommand(command: "optin" | "optout"): void {
  if (typeof window === "undefined") {
    return;
  }

  window._uxa = window._uxa ?? [];
  window._uxa.push([command]);
}

function optInContentsquare(): void {
  pushContentsquarePrivacyCommand("optin");
}

function optOutContentsquare(): void {
  pushContentsquarePrivacyCommand("optout");
}

function isContentsquareLoaded(): boolean {
  return typeof window !== "undefined" && window.CS_CONF !== undefined;
}

function ContentsquareRouteTracker({
  consent,
  isTreeUploadSurface,
}: {
  consent: AnalyticsConsent | null;
  isTreeUploadSurface: boolean;
}) {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== "granted" || !pathname || !isTreeUploadSurface) {
      return;
    }

    const path = getTrackedPath(pathname);

    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = path;
      if (isContentsquareLoaded()) {
        trackPageViewed({ path });
      }
      return;
    }

    if (lastTrackedPathRef.current === path) {
      return;
    }

    lastTrackedPathRef.current = path;
    trackPageViewed({ path });
  }, [consent, isTreeUploadSurface, pathname]);

  return null;
}

function ContentsquareConsentCard({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      className="fixed right-4 bottom-4 left-4 z-40 sm:left-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-md"
      role="region"
      aria-labelledby="contentsquare-consent-title"
      aria-describedby="contentsquare-consent-description"
    >
      <div className="rounded-3xl border border-border bg-background/95 p-5 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p
              id="contentsquare-consent-title"
              className="text-sm font-medium text-foreground"
            >
              Help us improve tree data onboarding
            </p>
            <p
              id="contentsquare-consent-description"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              With your consent, Bumicerts uses Contentsquare during this beta
              to record your session and collect interaction analytics,
              especially around tree data onboarding. This helps us review where
              testers get stuck and turn feedback into fixes. You can decline
              and continue using the upload flow.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={onDecline}>
              Decline recording
            </Button>
            <Button onClick={onAccept}>Accept recording</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentsquareProvider({ children }: ContentsquareProviderProps) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | null>(() =>
    getAnalyticsConsent(),
  );

  const tagId = clientEnv.NEXT_PUBLIC_CONTENTSQUARE_TAG_ID;
  const scriptSrc = useMemo(
    () => (tagId ? `https://t.contentsquare.net/uxa/${tagId}.js` : null),
    [tagId],
  );
  const isTreeUploadSurface = pathname
    ? isTreeUploadAnalyticsPath(pathname)
    : false;
  const shouldShowConsentCard =
    scriptSrc !== null && consent === null && isTreeUploadSurface;

  useEffect(() => {
    const handleConsentChange = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        (event.detail === "granted" || event.detail === "denied")
      ) {
        setConsent(event.detail);
        return;
      }

      setConsent(getAnalyticsConsent());
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(
        ANALYTICS_CONSENT_CHANGED_EVENT,
        handleConsentChange,
      );
    };
  }, []);

  const handleAccept = () => {
    setAnalyticsConsent("granted");
    setConsent("granted");
  };

  const handleDecline = () => {
    setAnalyticsConsent("denied");
    setConsent("denied");
    optOutContentsquare();
  };

  useEffect(() => {
    if (consent !== "granted" || scriptSrc === null) {
      return;
    }

    if (!isTreeUploadSurface) {
      optOutContentsquare();
      return;
    }

    optInContentsquare();

    return () => {
      optOutContentsquare();
    };
  }, [consent, isTreeUploadSurface, scriptSrc]);

  return (
    <>
      {consent === "granted" && scriptSrc && isTreeUploadSurface ? (
        <Script id="contentsquare-main-tag" strategy="afterInteractive">
          {`
            (function () {
              window._uxa = window._uxa || [];
              if (typeof CS_CONF === "undefined") {
                window._uxa.push(["setPath", window.location.pathname + window.location.hash.replace("#", "?__")]);
                var mt = document.createElement("script");
                mt.type = "text/javascript";
                mt.async = true;
                mt.src = ${JSON.stringify(scriptSrc)};
                document.getElementsByTagName("head")[0].appendChild(mt);
              } else {
                window._uxa.push(["trackPageview", window.location.pathname + window.location.hash.replace("#", "?__")]);
              }
            })();
          `}
        </Script>
      ) : null}

      <Suspense fallback={null}>
        <ContentsquareRouteTracker
          consent={consent}
          isTreeUploadSurface={isTreeUploadSurface}
        />
      </Suspense>

      {children}

      {shouldShowConsentCard ? (
        <ContentsquareConsentCard
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      ) : null}
    </>
  );
}
