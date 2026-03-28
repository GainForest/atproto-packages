"use client";

import { create } from "zustand";
import type { CertifiedProfileData } from "@/lib/types";

// ─── Editable field shape ────────────────────────────────────────────────────

/**
 * Sentinel value for "field was explicitly cleared by the user".
 * Distinct from `null` (unchanged) and `""` (empty string).
 */
export const FIELD_CLEARED = Symbol.for("field-cleared");
export type FieldCleared = typeof FIELD_CLEARED;

/**
 * Fields that can be modified in edit mode.
 * `null` means "unchanged from the server value".
 * `FIELD_CLEARED` means "user explicitly cleared this field".
 */
type EditableFields = {
  displayName: string | null;
  description: string | null;
  pronouns: string | FieldCleared | null;
  website: string | FieldCleared | null;
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
  /** Mark save as in-flight. */
  setSaving: (saving: boolean) => void;
  /** Record a save error (null to clear). */
  setSaveError: (error: string | null) => void;
  /**
   * Called on successful save — reset edits and isSaving flag.
   */
  onSaveSuccess: () => void;
};

/**
 * Derived state: true when at least one field has been modified.
 * Computed from edits so that selectors re-render when edits change.
 */
function computeHasChanges(edits: EditableFields): boolean {
  return (Object.keys(edits) as (keyof EditableFields)[]).some(
    (k) => edits[k] !== null
  );
}

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
>((set) => ({
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

  setSaving: (saving) => set({ isSaving: saving }),

  setSaveError: (error) => set({ saveError: error }),

  onSaveSuccess: () =>
    set({
      isSaving: false,
      saveError: null,
      edits: { ...EMPTY_EDITS },
    }),
}));

/**
 * Selector for derived hasChanges state.
 * Unlike a method, this triggers re-renders when edits change.
 */
export function useHasChanges(): boolean {
  return useProfileEditStore((s) => computeHasChanges(s.edits));
}

export type { EditableFields };
