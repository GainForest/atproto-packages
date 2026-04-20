"use client";

import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";

export default function TreesUploadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="pt-4">
      <ErrorPage
        title="Couldn't load tree upload"
        description="We had trouble opening the tree upload flow. Please try again."
        error={error}
        showRefreshButton={false}
        showHomeButton={false}
        cta={
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border text-sm font-medium hover:bg-muted/60 transition-colors cursor-pointer"
          >
            Try again
          </button>
        }
      />
    </Container>
  );
}
