"use client";

import { TreesManageErrorState } from "./_components/TreesManageErrorState";

export default function TreesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TreesManageErrorState error={error} reset={reset} />;
}
