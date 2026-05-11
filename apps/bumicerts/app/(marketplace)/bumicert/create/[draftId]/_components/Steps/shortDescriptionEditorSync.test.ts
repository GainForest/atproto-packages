import { describe, expect, test } from "bun:test";
import {
  createShortDescriptionEditorSyncState,
  getShortDescriptionEditorKey,
  reconcileShortDescriptionEditorSyncState,
  trackShortDescriptionEditorChange,
} from "./shortDescriptionEditorSync";

describe("shortDescriptionEditorSync", () => {
  test("keeps the editor mounted while local typing updates the store", () => {
    const initialValue = { text: "initial", facets: [] };
    const initialState = createShortDescriptionEditorSyncState(initialValue);
    const typingState = trackShortDescriptionEditorChange(initialState, {
      text: "initial plus more",
      facets: [],
    });

    const reconciledState = reconcileShortDescriptionEditorSyncState(
      typingState,
      {
        text: "initial plus more",
        facets: [],
      },
    );

    expect(getShortDescriptionEditorKey(reconciledState)).toBe(
      "short-description-editor-0",
    );
  });

  test("bumps the editor key when an external hydrate changes the value", () => {
    const initialState = createShortDescriptionEditorSyncState({
      text: "",
      facets: [],
    });

    const hydratedState = reconcileShortDescriptionEditorSyncState(
      initialState,
      {
        text: "restored from local storage",
        facets: [],
      },
    );

    expect(getShortDescriptionEditorKey(hydratedState)).toBe(
      "short-description-editor-1",
    );
  });
});
