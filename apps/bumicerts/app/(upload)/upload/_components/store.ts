"use client";

import { create } from "zustand";
import type { OrganizationData } from "@/lib/types";

// ─── Editable field shape ────────────────────────────────────────────────────

/**
 * Fields that can be modified on the dashboard.
 * `null` means "unchanged from the server value".
 */
type EditableFields = {
  displayName: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  /** New cover image file to upload (null = no change) */
  coverImage: File | null;
  /** New logo file to upload (null = no change) */
  logo: File | null;
  country: string | null;
  website: string | null;
  startDate: string | null;
  visibility: "Public" | "Unlisted" | null;
};

// ─── Store state ─────────────────────────────────────────────────────────────

type UploadDashboardState = {
  /** Current server-fetched data — null before first load. */
  serverData: OrganizationData | null;
  /** Whether edit mode is active (pending save). */
  isEditing: boolean;
  /** Whether a save mutation is in flight. */
  isSaving: boolean;
  /** Error message from the last save attempt (null = no error). */
  saveError: string | null;
  /** Buffered edits. */
  edits: EditableFields;
};

// ─── Store actions ────────────────────────────────────────────────────────────

type UploadDashboardActions = {
  /** Called once initial data is fetched by the client component. */
  setServerData: (data: OrganizationData) => void;
  /** Enter edit mode. */
  startEditing: () => void;
  /** Discard buffered edits and exit edit mode. */
  cancelEditing: () => void;
  /** Update a single editable field. */
  setEdit: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  /** True when at least one field has been modified. */
  hasChanges: () => boolean;
  /** Mark save as in-flight. */
  setSaving: (saving: boolean) => void;
  /** Record a save error (null to clear). */
  setSaveError: (error: string | null) => void;
  /** Called on successful save — update server data, exit edit mode. */
  onSaveSuccess: (updated: OrganizationData) => void;
};

// ─── Initial edits ────────────────────────────────────────────────────────────

const EMPTY_EDITS: EditableFields = {
  displayName: null,
  shortDescription: null,
  longDescription: null,
  coverImage: null,
  logo: null,
  country: null,
  website: null,
  startDate: null,
  visibility: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useUploadDashboardStore = create<
  UploadDashboardState & UploadDashboardActions
>((set, get) => ({
  // State
  serverData: null,
  isEditing: false,
  isSaving: false,
  saveError: null,
  edits: { ...EMPTY_EDITS },

  // Actions
  setServerData: (data) => set({ serverData: data }),

  startEditing: () => set({ isEditing: true, saveError: null }),

  cancelEditing: () =>
    set({ isEditing: false, edits: { ...EMPTY_EDITS }, saveError: null }),

  setEdit: (key, value) =>
    set((state) => ({ edits: { ...state.edits, [key]: value } })),

  hasChanges: () => {
    const { edits } = get();
    return (Object.keys(edits) as (keyof EditableFields)[]).some(
      (k) => edits[k] !== null
    );
  },

  setSaving: (saving) => set({ isSaving: saving }),

  setSaveError: (error) => set({ saveError: error }),

  onSaveSuccess: (updated) =>
    set({
      serverData: updated,
      isEditing: false,
      isSaving: false,
      saveError: null,
      edits: { ...EMPTY_EDITS },
    }),
}));
