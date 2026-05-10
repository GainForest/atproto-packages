"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  MANAGE_MODE_VALUES,
  type ManageMode,
} from "../_components/uploadDashboardMode";

const modeParser = parseAsStringLiteral(MANAGE_MODE_VALUES);

/**
 * Reads and writes the `?mode=` query param for the /upload page.
 *
 * - `mode === "edit"`         → edit mode active
 * - `mode === "onboard-user"` → user onboarding active
 * - `mode === "onboard-org"`  → organization onboarding active
 * - `mode === null`            → view mode or onboarding chooser
 *
 * Using nuqs makes the URL the single source of truth:
 * - The Edit button sets mode → "edit" (shallow push)
 * - Onboarding choices can deep-link directly into their respective setup flow
 * - Cancel/back sets mode → null  (removes the param, stays on /upload)
 */
export function useManageMode(): [
  ManageMode | null,
  (mode: ManageMode | null) => void,
] {
  const [mode, setMode] = useQueryState(
    "mode",
    modeParser.withOptions({ shallow: true, history: "push" }),
  );

  const setModeCasted = (value: ManageMode | null) => {
    void setMode(value);
  };

  return [mode, setModeCasted];
}
