"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

type TimelineViewerState = {
  isOwner: boolean;
  selectedPreviewTileByEntryId: Record<string, string>;
  activeMapLayerByDatasetUri: Record<string, true>;
};

type TimelineViewerActions = {
  setSelectedPreviewTile: (entryId: string, tileId: string) => void;
  setMapLayerActive: (datasetUri: string, active: boolean) => void;
};

type TimelineViewerStore = TimelineViewerState & TimelineViewerActions;

type TimelineViewerStoreApi = StoreApi<TimelineViewerStore>;

function createTimelineViewerStore(init: { isOwner: boolean }): TimelineViewerStoreApi {
  return createStore<TimelineViewerStore>((set) => ({
    isOwner: init.isOwner,
    selectedPreviewTileByEntryId: {},
    activeMapLayerByDatasetUri: {},
    setSelectedPreviewTile: (entryId, tileId) =>
      set((state) => ({
        selectedPreviewTileByEntryId: {
          ...state.selectedPreviewTileByEntryId,
          [entryId]: tileId,
        },
      })),
    setMapLayerActive: (datasetUri, active) =>
      set((state) => {
        const next = { ...state.activeMapLayerByDatasetUri };
        if (active) {
          next[datasetUri] = true;
        } else {
          delete next[datasetUri];
        }

        return { activeMapLayerByDatasetUri: next };
      }),
  }));
}

const TimelineViewerStoreContext = createContext<TimelineViewerStoreApi | null>(
  null,
);

export function TimelineViewerStoreProvider({
  isOwner,
  children,
}: {
  isOwner: boolean;
  children: ReactNode;
}) {
  const [store] = useState(() => createTimelineViewerStore({ isOwner }));

  return (
    <TimelineViewerStoreContext.Provider value={store}>
      {children}
    </TimelineViewerStoreContext.Provider>
  );
}

export function useTimelineViewerStore<T>(
  selector: (state: TimelineViewerStore) => T,
): T {
  const store = useContext(TimelineViewerStoreContext);

  if (!store) {
    throw new Error(
      "useTimelineViewerStore must be used within TimelineViewerStoreProvider",
    );
  }

  return useStore(store, selector);
}
