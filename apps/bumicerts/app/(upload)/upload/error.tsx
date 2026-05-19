"use client";

import { useTranslations } from "next-intl";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";

export default function UploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("upload.errors");

  return (
    <Container className="pt-4">
      <ErrorPage
        title={t("uploadTitle")}
        description={t("uploadDescription")}
        error={error}
        showRefreshButton
        showHomeButton={false}
        cta={
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-muted/60 transition-colors cursor-pointer"
          >
            {t("tryAgain")}
          </button>
        }
      />
    </Container>
  );
}
