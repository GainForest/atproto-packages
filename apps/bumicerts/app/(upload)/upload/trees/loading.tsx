"use client";

import { TreeUploadSkeleton } from "./_components/TreeUploadSkeleton";
import { TreesManageSkeleton } from "./_components/TreesManageSkeleton";
import { useTreesMode } from "./_hooks/useTreesMode";

export default function TreesLoading() {
  const [mode] = useTreesMode();

  return mode === "upload" ? (
    <TreeUploadSkeleton />
  ) : (
    <TreesManageSkeleton />
  );
}
