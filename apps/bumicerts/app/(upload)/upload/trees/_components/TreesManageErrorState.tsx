"use client";

import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";

type TreesManageErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function TreesManageErrorState({
  error,
  reset,
}: TreesManageErrorStateProps) {
  return (
    <Container className="pt-4">
      <ErrorPage
        title="Couldn't load tree manager"
        description="We had trouble fetching your uploaded tree records. Please try again."
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
