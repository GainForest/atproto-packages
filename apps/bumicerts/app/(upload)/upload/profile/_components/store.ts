"use client";

import { create } from "zustand";
import type { CertifiedProfileData } from "@/lib/types";

// ─── Editable field shape ────────────────────────────────────────────────────

/**
 * Fields that can be modified in edit mode.
 * `null` means "unchanged from the server value".
 */
type EditableFields = {
  displayName: string | null;
  description: string | null;
  pronouns: string | null;
  website: string | null;
  /** New avatar image file to upload (null = no change) */
  avatar: File | null;
  /** New banner image file to upload (null = no change) */
  banner: File | null;
};

// ─── Store state ─────────────────────────────────────────────────────────────

type ProfileEditState = {
  /** Current server-fetched + merged data — null before first load. */
  serverData: CertifiedProfileData | null;
  /** Whether a save mutation is in flight. */
  isSaving: boolean;
  /** Error message from the last save attempt (null = no error). */
  saveError: string | null;
  /** Buffered edits. */
  edits: EditableFields;
};

// ─── Store actions ────────────────────────────────────────────────────────────

type ProfileEditActions = {
  /** Called once initial data is fetched by the client component. */
  setServerData: (data: CertifiedProfileData) => void;
  /** Discard buffered edits (called on cancel). */
  cancelEditing: () => void;
  /** Update a single editable field. */
  setEdit: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  /** True when at least one field has been modified. */
  hasChanges: () => boolean;
  /** Mark save as in-flight. */
  setSaving: (saving: boolean) => void;
  /** Record a save error (null to clear). */
  setSaveError: (error: string | null) => void;
  /**
   * Called on successful save — reset edits and isSaving flag.
   */
  onSaveSuccess: () => void;
};

// ─── Initial edits ────────────────────────────────────────────────────────────

const EMPTY_EDITS: EditableFields = {
  displayName: null,
  description: null,
  pronouns: null,
  website: null,
  avatar: null,
  banner: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProfileEditStore = create<
  ProfileEditState & ProfileEditActions
>((set, get) => ({
  // State
  serverData: null,
  isSaving: false,
  saveError: null,
  edits: { ...EMPTY_EDITS },

  // Actions
  setServerData: (data) => set({ serverData: data }),

  cancelEditing: () =>
    set({ edits: { ...EMPTY_EDITS }, saveError: null }),

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

  onSaveSuccess: () =>
    set({
      isSaving: false,
      saveError: null,
      edits: { ...EMPTY_EDITS },
    }),
}));

export type { EditableFields };
