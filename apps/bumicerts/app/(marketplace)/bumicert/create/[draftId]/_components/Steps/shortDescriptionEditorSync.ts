import type { app } from "@gainforest/generated";

export type ShortDescriptionEditorValue = {
  text: string;
  facets?: app.bsky.richtext.facet.Main[];
};

export type ShortDescriptionEditorSyncState = {
  lastSyncedExternalSignature: string;
  lastEditorSignature: string;
  remountVersion: number;
};

export function getShortDescriptionEditorSignature(
  value: ShortDescriptionEditorValue,
): string {
  return JSON.stringify({
    text: value.text,
    facets: value.facets ?? [],
  });
}

export function createShortDescriptionEditorSyncState(
  initialValue: ShortDescriptionEditorValue,
): ShortDescriptionEditorSyncState {
  const initialSignature = getShortDescriptionEditorSignature(initialValue);

  return {
    lastSyncedExternalSignature: initialSignature,
    lastEditorSignature: initialSignature,
    remountVersion: 0,
  };
}

export function reconcileShortDescriptionEditorSyncState(
  state: ShortDescriptionEditorSyncState,
  externalValue: ShortDescriptionEditorValue,
): ShortDescriptionEditorSyncState {
  const externalSignature = getShortDescriptionEditorSignature(externalValue);

  if (externalSignature === state.lastSyncedExternalSignature) {
    return state;
  }

  return {
    ...state,
    lastSyncedExternalSignature: externalSignature,
    remountVersion:
      externalSignature === state.lastEditorSignature
        ? state.remountVersion
        : state.remountVersion + 1,
  };
}

export function trackShortDescriptionEditorChange(
  state: ShortDescriptionEditorSyncState,
  nextValue: ShortDescriptionEditorValue,
): ShortDescriptionEditorSyncState {
  return {
    ...state,
    lastEditorSignature: getShortDescriptionEditorSignature(nextValue),
  };
}

export function getShortDescriptionEditorKey(
  state: ShortDescriptionEditorSyncState,
): string {
  return `short-description-editor-${state.remountVersion}`;
}
