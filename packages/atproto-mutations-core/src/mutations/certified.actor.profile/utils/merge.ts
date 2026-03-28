import { applyPatch as genericApplyPatch } from "../../../utils/shared/patch";

/** No fields are strictly required — all fields in the profile are optional except createdAt (handled separately). */
const REQUIRED_FIELDS: ReadonlySet<string> = new Set([]);

export const applyPatch = <T extends object>(
  existing: T,
  data: Partial<T>,
  unset?: readonly string[]
): T => genericApplyPatch(existing, data, unset, REQUIRED_FIELDS);
