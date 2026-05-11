"use client";

import { parseAsString, useQueryState } from "nuqs";

export const TREE_ITEMS_PER_PAGE = 10;

export function getTreePageFromQuery(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getBoundedPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages);
}

export function toNullableQueryValue(value: string): string | null {
  return value.length > 0 ? value : null;
}

export function useTreesManageUrlState() {
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [treePageQuery, setTreePageQuery] = useQueryState(
    "tree-page",
    parseAsString,
  );
  const [datasetSearchQuery, setDatasetSearchQuery] = useQueryState(
    "dataset-q",
    parseAsString.withDefault(""),
  );
  const [selectedTreeRkey, setSelectedTreeRkey] = useQueryState(
    "tree",
    parseAsString.withDefault(""),
  );
  const [managerView, setManagerView] = useQueryState("view", parseAsString);
  const [datasetFilter, setDatasetFilter] = useQueryState(
    "dataset",
    parseAsString,
  );

  return {
    searchQuery,
    setSearchQuery,
    treePageQuery,
    setTreePageQuery,
    datasetSearchQuery,
    setDatasetSearchQuery,
    selectedTreeRkey,
    setSelectedTreeRkey,
    managerView,
    setManagerView,
    datasetFilter,
    setDatasetFilter,
  };
}
